"""
Delta Sync API - Security Hardened
High-efficiency incremental data synchronization with auth on sensitive data
"""
from fastapi import APIRouter, Query, Request
from typing import Optional
from datetime import datetime, timezone
from ....core.database import db
from ....core.security import serialize_doc, get_current_user, get_user_role

router = APIRouter(prefix="/delta-sync")

def parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace('Z', '+00:00'))
    except Exception:
        return None

@router.get("/products")
async def get_products_delta(
    last_sync: Optional[str] = Query(None),
    limit: int = Query(1000, le=5000)
):
    last_sync_dt = parse_timestamp(last_sync)
    
    pipeline = [
        {"$match": {"deleted_at": None}},
    ]
    
    if last_sync_dt:
        pipeline[0]["$match"]["updated_at"] = {"$gt": last_sync_dt}
    
    pipeline.extend([
        {
            "$lookup": {
                "from": "product_brands",
                "localField": "product_brand_id",
                "foreignField": "_id",
                "as": "_brand"
            }
        },
        {"$unwind": {"path": "$_brand", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "car_models",
                "let": {"model_ids": {"$ifNull": [{"$arrayElemAt": ["$car_model_ids", 0]}, None]}},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$_id", "$$model_ids"]}}}
                ],
                "as": "_car_model"
            }
        },
        {"$unwind": {"path": "$_car_model", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "car_brands",
                "localField": "_car_model.brand_id",
                "foreignField": "_id",
                "as": "_car_brand"
            }
        },
        {"$unwind": {"path": "$_car_brand", "preserveNullAndEmptyArrays": True}},
        {
            "$addFields": {
                "product_brand_name": "$_brand.name",
                "product_brand_name_ar": "$_brand.name_ar",
                "manufacturer_country": "$_brand.country_of_origin",
                "manufacturer_country_ar": "$_brand.country_of_origin_ar",
                "compatible_car_model": "$_car_model.name",
                "compatible_car_model_ar": "$_car_model.name_ar",
                "compatible_car_models_count": {"$size": {"$ifNull": ["$car_model_ids", []]}},
                "compatible_car_brand": "$_car_brand.name",
                "compatible_car_brand_ar": "$_car_brand.name_ar",
                "compatible_car_year_from": "$_car_model.year_start",
                "compatible_car_year_to": "$_car_model.year_end"
            }
        },
        {"$project": {"_brand": 0, "_car_model": 0, "_car_brand": 0}},
        {"$sort": {"updated_at": -1}},
        {"$limit": limit}
    ])
    
    products = await db.products.aggregate(pipeline).to_list(limit)
    
    deleted_ids = []
    if last_sync_dt:
        deleted_docs = await db.products.find(
            {"deleted_at": {"$gt": last_sync_dt}},
            {"_id": 1}
        ).to_list(1000)
        deleted_ids = [doc["_id"] for doc in deleted_docs]
    
    server_time = datetime.now(timezone.utc).isoformat()
    
    return {
        "products": [serialize_doc(p) for p in products],
        "deleted_ids": deleted_ids,
        "server_time": server_time,
        "is_delta": last_sync is not None,
        "total": len(products)
    }

@router.get("/categories")
async def get_categories_delta(last_sync: Optional[str] = Query(None)):
    last_sync_dt = parse_timestamp(last_sync)
    
    query = {"deleted_at": None}
    if last_sync_dt:
        query["updated_at"] = {"$gt": last_sync_dt}
    
    categories = await db.categories.find(query).sort([
        ("sort_order", 1), ("name", 1)
    ]).to_list(1000)
    
    deleted_ids = []
    if last_sync_dt:
        deleted_docs = await db.categories.find(
            {"deleted_at": {"$gt": last_sync_dt}},
            {"_id": 1}
        ).to_list(500)
        deleted_ids = [doc["_id"] for doc in deleted_docs]
    
    return {
        "categories": [serialize_doc(c) for c in categories],
        "deleted_ids": deleted_ids,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_delta": last_sync is not None
    }

@router.get("/orders")
async def get_orders_delta(
    request: Request,
    last_sync: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None)
):
    """Get orders delta - REQUIRES authentication. Users can only see their own orders."""
    user = await get_current_user(request)
    if not user:
        return {"orders": [], "deleted_ids": [], "server_time": datetime.now(timezone.utc).isoformat(), "is_delta": last_sync is not None}
    
    role = await get_user_role(user)
    last_sync_dt = parse_timestamp(last_sync)
    
    query = {"deleted_at": None}
    
    # Non-admin users can only see their own orders
    if role in ["owner", "partner", "admin"]:
        if user_id:
            query["user_id"] = user_id
    else:
        # Force user_id to be the authenticated user's ID
        query["user_id"] = user["id"]
    
    if last_sync_dt:
        query["updated_at"] = {"$gt": last_sync_dt}
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    
    deleted_ids = []
    if last_sync_dt:
        del_query = {"deleted_at": {"$gt": last_sync_dt}}
        if role not in ["owner", "partner", "admin"]:
            del_query["user_id"] = user["id"]
        elif user_id:
            del_query["user_id"] = user_id
        deleted_docs = await db.orders.find(del_query, {"_id": 1}).to_list(500)
        deleted_ids = [doc["_id"] for doc in deleted_docs]
    
    return {
        "orders": [serialize_doc(o) for o in orders],
        "deleted_ids": deleted_ids,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_delta": last_sync is not None
    }

@router.get("/car-brands")
async def get_car_brands_delta(last_sync: Optional[str] = Query(None)):
    last_sync_dt = parse_timestamp(last_sync)
    query = {"deleted_at": None}
    if last_sync_dt:
        query["updated_at"] = {"$gt": last_sync_dt}
    
    brands = await db.car_brands.find(query).sort("name", 1).to_list(500)
    deleted_ids = []
    if last_sync_dt:
        deleted = await db.car_brands.find({"deleted_at": {"$gt": last_sync_dt}}, {"_id": 1}).to_list(100)
        deleted_ids = [d["_id"] for d in deleted]
    
    return {
        "car_brands": [serialize_doc(b) for b in brands],
        "deleted_ids": deleted_ids,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_delta": last_sync is not None
    }

@router.get("/car-models")
async def get_car_models_delta(last_sync: Optional[str] = Query(None)):
    last_sync_dt = parse_timestamp(last_sync)
    query = {"deleted_at": None}
    if last_sync_dt:
        query["updated_at"] = {"$gt": last_sync_dt}
    
    models = await db.car_models.find(query).sort("name", 1).to_list(1000)
    deleted_ids = []
    if last_sync_dt:
        deleted = await db.car_models.find({"deleted_at": {"$gt": last_sync_dt}}, {"_id": 1}).to_list(200)
        deleted_ids = [d["_id"] for d in deleted]
    
    return {
        "car_models": [serialize_doc(m) for m in models],
        "deleted_ids": deleted_ids,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_delta": last_sync is not None
    }

@router.get("/product-brands")
async def get_product_brands_delta(last_sync: Optional[str] = Query(None)):
    last_sync_dt = parse_timestamp(last_sync)
    query = {"deleted_at": None}
    if last_sync_dt:
        query["updated_at"] = {"$gt": last_sync_dt}
    
    brands = await db.product_brands.find(query).sort("name", 1).to_list(500)
    deleted_ids = []
    if last_sync_dt:
        deleted = await db.product_brands.find({"deleted_at": {"$gt": last_sync_dt}}, {"_id": 1}).to_list(100)
        deleted_ids = [d["_id"] for d in deleted]
    
    return {
        "product_brands": [serialize_doc(b) for b in brands],
        "deleted_ids": deleted_ids,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_delta": last_sync is not None
    }

@router.get("/full")
async def get_full_delta(
    last_sync: Optional[str] = Query(None),
    tables: Optional[str] = Query(None)
):
    # Whitelist allowed tables
    allowed_tables = {"products", "categories", "car_brands", "car_models", "product_brands"}
    requested_tables = tables.split(",") if tables else list(allowed_tables)
    last_sync_dt = parse_timestamp(last_sync)
    
    result = {
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_delta": last_sync is not None,
        "data": {}
    }
    
    for table in requested_tables:
        table = table.strip()
        
        # Only allow whitelisted tables
        if table not in allowed_tables:
            continue
        
        query = {"deleted_at": None}
        if last_sync_dt:
            query["updated_at"] = {"$gt": last_sync_dt}
        
        collection_map = {
            "products": db.products,
            "categories": db.categories,
            "car_brands": db.car_brands,
            "car_models": db.car_models,
            "product_brands": db.product_brands,
        }
        
        if table in collection_map:
            coll = collection_map[table]
            docs = await coll.find(query).to_list(2000)
            deleted_ids = []
            if last_sync_dt:
                deleted = await coll.find({"deleted_at": {"$gt": last_sync_dt}}, {"_id": 1}).to_list(500)
                deleted_ids = [d["_id"] for d in deleted]
            
            result["data"][table] = {
                "items": [serialize_doc(d) for d in docs],
                "deleted_ids": deleted_ids
            }
    
    return result
