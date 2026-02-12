"""
Al-Ghazaly Auto Parts API - Modular Backend v4.2
Entry Point for FastAPI Application - Security Hardened

This is a fully modularized backend replacing the monolithic server.py.
Structure:
- /app/core/      - Configuration, database, security
- /app/models/    - Pydantic schemas
- /app/services/  - Business logic (WebSocket, notifications)
- /app/api/v1/    - API endpoints organized by domain
"""
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from .core.database import connect_to_mongo, close_mongo_connection, create_database_indexes, seed_database, db
from .core.config import APP_VERSION, settings
from .api.v1 import api_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events"""
    # Startup
    logger.info(f"Starting Al-Ghazaly Auto Parts API v{APP_VERSION} - Security Hardened")
    database = await connect_to_mongo()
    await create_database_indexes()
    
    # Seed initial data if needed
    existing_brands = await database.car_brands.count_documents({})
    if existing_brands == 0:
        logger.info("Seeding database...")
        await seed_database()
        logger.info("Database seeded successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Al-Ghazaly Auto Parts API")
    await close_mongo_connection()

# Create FastAPI application
app = FastAPI(
    title="Al-Ghazaly Auto Parts API",
    description="Professional Auto Parts Store Backend - Security Hardened",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS middleware - Properly configured
cors_origins = settings.CORS_ORIGINS
if cors_origins == "*":
    # Development mode: allow all origins but WITHOUT credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Production mode: specific origins with credentials
    origins_list = [o.strip() for o in cors_origins.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Global exception handler to prevent information leakage
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response

# Include API router
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Al-Ghazaly Auto Parts API",
        "version": APP_VERSION,
        "architecture": "modular",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
