#!/usr/bin/env python3
"""
Al-Ghazaly Auto Parts Backend API Testing Suite v4.1.0
Comprehensive end-to-end testing of all backend API endpoints

This test suite covers:
1. Health & Core Endpoints
2. Product Catalog APIs
3. Categories APIs
4. Car Brands & Models APIs
5. Product Brands APIs
6. Marketing APIs
7. Cart APIs (requires auth)
8. Orders APIs
9. Analytics APIs
10. Admin Management APIs
11. Subscriber APIs
12. Partner/Supplier/Distributor APIs
13. Authentication APIs
"""

import requests
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

class BackendAPITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.test_data = {}
        
    def log_test(self, endpoint: str, method: str, status_code: int, 
                 expected_status: int, response_data: Any = None, 
                 error: str = None, success: bool = True):
        """Log test results"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "expected_status": expected_status,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "error": error,
            "response_preview": str(response_data)[:200] if response_data else None
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {method} {endpoint} - {status_code} (expected {expected_status})")
        if error:
            print(f"   Error: {error}")
        if response_data and isinstance(response_data, dict):
            if 'message' in response_data:
                print(f"   Message: {response_data['message']}")
            elif 'detail' in response_data:
                print(f"   Detail: {response_data['detail']}")
    
    def test_endpoint(self, endpoint: str, method: str = "GET", 
                     expected_status: int = 200, data: Dict = None,
                     headers: Dict = None, params: Dict = None) -> Optional[Dict]:
        """Test a single endpoint"""
        url = f"{self.api_url}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=params)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, params=params)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=headers, params=params)
            elif method == "PATCH":
                response = self.session.patch(url, json=data, headers=headers, params=params)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            success = response.status_code == expected_status
            self.log_test(endpoint, method, response.status_code, expected_status, 
                         response_data, success=success)
            
            return response_data if success else None
            
        except Exception as e:
            self.log_test(endpoint, method, 0, expected_status, 
                         error=str(e), success=False)
            return None
    
    def test_health_endpoints(self):
        """Test health and core endpoints"""
        print("\n=== TESTING HEALTH & CORE ENDPOINTS ===")
        
        # Test root endpoint
        self.test_endpoint("/", "GET", 200)
        
        # Test health endpoint
        health_data = self.test_endpoint("/health", "GET", 200)
        if health_data and 'api_version' in health_data:
            print(f"   API Version: {health_data['api_version']}")
        
        # Test version endpoint
        self.test_endpoint("/version", "GET", 200)
    
    def test_product_catalog_apis(self):
        """Test product catalog APIs"""
        print("\n=== TESTING PRODUCT CATALOG APIs ===")
        
        # Test GET products with pagination
        products_data = self.test_endpoint("/products", "GET", 200)
        if products_data and isinstance(products_data, list):
            print(f"   Found {len(products_data)} products")
            if products_data:
                product_id = products_data[0].get('id')
                if product_id:
                    self.test_data['product_id'] = product_id
                    # Test GET single product
                    self.test_endpoint(f"/products/{product_id}", "GET", 200)
        
        # Test POST product (should require auth)
        test_product = {
            "name": "Test Product",
            "name_ar": "منتج تجريبي",
            "sku": f"TEST_{uuid.uuid4().hex[:8]}",
            "price": 100.0,
            "category_id": "test_category",
            "brand_id": "test_brand"
        }
        self.test_endpoint("/products", "POST", 403, data=test_product)
        
        # Test PUT product (should require auth)
        if 'product_id' in self.test_data:
            self.test_endpoint(f"/products/{self.test_data['product_id']}", "PUT", 403, data=test_product)
        
        # Test DELETE product (should require auth)
        if 'product_id' in self.test_data:
            self.test_endpoint(f"/products/{self.test_data['product_id']}", "DELETE", 403)
    
    def test_categories_apis(self):
        """Test categories APIs"""
        print("\n=== TESTING CATEGORIES APIs ===")
        
        # Test GET categories
        categories_data = self.test_endpoint("/categories", "GET", 200)
        if categories_data and isinstance(categories_data, list):
            print(f"   Found {len(categories_data)} categories")
            if categories_data:
                category_id = categories_data[0].get('id')
                if category_id:
                    self.test_data['category_id'] = category_id
        
        # Test POST category (should require auth)
        test_category = {
            "name": "Test Category",
            "name_ar": "فئة تجريبية",
            "description": "Test category description"
        }
        self.test_endpoint("/categories", "POST", 403, data=test_category)
        
        # Test PUT category (should require auth)
        if 'category_id' in self.test_data:
            self.test_endpoint(f"/categories/{self.test_data['category_id']}", "PUT", 403, data=test_category)
        
        # Test DELETE category (should require auth)
        if 'category_id' in self.test_data:
            self.test_endpoint(f"/categories/{self.test_data['category_id']}", "DELETE", 403)
    
    def test_car_brands_models_apis(self):
        """Test car brands and models APIs"""
        print("\n=== TESTING CAR BRANDS & MODELS APIs ===")
        
        # Test GET car brands
        brands_data = self.test_endpoint("/car-brands", "GET", 200)
        if brands_data and isinstance(brands_data, list):
            print(f"   Found {len(brands_data)} car brands")
            if brands_data:
                brand_id = brands_data[0].get('id')
                if brand_id:
                    self.test_data['car_brand_id'] = brand_id
        
        # Test POST car brand (should require auth)
        test_brand = {
            "name": "Test Brand",
            "country": "Test Country"
        }
        self.test_endpoint("/car-brands", "POST", 403, data=test_brand)
        
        # Test DELETE car brand (should require auth)
        if 'car_brand_id' in self.test_data:
            self.test_endpoint(f"/car-brands/{self.test_data['car_brand_id']}", "DELETE", 403)
        
        # Test GET car models
        models_data = self.test_endpoint("/car-models", "GET", 200)
        if models_data and isinstance(models_data, list):
            print(f"   Found {len(models_data)} car models")
            if models_data:
                model_id = models_data[0].get('id')
                if model_id:
                    self.test_data['car_model_id'] = model_id
        
        # Test POST car model (should require auth)
        test_model = {
            "name": "Test Model",
            "car_brand_id": self.test_data.get('car_brand_id', 'test_brand')
        }
        self.test_endpoint("/car-models", "POST", 403, data=test_model)
        
        # Test DELETE car model (should require auth)
        if 'car_model_id' in self.test_data:
            self.test_endpoint(f"/car-models/{self.test_data['car_model_id']}", "DELETE", 403)
    
    def test_product_brands_apis(self):
        """Test product brands APIs"""
        print("\n=== TESTING PRODUCT BRANDS APIs ===")
        
        # Test GET product brands
        brands_data = self.test_endpoint("/product-brands", "GET", 200)
        if brands_data and isinstance(brands_data, list):
            print(f"   Found {len(brands_data)} product brands")
            if brands_data:
                brand_id = brands_data[0].get('id')
                if brand_id:
                    self.test_data['product_brand_id'] = brand_id
        
        # Test POST product brand (should require auth)
        test_brand = {
            "name": "Test Product Brand",
            "country": "Test Country"
        }
        self.test_endpoint("/product-brands", "POST", 403, data=test_brand)
        
        # Test DELETE product brand (should require auth)
        if 'product_brand_id' in self.test_data:
            self.test_endpoint(f"/product-brands/{self.test_data['product_brand_id']}", "DELETE", 403)
    
    def test_marketing_apis(self):
        """Test marketing APIs"""
        print("\n=== TESTING MARKETING APIs ===")
        
        # Test GET promotions
        promotions_data = self.test_endpoint("/promotions", "GET", 200)
        if promotions_data and isinstance(promotions_data, list):
            print(f"   Found {len(promotions_data)} promotions")
            if promotions_data:
                promo_id = promotions_data[0].get('id')
                if promo_id:
                    self.test_data['promotion_id'] = promo_id
        
        # Test POST promotion (should require auth)
        test_promotion = {
            "title": "Test Promotion",
            "title_ar": "عرض تجريبي",
            "description": "Test promotion description",
            "discount_percentage": 10.0,
            "is_active": True
        }
        self.test_endpoint("/promotions", "POST", 403, data=test_promotion)
        
        # Test DELETE promotion (should require auth)
        if 'promotion_id' in self.test_data:
            self.test_endpoint(f"/promotions/{self.test_data['promotion_id']}", "DELETE", 403)
        
        # Test GET bundle offers
        bundles_data = self.test_endpoint("/bundle-offers", "GET", 200)
        if bundles_data and isinstance(bundles_data, list):
            print(f"   Found {len(bundles_data)} bundle offers")
            if bundles_data:
                bundle_id = bundles_data[0].get('id')
                if bundle_id:
                    self.test_data['bundle_id'] = bundle_id
        
        # Test POST bundle offer (should require auth)
        test_bundle = {
            "name": "Test Bundle",
            "name_ar": "حزمة تجريبية",
            "description": "Test bundle description",
            "discount_percentage": 15.0,
            "product_ids": ["test_product_1", "test_product_2"],
            "is_active": True
        }
        self.test_endpoint("/bundle-offers", "POST", 403, data=test_bundle)
        
        # Test DELETE bundle offer (should require auth)
        if 'bundle_id' in self.test_data:
            self.test_endpoint(f"/bundle-offers/{self.test_data['bundle_id']}", "DELETE", 403)
        
        # Test marketing home slider
        self.test_endpoint("/marketing/home-slider", "GET", 200)
    
    def test_cart_apis(self):
        """Test cart APIs (all require auth)"""
        print("\n=== TESTING CART APIs (AUTH REQUIRED) ===")
        
        # Test GET cart (should require auth)
        self.test_endpoint("/cart", "GET", 401)
        
        # Test POST cart/add (should require auth)
        test_cart_item = {
            "product_id": self.test_data.get('product_id', 'test_product'),
            "quantity": 1
        }
        self.test_endpoint("/cart/add", "POST", 401, data=test_cart_item)
        
        # Test PUT cart/update (should require auth)
        self.test_endpoint("/cart/update", "PUT", 401, data=test_cart_item)
        
        # Test DELETE cart/clear (should require auth)
        self.test_endpoint("/cart/clear", "DELETE", 401)
        
        # Test DELETE cart/void-bundle (should require auth)
        self.test_endpoint("/cart/void-bundle/test_bundle_group", "DELETE", 401)
        
        # Test POST cart/validate-stock (should require auth)
        self.test_endpoint("/cart/validate-stock", "POST", 401, data={"items": []})
    
    def test_orders_apis(self):
        """Test orders APIs"""
        print("\n=== TESTING ORDERS APIs ===")
        
        # Test GET orders (should require auth)
        self.test_endpoint("/orders", "GET", 401)
        
        # Test POST orders (should require auth)
        test_order = {
            "customer_name": "Test Customer",
            "customer_phone": "1234567890",
            "customer_address": "Test Address",
            "items": [
                {
                    "product_id": self.test_data.get('product_id', 'test_product'),
                    "quantity": 1,
                    "unit_price": 100.0
                }
            ]
        }
        self.test_endpoint("/orders", "POST", 401, data=test_order)
        
        # Test PATCH order status (should require auth)
        self.test_endpoint("/orders/test_order_id/status", "PATCH", 401, 
                          params={"status": "preparing"})
    
    def test_analytics_apis(self):
        """Test analytics APIs"""
        print("\n=== TESTING ANALYTICS APIs ===")
        
        # Test analytics overview (should require auth)
        self.test_endpoint("/analytics/overview", "GET", 403)
        
        # Test analytics customers (should require auth)
        self.test_endpoint("/analytics/customers", "GET", 403)
        
        # Test analytics products (should require auth)
        self.test_endpoint("/analytics/products", "GET", 403)
        
        # Test analytics orders (should require auth)
        self.test_endpoint("/analytics/orders", "GET", 403)
        
        # Test analytics revenue (should require auth)
        self.test_endpoint("/analytics/revenue", "GET", 403)
        
        # Test analytics admin performance (should require auth)
        self.test_endpoint("/analytics/admin-performance", "GET", 403)
    
    def test_admin_management_apis(self):
        """Test admin management APIs"""
        print("\n=== TESTING ADMIN MANAGEMENT APIs ===")
        
        # Test GET admins (should require auth)
        self.test_endpoint("/admins", "GET", 403)
        
        # Test POST admins (should require auth)
        test_admin = {
            "email": "test@example.com",
            "name": "Test Admin",
            "role": "admin"
        }
        self.test_endpoint("/admins", "POST", 403, data=test_admin)
        
        # Test DELETE admin (should require auth)
        self.test_endpoint("/admins/test_admin_id", "DELETE", 403)
        
        # Test admin check access (should require auth)
        self.test_endpoint("/admins/check-access", "GET", 401)
    
    def test_subscriber_apis(self):
        """Test subscriber APIs"""
        print("\n=== TESTING SUBSCRIBER APIs ===")
        
        # Test GET subscribers (should require auth)
        self.test_endpoint("/subscribers", "GET", 403)
        
        # Test POST subscribers (should require auth)
        test_subscriber = {
            "email": "test@example.com",
            "name": "Test Subscriber"
        }
        self.test_endpoint("/subscribers", "POST", 403, data=test_subscriber)
        
        # Test PUT subscriber (should require auth)
        self.test_endpoint("/subscribers/test_id", "PUT", 403, data=test_subscriber)
        
        # Test DELETE subscriber (should require auth)
        self.test_endpoint("/subscribers/test_id", "DELETE", 403)
        
        # Test GET subscription requests (should require auth)
        self.test_endpoint("/subscription-requests", "GET", 403)
        
        # Test PATCH approve subscription request (should require auth)
        self.test_endpoint("/subscription-requests/test_id/approve", "PATCH", 403)
        
        # Test PATCH reject subscription request (should require auth)
        self.test_endpoint("/subscription-requests/test_id/reject", "PATCH", 403)
    
    def test_partner_supplier_distributor_apis(self):
        """Test partner, supplier, and distributor APIs"""
        print("\n=== TESTING PARTNER/SUPPLIER/DISTRIBUTOR APIs ===")
        
        # Test GET partners (should require auth)
        self.test_endpoint("/partners", "GET", 403)
        
        # Test GET suppliers (should require auth)
        self.test_endpoint("/suppliers", "GET", 403)
        
        # Test GET distributors (should require auth)
        self.test_endpoint("/distributors", "GET", 403)
    
    def test_authentication_apis(self):
        """Test authentication APIs"""
        print("\n=== TESTING AUTHENTICATION APIs ===")
        
        # Test POST auth/session (should handle invalid session)
        test_session = {
            "session_token": "invalid_token"
        }
        self.test_endpoint("/auth/session", "POST", 401, data=test_session)
        
        # Test POST auth/logout
        self.test_endpoint("/auth/logout", "POST", 200)
        
        # Test GET notifications (should require auth)
        self.test_endpoint("/notifications", "GET", 401)
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Al-Ghazaly Auto Parts Backend API Testing Suite v4.1.0")
        print(f"Testing backend at: {self.api_url}")
        
        start_time = datetime.now()
        
        # Run all test suites
        self.test_health_endpoints()
        self.test_product_catalog_apis()
        self.test_categories_apis()
        self.test_car_brands_models_apis()
        self.test_product_brands_apis()
        self.test_marketing_apis()
        self.test_cart_apis()
        self.test_orders_apis()
        self.test_analytics_apis()
        self.test_admin_management_apis()
        self.test_subscriber_apis()
        self.test_partner_supplier_distributor_apis()
        self.test_authentication_apis()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Generate summary
        self.generate_summary(duration)
    
    def generate_summary(self, duration: float):
        """Generate test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n{'='*60}")
        print("🏁 AL-GHAZALY AUTO PARTS BACKEND API TEST SUMMARY")
        print(f"{'='*60}")
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"🔗 Backend URL: {self.api_url}")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['method']} {result['endpoint']} - {result['status_code']} (expected {result['expected_status']})")
                    if result['error']:
                        print(f"     Error: {result['error']}")
        
        print(f"\n🎯 ENDPOINT COVERAGE ANALYSIS:")
        
        # Group by endpoint categories
        categories = {
            "Health & Core": ["/", "/health", "/version"],
            "Products": ["/products"],
            "Categories": ["/categories"],
            "Car Brands": ["/car-brands"],
            "Car Models": ["/car-models"],
            "Product Brands": ["/product-brands"],
            "Marketing": ["/promotions", "/bundle-offers", "/marketing/home-slider"],
            "Cart": ["/cart", "/cart/add", "/cart/update", "/cart/clear", "/cart/void-bundle", "/cart/validate-stock"],
            "Orders": ["/orders"],
            "Analytics": ["/analytics/overview", "/analytics/customers", "/analytics/products", "/analytics/orders", "/analytics/revenue", "/analytics/admin-performance"],
            "Admin Management": ["/admins", "/admins/check-access"],
            "Subscribers": ["/subscribers", "/subscription-requests"],
            "Partners/Suppliers/Distributors": ["/partners", "/suppliers", "/distributors"],
            "Authentication": ["/auth/session", "/auth/logout", "/notifications"]
        }
        
        for category, endpoints in categories.items():
            tested_endpoints = [r['endpoint'] for r in self.test_results if any(r['endpoint'].startswith(ep) for ep in endpoints)]
            coverage = len(set(tested_endpoints))
            print(f"   {category}: {coverage} endpoints tested")
        
        print(f"\n🔐 SECURITY ANALYSIS:")
        auth_required_tests = [r for r in self.test_results if r['expected_status'] in [401, 403]]
        auth_working = sum(1 for r in auth_required_tests if r['success'])
        print(f"   Authentication/Authorization Tests: {auth_working}/{len(auth_required_tests)} working correctly")
        
        if success_rate >= 90:
            print(f"\n🎉 EXCELLENT! Backend API is highly functional with {success_rate:.1f}% success rate")
        elif success_rate >= 75:
            print(f"\n👍 GOOD! Backend API is mostly functional with {success_rate:.1f}% success rate")
        elif success_rate >= 50:
            print(f"\n⚠️  MODERATE! Backend API has some issues with {success_rate:.1f}% success rate")
        else:
            print(f"\n🚨 CRITICAL! Backend API has major issues with {success_rate:.1f}% success rate")
        
        print(f"{'='*60}")

def main():
    """Main function to run the test suite"""
    tester = BackendAPITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()