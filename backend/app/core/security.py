"""
Security and Authentication Helpers
Enhanced with rate limiting, input sanitization, and role-based access control
"""
import re
import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException
from datetime import datetime, timezone
from .config import PRIMARY_OWNER_EMAIL
from .database import get_database

logger = logging.getLogger(__name__)

def get_db():
    return get_database()

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    doc = dict(doc)
    if '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

def sanitize_regex_input(user_input: str) -> str:
    """Escape special regex characters to prevent ReDoS attacks"""
    return re.escape(user_input)

def validate_string_length(value: str, field_name: str, max_length: int = 5000):
    """Validate string input length to prevent abuse"""
    if value and len(value) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} exceeds maximum length of {max_length} characters"
        )

# Rate limiting storage (in-memory, per-process)
_rate_limit_store = defaultdict(list)
_RATE_LIMIT_WINDOW = 60  # seconds
_RATE_LIMIT_MAX_REQUESTS = 60  # max requests per window

def check_rate_limit(client_ip: str, endpoint: str = "general", max_requests: int = None):
    """Simple in-memory rate limiter"""
    max_req = max_requests or _RATE_LIMIT_MAX_REQUESTS
    key = f"{client_ip}:{endpoint}"
    now = time.time()
    
    # Clean old entries
    _rate_limit_store[key] = [
        t for t in _rate_limit_store[key] 
        if now - t < _RATE_LIMIT_WINDOW
    ]
    
    if len(_rate_limit_store[key]) >= max_req:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )
    
    _rate_limit_store[key].append(now)

async def get_session_token(request: Request):
    """Extract session token from cookie or Authorization header"""
    token = request.cookies.get("session_token")
    if token:
        return token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

async def get_current_user(request: Request):
    """Get current authenticated user from session"""
    db = get_db()
    token = await get_session_token(request)
    if not token:
        return None
    session = await db.sessions.find_one({"session_token": token})
    if not session:
        return None
    # Handle both timezone-aware and naive datetimes
    if session.get("expires_at"):
        expires_at = session["expires_at"]
        now = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            # Clean up expired session
            await db.sessions.delete_one({"_id": session["_id"]})
            return None
    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        return None
    # Check if user is soft-deleted
    if user.get("deleted_at"):
        return None
    return serialize_doc(user) if user else None

async def get_user_role(user):
    """Determine user role: owner, partner, admin, subscriber, or user"""
    db = get_db()
    if not user:
        return "guest"
    
    email = user.get("email", "")
    
    # Check if primary owner
    if email == PRIMARY_OWNER_EMAIL:
        return "owner"
    
    # Check if partner
    partner = await db.partners.find_one({"email": email, "deleted_at": None})
    if partner:
        return "partner"
    
    # Check if admin
    admin = await db.admins.find_one({"email": email, "deleted_at": None})
    if admin:
        return "admin"
    
    # Check if subscriber
    subscriber = await db.subscribers.find_one({"email": email, "deleted_at": None})
    if subscriber:
        return "subscriber"
    
    return "user"

async def require_auth(request: Request):
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin_role(request: Request, allowed_roles=None):
    """Require specific admin roles - raises 401/403 if not authorized"""
    if allowed_roles is None:
        allowed_roles = ["owner", "partner", "admin"]
    user = await require_auth(request)
    role = await get_user_role(user)
    if role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access denied")
    return user, role

async def invalidate_user_sessions(user_id: str):
    """Invalidate all sessions for a user (used when role changes or user is deleted)"""
    db = get_db()
    result = await db.sessions.delete_many({"user_id": user_id})
    logger.info(f"Invalidated {result.deleted_count} sessions for user {user_id}")
    return result.deleted_count
