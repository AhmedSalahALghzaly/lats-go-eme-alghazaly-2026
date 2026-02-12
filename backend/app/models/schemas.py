"""
Pydantic Schemas for ALghazaly Auto Parts API
All request/response models - With input validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

# ==================== Car & Product Schemas ====================

class CarBrandCreate(BaseModel):
    name: str = Field(..., max_length=200)
    name_ar: str = Field(..., max_length=200)
    logo: Optional[str] = None
    distributor_id: Optional[str] = None

class CarModelCreate(BaseModel):
    brand_id: str
    name: str = Field(..., max_length=200)
    name_ar: str = Field(..., max_length=200)
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    image_url: Optional[str] = None
    images: List[str] = []
    description: Optional[str] = Field(None, max_length=5000)
    description_ar: Optional[str] = Field(None, max_length=5000)
    variants: List[dict] = []
    chassis_number: Optional[str] = Field(None, max_length=50)
    catalog_pdf: Optional[str] = None

class ProductBrandCreate(BaseModel):
    name: str = Field(..., max_length=200)
    name_ar: Optional[str] = Field(None, max_length=200)
    logo: Optional[str] = None
    country_of_origin: Optional[str] = Field(None, max_length=100)
    country_of_origin_ar: Optional[str] = Field(None, max_length=100)
    supplier_id: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=200)
    name_ar: str = Field(..., max_length=200)
    parent_id: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    image_data: Optional[str] = None

class ProductCreate(BaseModel):
    name: str = Field(..., max_length=500)
    name_ar: str = Field(..., max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    description_ar: Optional[str] = Field(None, max_length=10000)
    price: float = Field(..., ge=0)
    sku: str = Field(..., max_length=100)
    product_brand_id: Optional[str] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    images: List[str] = []
    car_model_ids: List[str] = []
    stock_quantity: int = Field(0, ge=0)
    hidden_status: bool = False
    added_by_admin_id: Optional[str] = None

# ==================== Cart Schemas ====================

class DiscountDetails(BaseModel):
    discount_type: str = "none"
    discount_value: float = 0
    discount_source_id: Optional[str] = None
    discount_source_name: Optional[str] = None

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1
    bundle_group_id: Optional[str] = None
    bundle_offer_id: Optional[str] = None
    bundle_discount_percentage: Optional[float] = None

class CartItemAddEnhanced(BaseModel):
    product_id: str
    quantity: int = 1
    original_unit_price: Optional[float] = None
    final_unit_price: Optional[float] = None
    discount_details: Optional[Dict[str, Any]] = None
    bundle_group_id: Optional[str] = None
    added_by_admin_id: Optional[str] = None

# ==================== Order Schemas ====================

class OrderCreate(BaseModel):
    first_name: str = Field(..., max_length=200)
    last_name: str = Field(..., max_length=200)
    email: str = Field(..., max_length=320)
    phone: str = Field(..., max_length=50)
    street_address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=200)
    state: str = Field(..., max_length=200)
    country: str = Field("Egypt", max_length=100)
    delivery_instructions: Optional[str] = Field(None, max_length=2000)
    payment_method: str = Field("cash_on_delivery", max_length=50)
    notes: Optional[str] = Field(None, max_length=2000)

class AdminAssistedOrderCreate(BaseModel):
    customer_id: str
    items: List[Dict[str, Any]]
    shipping_address: str
    phone: str
    notes: Optional[str] = None

class AdminOrderCreate(BaseModel):
    user_id: str
    first_name: str
    last_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: str
    street_address: str
    city: str
    state: Optional[str] = ""
    country: Optional[str] = "Egypt"
    delivery_instructions: Optional[str] = ""
    payment_method: Optional[str] = "cash_on_delivery"
    notes: Optional[str] = ""
    items: List[dict]

# ==================== User & Admin Schemas ====================

class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    rating: Optional[int] = Field(None, ge=1, le=5)

class FavoriteAdd(BaseModel):
    product_id: str

class PartnerCreate(BaseModel):
    email: str = Field(..., max_length=320)

class AdminCreate(BaseModel):
    email: str = Field(..., max_length=320)
    name: Optional[str] = Field(None, max_length=200)

class SupplierCreate(BaseModel):
    name: str = Field(..., max_length=300)
    name_ar: Optional[str] = Field(None, max_length=300)
    profile_image: Optional[str] = None
    phone_numbers: List[str] = []
    contact_email: Optional[str] = Field(None, max_length=320)
    address: Optional[str] = Field(None, max_length=1000)
    address_ar: Optional[str] = Field(None, max_length=1000)
    description: Optional[str] = Field(None, max_length=5000)
    description_ar: Optional[str] = Field(None, max_length=5000)
    slider_images: List[str] = []
    website_url: Optional[str] = Field(None, max_length=500)
    linked_product_brand_ids: List[str] = []

class DistributorCreate(BaseModel):
    name: str = Field(..., max_length=300)
    name_ar: Optional[str] = Field(None, max_length=300)
    profile_image: Optional[str] = None
    phone_numbers: List[str] = []
    contact_email: Optional[str] = Field(None, max_length=320)
    address: Optional[str] = Field(None, max_length=1000)
    address_ar: Optional[str] = Field(None, max_length=1000)
    description: Optional[str] = Field(None, max_length=5000)
    description_ar: Optional[str] = Field(None, max_length=5000)
    slider_images: List[str] = []
    website_url: Optional[str] = Field(None, max_length=500)
    linked_car_brand_ids: List[str] = []

class SubscriberCreate(BaseModel):
    email: str = Field(..., max_length=320)

class SubscriptionRequestCreate(BaseModel):
    customer_name: str = Field(..., max_length=200)
    email: str = Field(..., max_length=320)
    phone: str = Field(..., max_length=50)
    governorate: str = Field(..., max_length=200)
    village: str = Field(..., max_length=200)
    address: str = Field(..., max_length=1000)
    car_model: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"

class SettleRevenueRequest(BaseModel):
    admin_id: str
    product_ids: List[str]
    total_amount: float

# ==================== Sync Schemas ====================

class SyncPullRequest(BaseModel):
    last_pulled_at: Optional[int] = None
    tables: List[str] = []

# ==================== Marketing Schemas ====================

class PromotionCreate(BaseModel):
    title: str
    title_ar: Optional[str] = None
    image: Optional[str] = None
    promotion_type: str = "slider"
    is_active: bool = True
    target_product_id: Optional[str] = None
    target_car_model_id: Optional[str] = None
    sort_order: int = 0

class BundleOfferCreate(BaseModel):
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    discount_percentage: float
    target_car_model_id: Optional[str] = None
    product_ids: List[str] = []
    image: Optional[str] = None
    is_active: bool = True

# ==================== Admin/Deployment Schemas ====================

class VersionInfo(BaseModel):
    api_version: str
    build_date: str
    min_frontend_version: str
    features: List[str]

class ExportRequest(BaseModel):
    collections: Optional[List[str]] = None
    include_metadata: bool = True

class ImportRequest(BaseModel):
    data: Dict[str, Any]
    merge_strategy: str = "skip_existing"
