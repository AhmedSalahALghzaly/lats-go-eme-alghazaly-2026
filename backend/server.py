from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== Models ====================

# Auth Models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# Car Brand Models
class CarBrand(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: str
    logo: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CarBrandCreate(BaseModel):
    name: str
    name_ar: str
    logo: Optional[str] = None

# Car Model Models
class CarModelVariant(BaseModel):
    name: str
    name_ar: str
    engine: str
    engine_ar: str
    transmission: str
    transmission_ar: str
    fuel_type: str
    fuel_type_ar: str

class CarModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    name: str
    name_ar: str
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    variants: List[CarModelVariant] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CarModelCreate(BaseModel):
    brand_id: str
    name: str
    name_ar: str
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    variants: List[CarModelVariant] = []

# Product Brand Models
class ProductBrand(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    logo: Optional[str] = None
    country_of_origin: Optional[str] = None
    country_of_origin_ar: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductBrandCreate(BaseModel):
    name: str
    name_ar: Optional[str] = None
    logo: Optional[str] = None
    country_of_origin: Optional[str] = None
    country_of_origin_ar: Optional[str] = None

# Category Models
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: str
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    name_ar: str
    parent_id: Optional[str] = None
    icon: Optional[str] = None

class CategoryWithChildren(Category):
    children: List['CategoryWithChildren'] = []

# Product Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: str
    description: Optional[str] = None
    description_ar: Optional[str] = None
    price: float
    sku: str
    product_brand_id: str
    category_id: str
    image_url: Optional[str] = None
    images: List[str] = []  # Multiple product images (base64 or URLs)
    car_model_ids: List[str] = []
    stock_quantity: int = 0
    hidden_status: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    name_ar: str
    description: Optional[str] = None
    description_ar: Optional[str] = None
    price: float
    sku: str
    product_brand_id: str
    category_id: str
    image_url: Optional[str] = None
    images: List[str] = []
    car_model_ids: List[str] = []
    stock_quantity: int = 0
    hidden_status: bool = False

class ProductPriceUpdate(BaseModel):
    price: float

class ProductHiddenUpdate(BaseModel):
    hidden_status: bool

class ProductWithDetails(Product):
    product_brand: Optional[ProductBrand] = None
    category: Optional[Category] = None
    car_models: List[CarModel] = []

# Cart Models
class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    user_id: str
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    product_name_ar: Optional[str] = None
    quantity: int
    price: float
    image_url: Optional[str] = None

class DeliveryAddress(BaseModel):
    street_address: str
    city: str
    state: str
    country: str = "Egypt"
    delivery_instructions: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:4].upper()}")
    user_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    items: List[OrderItem]
    subtotal: float
    shipping_cost: float = 150.0  # Fixed 150 EGP
    discount: float = 0.0  # Discount amount in EGP
    total: float
    status: str = "pending"  # pending, complete, processing, shipped, delivered, cancelled
    delivery_address: Optional[DeliveryAddress] = None
    phone: Optional[str] = None
    payment_method: str = "cash_on_delivery"
    notes: Optional[str] = None
    is_viewed: bool = False  # For admin to track if order has been viewed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    street_address: str
    city: str
    state: str
    country: str = "Egypt"
    delivery_instructions: Optional[str] = None
    payment_method: str = "cash_on_delivery"
    notes: Optional[str] = None

# Comment Models
class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    text: str
    rating: Optional[int] = None  # 1-5 stars
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    text: str
    rating: Optional[int] = None  # 1-5 stars

class CommentResponse(BaseModel):
    id: str
    product_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    text: str
    rating: Optional[int] = None
    created_at: datetime
    is_owner: bool = False

# Favorite Models
class Favorite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FavoriteAdd(BaseModel):
    product_id: str

# ==================== Auth Helpers ====================

async def get_session_token(request: Request) -> Optional[str]:
    # Check cookie first
    token = request.cookies.get("session_token")
    if token:
        return token
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

async def get_current_user(request: Request) -> Optional[User]:
    token = await get_session_token(request)
    if not token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry with timezone awareness
    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ==================== Auth Routes ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth API error: {e}")
            raise HTTPException(status_code=500, detail="Authentication service error")
    
    session_data = SessionDataResponse(**user_data)
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": session_data.email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = session_data.session_token
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    token = await get_session_token(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== Car Brand Routes ====================

@api_router.get("/car-brands", response_model=List[CarBrand])
async def get_car_brands():
    brands = await db.car_brands.find({}, {"_id": 0}).to_list(100)
    return [CarBrand(**brand) for brand in brands]

@api_router.post("/car-brands", response_model=CarBrand)
async def create_car_brand(brand: CarBrandCreate):
    brand_obj = CarBrand(**brand.dict())
    await db.car_brands.insert_one(brand_obj.dict())
    return brand_obj

@api_router.delete("/car-brands/{brand_id}")
async def delete_car_brand(brand_id: str):
    result = await db.car_brands.delete_one({"id": brand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    return {"message": "Deleted successfully"}

# ==================== Car Model Routes ====================

@api_router.get("/car-models", response_model=List[CarModel])
async def get_car_models(brand_id: Optional[str] = None):
    query = {"brand_id": brand_id} if brand_id else {}
    models = await db.car_models.find(query, {"_id": 0}).to_list(500)
    return [CarModel(**model) for model in models]

@api_router.post("/car-models", response_model=CarModel)
async def create_car_model(model: CarModelCreate):
    model_obj = CarModel(**model.dict())
    await db.car_models.insert_one(model_obj.dict())
    return model_obj

@api_router.get("/car-models/{model_id}")
async def get_car_model_details(model_id: str):
    """Get car model details with compatible products"""
    model = await db.car_models.find_one({"id": model_id}, {"_id": 0})
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Get the brand
    brand = await db.car_brands.find_one({"id": model.get("brand_id")}, {"_id": 0})
    
    # Get compatible products
    products = await db.products.find(
        {"car_model_ids": model_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enhance products with brand and category info
    enhanced_products = []
    for product in products:
        product_brand = await db.product_brands.find_one({"id": product.get("product_brand_id")}, {"_id": 0})
        category = await db.categories.find_one({"id": product.get("category_id")}, {"_id": 0})
        enhanced_products.append({
            **product,
            "product_brand": product_brand,
            "category": category
        })
    
    return {
        **model,
        "brand": brand,
        "compatible_products": enhanced_products,
        "compatible_products_count": len(enhanced_products)
    }

@api_router.put("/car-models/{model_id}")
async def update_car_model(model_id: str, model_data: CarModelCreate):
    """Update car model"""
    result = await db.car_models.update_one(
        {"id": model_id},
        {"$set": model_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Updated successfully"}

@api_router.delete("/car-models/{model_id}")
async def delete_car_model(model_id: str):
    result = await db.car_models.delete_one({"id": model_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Deleted successfully"}

# ==================== Product Brand Routes ====================

@api_router.get("/product-brands", response_model=List[ProductBrand])
async def get_product_brands():
    brands = await db.product_brands.find({}, {"_id": 0}).to_list(100)
    return [ProductBrand(**brand) for brand in brands]

@api_router.post("/product-brands", response_model=ProductBrand)
async def create_product_brand(brand: ProductBrandCreate):
    brand_obj = ProductBrand(**brand.dict())
    await db.product_brands.insert_one(brand_obj.dict())
    return brand_obj

@api_router.delete("/product-brands/{brand_id}")
async def delete_product_brand(brand_id: str):
    result = await db.product_brands.delete_one({"id": brand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    return {"message": "Deleted successfully"}

# ==================== Category Routes ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories(parent_id: Optional[str] = None):
    if parent_id is None:
        query = {"parent_id": None}
    else:
        query = {"parent_id": parent_id}
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.get("/categories/all", response_model=List[Category])
async def get_all_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(500)
    return [Category(**cat) for cat in categories]

@api_router.get("/categories/tree")
async def get_categories_tree():
    """Get categories as a tree structure"""
    all_categories = await db.categories.find({}, {"_id": 0}).to_list(500)
    
    # Build tree
    categories_by_id = {cat["id"]: {**cat, "children": []} for cat in all_categories}
    root_categories = []
    
    for cat in all_categories:
        if cat.get("parent_id") and cat["parent_id"] in categories_by_id:
            categories_by_id[cat["parent_id"]]["children"].append(categories_by_id[cat["id"]])
        else:
            root_categories.append(categories_by_id[cat["id"]])
    
    return root_categories

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    cat_obj = Category(**category.dict())
    await db.categories.insert_one(cat_obj.dict())
    return cat_obj

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Deleted successfully"}

# ==================== Product Routes ====================

@api_router.get("/products")
async def get_products(
    category_id: Optional[str] = None,
    product_brand_id: Optional[str] = None,
    car_model_id: Optional[str] = None,
    car_brand_id: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    skip: int = 0,
    limit: int = 50,
    include_hidden: bool = False
):
    query = {}
    
    # Filter out hidden products by default
    if not include_hidden:
        query["$or"] = [{"hidden_status": False}, {"hidden_status": {"$exists": False}}]
    
    if category_id:
        # Include subcategories
        subcategories = await db.categories.find({"parent_id": category_id}, {"_id": 0}).to_list(100)
        category_ids = [category_id] + [sub["id"] for sub in subcategories]
        query["category_id"] = {"$in": category_ids}
    
    if product_brand_id:
        query["product_brand_id"] = product_brand_id
    
    if car_model_id:
        query["car_model_ids"] = car_model_id
    
    if car_brand_id:
        # Get all models for this brand
        models = await db.car_models.find({"brand_id": car_brand_id}, {"_id": 0}).to_list(500)
        model_ids = [m["id"] for m in models]
        if model_ids:
            query["car_model_ids"] = {"$in": model_ids}
    
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": [Product(**p) for p in products], "total": total}

@api_router.get("/products/search")
async def search_products(q: str = Query(..., min_length=1), limit: int = 20):
    """Real-time search across products, brands, categories, and car models"""
    search_regex = {"$regex": q, "$options": "i"}
    
    # Search products (exclude hidden ones)
    products = await db.products.find(
        {
            "$and": [
                {"$or": [{"name": search_regex}, {"name_ar": search_regex}, {"sku": search_regex}]},
                {"$or": [{"hidden_status": False}, {"hidden_status": {"$exists": False}}]}
            ]
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    # Search car brands
    car_brands = await db.car_brands.find(
        {"$or": [{"name": search_regex}, {"name_ar": search_regex}]},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    # Search car models
    car_models = await db.car_models.find(
        {"$or": [{"name": search_regex}, {"name_ar": search_regex}]},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    # Search product brands
    product_brands = await db.product_brands.find(
        {"name": search_regex},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    # Search categories
    categories = await db.categories.find(
        {"$or": [{"name": search_regex}, {"name_ar": search_regex}]},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    return {
        "products": products,
        "car_brands": car_brands,
        "car_models": car_models,
        "product_brands": product_brands,
        "categories": categories
    }

@api_router.get("/products/all")
async def get_all_products_admin():
    """Get all products including hidden ones (for admin)"""
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return {"products": products, "total": len(products)}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get related data
    product_brand = await db.product_brands.find_one({"id": product.get("product_brand_id")}, {"_id": 0})
    category = await db.categories.find_one({"id": product.get("category_id")}, {"_id": 0})
    car_models = await db.car_models.find({"id": {"$in": product.get("car_model_ids", [])}}, {"_id": 0}).to_list(100)
    
    return {
        **product,
        "product_brand": product_brand,
        "category": category,
        "car_models": car_models
    }

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    product_obj = Product(**product.dict())
    await db.products.insert_one(product_obj.dict())
    return product_obj

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": product.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Updated successfully"}

@api_router.patch("/products/{product_id}/price")
async def update_product_price(product_id: str, price_data: ProductPriceUpdate):
    """Update product price only"""
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"price": price_data.price}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Price updated successfully", "price": price_data.price}

@api_router.patch("/products/{product_id}/hidden")
async def update_product_hidden_status(product_id: str, hidden_data: ProductHiddenUpdate):
    """Update product hidden status"""
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"hidden_status": hidden_data.hidden_status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Hidden status updated successfully", "hidden_status": hidden_data.hidden_status}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Deleted successfully"}

# ==================== Customer Routes ====================

@api_router.get("/customers")
async def get_all_customers():
    """Get all customers (for admin)"""
    customers = await db.users.find({}, {"_id": 0}).to_list(500)
    return {"customers": customers, "total": len(customers)}

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str):
    """Get customer details"""
    customer = await db.users.find_one({"user_id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get customer orders
    orders = await db.orders.find({"user_id": customer_id}, {"_id": 0}).to_list(100)
    
    return {**customer, "orders": orders, "orders_count": len(orders)}

# Admin endpoints for customer data
@api_router.get("/admin/customer/{user_id}/favorites")
async def get_customer_favorites_admin(user_id: str):
    """Get customer's favorites (admin)"""
    favorites = await db.favorites.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Get product details for each favorite
    for fav in favorites:
        product = await db.products.find_one({"id": fav.get("product_id")}, {"_id": 0})
        fav["product"] = product
    
    return {"favorites": favorites}

@api_router.get("/admin/customer/{user_id}/cart")
async def get_customer_cart_admin(user_id: str):
    """Get customer's cart (admin)"""
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        return {"items": []}
    
    # Get product details for each cart item
    items = cart.get("items", [])
    for item in items:
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
        item["product"] = product
    
    return {"items": items}

@api_router.get("/admin/customer/{user_id}/orders")
async def get_customer_orders_admin(user_id: str):
    """Get customer's orders (admin)"""
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer"""
    result = await db.users.delete_one({"user_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    # Also delete related data
    await db.carts.delete_many({"user_id": customer_id})
    await db.favorites.delete_many({"user_id": customer_id})
    return {"message": "Customer deleted successfully"}

# ==================== Cart Routes ====================

@api_router.get("/cart")
async def get_cart(user: User = Depends(require_auth)):
    cart = await db.carts.find_one({"user_id": user.user_id}, {"_id": 0})
    if not cart:
        return {"user_id": user.user_id, "items": []}
    
    # Get product details for cart items
    items_with_details = []
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            items_with_details.append({
                **item,
                "product": product
            })
    
    return {"user_id": user.user_id, "items": items_with_details}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItemAdd, user: User = Depends(require_auth)):
    # Check if product exists
    product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await db.carts.find_one({"user_id": user.user_id})
    
    if cart:
        # Update existing cart
        existing_item = next((i for i in cart.get("items", []) if i["product_id"] == item.product_id), None)
        if existing_item:
            await db.carts.update_one(
                {"user_id": user.user_id, "items.product_id": item.product_id},
                {"$set": {"items.$.quantity": existing_item["quantity"] + item.quantity, "updated_at": datetime.now(timezone.utc)}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user.user_id},
                {"$push": {"items": item.dict()}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
    else:
        # Create new cart
        await db.carts.insert_one({
            "user_id": user.user_id,
            "items": [item.dict()],
            "updated_at": datetime.now(timezone.utc)
        })
    
    return {"message": "Added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItemAdd, user: User = Depends(require_auth)):
    if item.quantity <= 0:
        # Remove item
        await db.carts.update_one(
            {"user_id": user.user_id},
            {"$pull": {"items": {"product_id": item.product_id}}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    else:
        await db.carts.update_one(
            {"user_id": user.user_id, "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity, "updated_at": datetime.now(timezone.utc)}}
        )
    return {"message": "Cart updated"}

@api_router.delete("/cart/clear")
async def clear_cart(user: User = Depends(require_auth)):
    await db.carts.delete_one({"user_id": user.user_id})
    return {"message": "Cart cleared"}

# ==================== Order Routes ====================

@api_router.get("/orders")
async def get_orders(user: User = Depends(require_auth)):
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/all")
async def get_all_orders():
    """Get all orders for admin"""
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"orders": orders, "total": len(orders)}

@api_router.get("/orders/pending-count/{user_id}")
async def get_pending_orders_count(user_id: str):
    """Get count of pending/unviewed orders for a customer"""
    count = await db.orders.count_documents({
        "user_id": user_id,
        "is_viewed": {"$ne": True}
    })
    return {"count": count}

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user: User = Depends(require_auth)):
    # Get cart
    cart = await db.carts.find_one({"user_id": user.user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Build order items
    order_items = []
    subtotal = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            order_items.append(OrderItem(
                product_id=item["product_id"],
                product_name=product["name"],
                product_name_ar=product.get("name_ar"),
                quantity=item["quantity"],
                price=product["price"],
                image_url=product.get("image_url") or (product.get("images", [None])[0] if product.get("images") else None)
            ))
            subtotal += product["price"] * item["quantity"]
    
    if not order_items:
        raise HTTPException(status_code=400, detail="No valid items in cart")
    
    shipping_cost = 150.0  # Fixed shipping cost in EGP
    total = subtotal + shipping_cost
    
    # Create delivery address
    delivery_address = DeliveryAddress(
        street_address=order_data.street_address,
        city=order_data.city,
        state=order_data.state,
        country=order_data.country,
        delivery_instructions=order_data.delivery_instructions
    )
    
    # Create order
    order = Order(
        user_id=user.user_id,
        customer_name=f"{order_data.first_name} {order_data.last_name}",
        customer_email=order_data.email,
        items=order_items,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=total,
        delivery_address=delivery_address,
        phone=order_data.phone,
        payment_method=order_data.payment_method,
        notes=order_data.notes
    )
    
    await db.orders.insert_one(order.dict())
    
    # Clear cart
    await db.carts.delete_one({"user_id": user.user_id})
    
    return order

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: User = Depends(require_auth)):
    order = await db.orders.find_one({"id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.patch("/orders/{order_id}/viewed")
async def mark_order_viewed(order_id: str):
    """Mark order as viewed by admin"""
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"is_viewed": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order marked as viewed"}

# Admin endpoint to mark all orders for a user as viewed
@api_router.patch("/admin/customer/{user_id}/orders/mark-viewed")
async def mark_customer_orders_viewed(user_id: str):
    """Mark all orders for a customer as viewed by admin"""
    result = await db.orders.update_many(
        {"user_id": user_id},
        {"$set": {"is_viewed": True}}
    )
    return {"message": f"Marked {result.modified_count} orders as viewed"}

# Admin model for creating orders on behalf of customers
class AdminOrderCreate(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    street_address: str
    city: str
    state: str
    country: str = "Egypt"
    delivery_instructions: Optional[str] = None
    payment_method: str = "cash_on_delivery"
    notes: Optional[str] = None
    items: List[Dict[str, Any]]  # List of cart items with product_id and quantity

@api_router.post("/admin/orders/create")
async def admin_create_order(order_data: AdminOrderCreate):
    """Admin endpoint to create orders on behalf of customers"""
    
    # Build order items from the provided cart items
    order_items = []
    subtotal = 0
    
    for item in order_data.items:
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
        if product:
            quantity = item.get("quantity", 1)
            order_items.append(OrderItem(
                product_id=item.get("product_id"),
                product_name=product["name"],
                product_name_ar=product.get("name_ar"),
                quantity=quantity,
                price=product["price"],
                image_url=product.get("image_url") or (product.get("images", [None])[0] if product.get("images") else None)
            ))
            subtotal += product["price"] * quantity
    
    if not order_items:
        raise HTTPException(status_code=400, detail="No valid items provided")
    
    shipping_cost = 150.0  # Fixed shipping cost in EGP
    total = subtotal + shipping_cost
    
    # Create delivery address
    delivery_address = DeliveryAddress(
        street_address=order_data.street_address,
        city=order_data.city,
        state=order_data.state,
        country=order_data.country,
        delivery_instructions=order_data.delivery_instructions
    )
    
    # Create order
    order = Order(
        user_id=order_data.user_id,
        customer_name=f"{order_data.first_name} {order_data.last_name}",
        customer_email=order_data.email,
        items=order_items,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=total,
        delivery_address=delivery_address,
        phone=order_data.phone,
        payment_method=order_data.payment_method,
        notes=order_data.notes,
        is_viewed=False  # New orders are not viewed
    )
    
    await db.orders.insert_one(order.dict())
    
    # Clear the customer's cart
    await db.carts.delete_one({"user_id": order_data.user_id})
    
    return order

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str):
    """Update order status"""
    valid_statuses = ["pending", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled", "complete"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated", "status": status}

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    """Delete an order"""
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted successfully"}

# Discount model
class OrderDiscountUpdate(BaseModel):
    discount: float

@api_router.patch("/orders/{order_id}/discount")
async def update_order_discount(order_id: str, discount_data: OrderDiscountUpdate):
    """Apply discount to an order"""
    # Get the order first
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    discount = discount_data.discount
    if discount < 0:
        raise HTTPException(status_code=400, detail="Discount cannot be negative")
    
    # Calculate new total
    subtotal = order.get("subtotal", 0)
    shipping = order.get("shipping_cost", 150)
    new_total = subtotal + shipping - discount
    
    if new_total < 0:
        raise HTTPException(status_code=400, detail="Discount cannot exceed order total")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"discount": discount, "total": new_total}}
    )
    
    return {"message": "Discount applied", "discount": discount, "total": new_total}

@api_router.get("/admin/orders/{order_id}")
async def get_order_admin(order_id: str):
    """Get order details for admin (no auth required)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get customer details
    customer = await db.users.find_one({"user_id": order.get("user_id")}, {"_id": 0})
    
    # Get product details for each item
    items_with_details = []
    for item in order.get("items", []):
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
        items_with_details.append({
            **item,
            "product": product
        })
    
    return {
        **order,
        "customer": customer,
        "items_with_details": items_with_details
    }

# ==================== Comment Routes ====================

@api_router.get("/products/{product_id}/comments")
async def get_product_comments(product_id: str, request: Request, skip: int = 0, limit: int = 50):
    """Get all comments for a product"""
    # Get current user if authenticated
    current_user = await get_current_user(request)
    current_user_id = current_user.user_id if current_user else None
    
    comments = await db.comments.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.comments.count_documents({"product_id": product_id})
    
    # Calculate average rating
    pipeline = [
        {"$match": {"product_id": product_id, "rating": {"$ne": None}}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    rating_result = await db.comments.aggregate(pipeline).to_list(1)
    avg_rating = rating_result[0]["avg_rating"] if rating_result else None
    rating_count = rating_result[0]["count"] if rating_result else 0
    
    # Mark if current user owns the comment
    comments_with_ownership = []
    for comment in comments:
        comments_with_ownership.append({
            **comment,
            "is_owner": comment.get("user_id") == current_user_id
        })
    
    return {
        "comments": comments_with_ownership,
        "total": total,
        "avg_rating": round(avg_rating, 1) if avg_rating else None,
        "rating_count": rating_count
    }

@api_router.post("/products/{product_id}/comments")
async def add_comment(product_id: str, comment_data: CommentCreate, user: User = Depends(require_auth)):
    """Add a comment to a product"""
    # Verify product exists
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate rating
    if comment_data.rating is not None and (comment_data.rating < 1 or comment_data.rating > 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    comment = Comment(
        product_id=product_id,
        user_id=user.user_id,
        user_name=user.name,
        user_picture=user.picture,
        text=comment_data.text,
        rating=comment_data.rating
    )
    
    await db.comments.insert_one(comment.dict())
    
    return {**comment.dict(), "is_owner": True}

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: User = Depends(require_auth)):
    """Delete own comment"""
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await db.comments.delete_one({"id": comment_id})
    return {"message": "Comment deleted successfully"}

@api_router.put("/comments/{comment_id}")
async def update_comment(comment_id: str, comment_data: CommentCreate, user: User = Depends(require_auth)):
    """Update own comment"""
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")
    
    # Validate rating
    if comment_data.rating is not None and (comment_data.rating < 1 or comment_data.rating > 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"text": comment_data.text, "rating": comment_data.rating}}
    )
    
    return {"message": "Comment updated successfully"}

# ==================== Favorites Routes ====================

@api_router.get("/favorites")
async def get_favorites(user: User = Depends(require_auth)):
    """Get user's favorite products"""
    favorites = await db.favorites.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    # Get product details for each favorite
    favorites_with_products = []
    for fav in favorites:
        product = await db.products.find_one({"id": fav["product_id"]}, {"_id": 0})
        if product:
            # Get product brand and category
            product_brand = await db.product_brands.find_one({"id": product.get("product_brand_id")}, {"_id": 0})
            category = await db.categories.find_one({"id": product.get("category_id")}, {"_id": 0})
            favorites_with_products.append({
                **fav,
                "product": {
                    **product,
                    "product_brand": product_brand,
                    "category": category
                }
            })
    
    return {"favorites": favorites_with_products, "total": len(favorites_with_products)}

@api_router.get("/favorites/check/{product_id}")
async def check_favorite(product_id: str, user: User = Depends(require_auth)):
    """Check if a product is in user's favorites"""
    favorite = await db.favorites.find_one({"user_id": user.user_id, "product_id": product_id})
    return {"is_favorite": favorite is not None}

@api_router.post("/favorites/add")
async def add_to_favorites(data: FavoriteAdd, user: User = Depends(require_auth)):
    """Add a product to favorites"""
    # Verify product exists
    product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already in favorites
    existing = await db.favorites.find_one({"user_id": user.user_id, "product_id": data.product_id})
    if existing:
        raise HTTPException(status_code=400, detail="Product already in favorites")
    
    favorite = Favorite(
        user_id=user.user_id,
        product_id=data.product_id
    )
    
    await db.favorites.insert_one(favorite.dict())
    return {"message": "Added to favorites", "favorite": favorite.dict()}

@api_router.delete("/favorites/{product_id}")
async def remove_from_favorites(product_id: str, user: User = Depends(require_auth)):
    """Remove a product from favorites"""
    result = await db.favorites.delete_one({"user_id": user.user_id, "product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Removed from favorites"}

@api_router.post("/favorites/toggle")
async def toggle_favorite(data: FavoriteAdd, user: User = Depends(require_auth)):
    """Toggle a product's favorite status"""
    # Verify product exists
    product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if in favorites
    existing = await db.favorites.find_one({"user_id": user.user_id, "product_id": data.product_id})
    
    if existing:
        # Remove from favorites
        await db.favorites.delete_one({"user_id": user.user_id, "product_id": data.product_id})
        return {"is_favorite": False, "message": "Removed from favorites"}
    else:
        # Add to favorites
        favorite = Favorite(user_id=user.user_id, product_id=data.product_id)
        await db.favorites.insert_one(favorite.dict())
        return {"is_favorite": True, "message": "Added to favorites"}

# ==================== Seed Data Route ====================

@api_router.post("/seed")
async def seed_database():
    """Seed initial data for car brands, product brands, and categories"""
    
    # Check if already seeded
    existing_brands = await db.car_brands.count_documents({})
    if existing_brands > 0:
        return {"message": "Database already seeded"}
    
    # Car Brands
    car_brands = [
        {"id": "cb_toyota", "name": "Toyota", "name_ar": "تويوتا", "logo": None, "created_at": datetime.now(timezone.utc)},
        {"id": "cb_mitsubishi", "name": "Mitsubishi", "name_ar": "ميتسوبيشي", "logo": None, "created_at": datetime.now(timezone.utc)},
        {"id": "cb_mazda", "name": "Mazda", "name_ar": "مازدا", "logo": None, "created_at": datetime.now(timezone.utc)},
    ]
    await db.car_brands.insert_many(car_brands)
    
    # Car Models
    car_models = [
        {"id": "cm_camry", "brand_id": "cb_toyota", "name": "Camry", "name_ar": "كامري", "year_start": 2018, "year_end": 2024, "created_at": datetime.now(timezone.utc)},
        {"id": "cm_corolla", "brand_id": "cb_toyota", "name": "Corolla", "name_ar": "كورولا", "year_start": 2019, "year_end": 2024, "created_at": datetime.now(timezone.utc)},
        {"id": "cm_hilux", "brand_id": "cb_toyota", "name": "Hilux", "name_ar": "هايلكس", "year_start": 2016, "year_end": 2024, "created_at": datetime.now(timezone.utc)},
        {"id": "cm_lancer", "brand_id": "cb_mitsubishi", "name": "Lancer", "name_ar": "لانسر", "year_start": 2015, "year_end": 2020, "created_at": datetime.now(timezone.utc)},
        {"id": "cm_pajero", "brand_id": "cb_mitsubishi", "name": "Pajero", "name_ar": "باجيرو", "year_start": 2016, "year_end": 2024, "created_at": datetime.now(timezone.utc)},
        {"id": "cm_mazda3", "brand_id": "cb_mazda", "name": "Mazda 3", "name_ar": "مازدا 3", "year_start": 2019, "year_end": 2024, "created_at": datetime.now(timezone.utc)},
        {"id": "cm_cx5", "brand_id": "cb_mazda", "name": "CX-5", "name_ar": "سي اكس 5", "year_start": 2017, "year_end": 2024, "created_at": datetime.now(timezone.utc)},
    ]
    await db.car_models.insert_many(car_models)
    
    # Product Brands
    product_brands = [
        {"id": "pb_kby", "name": "KBY", "logo": None, "created_at": datetime.now(timezone.utc)},
        {"id": "pb_ctr", "name": "CTR", "logo": None, "created_at": datetime.now(timezone.utc)},
        {"id": "pb_art", "name": "ART", "logo": None, "created_at": datetime.now(timezone.utc)},
    ]
    await db.product_brands.insert_many(product_brands)
    
    # Main Categories
    categories = [
        {"id": "cat_engine", "name": "Engine", "name_ar": "المحرك", "parent_id": None, "icon": "engine", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_suspension", "name": "Suspension", "name_ar": "نظام التعليق", "parent_id": None, "icon": "car-suspension", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_clutch", "name": "Clutch", "name_ar": "الكلتش", "parent_id": None, "icon": "car-clutch", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_electricity", "name": "Electricity", "name_ar": "الكهرباء", "parent_id": None, "icon": "lightning-bolt", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_body", "name": "Body", "name_ar": "البودي", "parent_id": None, "icon": "car-door", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_tires", "name": "Tires", "name_ar": "الإطارات", "parent_id": None, "icon": "car-tire-alert", "created_at": datetime.now(timezone.utc)},
    ]
    await db.categories.insert_many(categories)
    
    # Subcategories
    subcategories = [
        {"id": "cat_filters", "name": "Filters", "name_ar": "الفلاتر", "parent_id": "cat_engine", "icon": "filter", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_oil_filter", "name": "Oil Filter", "name_ar": "فلتر الزيت", "parent_id": "cat_filters", "icon": "oil", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_air_filter", "name": "Air Filter", "name_ar": "فلتر الهواء", "parent_id": "cat_filters", "icon": "air-filter", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_belts", "name": "Belts", "name_ar": "السيور", "parent_id": "cat_engine", "icon": "fan", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_spark_plugs", "name": "Spark Plugs", "name_ar": "شمعات الاشتعال", "parent_id": "cat_engine", "icon": "flash", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_shock_absorbers", "name": "Shock Absorbers", "name_ar": "ممتص الصدمات", "parent_id": "cat_suspension", "icon": "car-brake-abs", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_clutch_kit", "name": "Clutch Kit", "name_ar": "طقم الكلتش", "parent_id": "cat_clutch", "icon": "cog", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_batteries", "name": "Batteries", "name_ar": "البطاريات", "parent_id": "cat_electricity", "icon": "battery", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_headlights", "name": "Headlights", "name_ar": "المصابيح الأمامية", "parent_id": "cat_electricity", "icon": "lightbulb", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_mirrors", "name": "Mirrors", "name_ar": "المرايا", "parent_id": "cat_body", "icon": "flip-horizontal", "created_at": datetime.now(timezone.utc)},
        {"id": "cat_bumpers", "name": "Bumpers", "name_ar": "الصدامات", "parent_id": "cat_body", "icon": "car-side", "created_at": datetime.now(timezone.utc)},
    ]
    await db.categories.insert_many(subcategories)
    
    # Sample Products
    products = [
        {
            "id": "prod_oil_filter_1", 
            "name": "Toyota Oil Filter", 
            "name_ar": "فلتر زيت تويوتا",
            "description": "High quality oil filter for Toyota vehicles",
            "description_ar": "فلتر زيت عالي الجودة لسيارات تويوتا",
            "price": 45.99,
            "sku": "TOY-OIL-001",
            "category_id": "cat_oil_filter",
            "product_brand_id": "pb_kby",
            "car_model_ids": ["cm_camry", "cm_corolla"],
            "image_url": None,
            "stock": 50,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_air_filter_1", 
            "name": "Camry Air Filter", 
            "name_ar": "فلتر هواء كامري",
            "description": "Premium air filter for Camry",
            "description_ar": "فلتر هواء ممتاز لكامري",
            "price": 35.50,
            "sku": "CAM-AIR-001",
            "category_id": "cat_air_filter",
            "product_brand_id": "pb_ctr",
            "car_model_ids": ["cm_camry"],
            "image_url": None,
            "stock": 30,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_spark_plug_1", 
            "name": "Iridium Spark Plugs Set", 
            "name_ar": "طقم شمعات إريديوم",
            "description": "4-piece iridium spark plugs set",
            "description_ar": "طقم شمعات إريديوم 4 قطع",
            "price": 89.99,
            "sku": "SPK-IRD-001",
            "category_id": "cat_spark_plugs",
            "product_brand_id": "pb_art",
            "car_model_ids": ["cm_camry", "cm_corolla", "cm_lancer"],
            "image_url": None,
            "stock": 25,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_shock_1", 
            "name": "Front Shock Absorber", 
            "name_ar": "ممتص صدمات أمامي",
            "description": "Heavy duty front shock absorber",
            "description_ar": "ممتص صدمات أمامي شديد التحمل",
            "price": 125.00,
            "sku": "SHK-FRT-001",
            "category_id": "cat_shock_absorbers",
            "product_brand_id": "pb_kby",
            "car_model_ids": ["cm_hilux", "cm_pajero"],
            "image_url": None,
            "stock": 15,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_clutch_kit_1", 
            "name": "Complete Clutch Kit", 
            "name_ar": "طقم كلتش كامل",
            "description": "Complete clutch kit with pressure plate and disc",
            "description_ar": "طقم كلتش كامل مع صحن ضغط وقرص",
            "price": 299.99,
            "sku": "CLT-KIT-001",
            "category_id": "cat_clutch_kit",
            "product_brand_id": "pb_ctr",
            "car_model_ids": ["cm_lancer", "cm_mazda3"],
            "image_url": None,
            "stock": 10,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_battery_1", 
            "name": "Car Battery 70Ah", 
            "name_ar": "بطارية سيارة 70 أمبير",
            "description": "High performance 70Ah car battery",
            "description_ar": "بطارية سيارة عالية الأداء 70 أمبير",
            "price": 185.00,
            "sku": "BAT-70A-001",
            "category_id": "cat_batteries",
            "product_brand_id": "pb_art",
            "car_model_ids": ["cm_camry", "cm_corolla", "cm_hilux", "cm_pajero"],
            "image_url": None,
            "stock": 20,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_headlight_1", 
            "name": "LED Headlight Bulb H7", 
            "name_ar": "لمبة فانوس LED H7",
            "description": "Super bright LED headlight bulb",
            "description_ar": "لمبة فانوس LED شديدة السطوع",
            "price": 55.00,
            "sku": "LED-H7-001",
            "category_id": "cat_headlights",
            "product_brand_id": "pb_kby",
            "car_model_ids": ["cm_mazda3", "cm_cx5"],
            "image_url": None,
            "stock": 40,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "prod_mirror_1", 
            "name": "Side Mirror Right", 
            "name_ar": "مرآة جانبية يمين",
            "description": "Electric side mirror with heating",
            "description_ar": "مرآة جانبية كهربائية مع تسخين",
            "price": 145.00,
            "sku": "MIR-R-001",
            "category_id": "cat_mirrors",
            "product_brand_id": "pb_ctr",
            "car_model_ids": ["cm_camry"],
            "image_url": None,
            "stock": 8,
            "created_at": datetime.now(timezone.utc)
        },
    ]
    await db.products.insert_many(products)
    
    return {"message": "Database seeded successfully"}

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {"message": "Al-Ghzaly Auto Parts API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Auto-seed database on startup if empty"""
    try:
        existing_brands = await db.car_brands.count_documents({})
        if existing_brands == 0:
            logger.info("Database empty, auto-seeding...")
            # Trigger the seed function
            await seed_database()
            logger.info("Database seeded successfully on startup")
        else:
            logger.info(f"Database already has {existing_brands} car brands, skipping seed")
    except Exception as e:
        logger.error(f"Error during startup seed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
