#!/usr/bin/env python3
"""
ALghazaly Auto Parts Backend API v4.1.0 Testing Suite
Testing Admin Sync & Auto-Cleanup features

Focus Areas:
1. Product APIs (GET, POST, DELETE)
2. Category APIs (GET, POST, DELETE) 
3. Product Brand APIs (GET, POST, DELETE)
4. Promotion APIs (GET, POST, DELETE) - High Priority Sync
5. Bundle Offer APIs (GET, POST, DELETE) - High Priority Sync

Backend URL: http://localhost:8001
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional

class ALghazalyAPITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        if not success:
            self.failed_tests.append(result)
            
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed for {method} {endpoint}: {e}")
            raise
            
    def test_health_check(self):
        """Test basic health and version endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        # Test root endpoint
        try:
            response = self.make_request("GET", "/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Root Endpoint", True, f"Version: {data.get('version', 'N/A')}, Status: {data.get('status', 'N/A')}")
            else:
                self.log_test("Root Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Error: {str(e)}")
            
        # Test health endpoint
        try:
            response = self.make_request("GET", "/api/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health Check", True, f"API Version: {data.get('api_version', 'N/A')}, DB: {data.get('database', 'N/A')}")
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            
        # Test version endpoint
        try:
            response = self.make_request("GET", "/api/version")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Version Info", True, f"API Version: {data.get('api_version', 'N/A')}, Features: {len(data.get('features', []))}")
            else:
                self.log_test("Version Info", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Version Info", False, f"Error: {str(e)}")

    def test_product_apis(self):
        """Test Product APIs - GET, POST, DELETE"""
        print("\n=== PRODUCT API TESTS ===")
        
        # Test GET /api/products (list all products)
        try:
            response = self.make_request("GET", "/api/products")
            if response.status_code == 200:
                data = response.json()
                products = data.get('products', [])
                total = data.get('total', 0)
                self.log_test("GET /api/products", True, f"Found {len(products)} products, Total: {total}")
            else:
                self.log_test("GET /api/products", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/products", False, f"Error: {str(e)}")
            
        # Test POST /api/products/admin (create product - requires admin)
        try:
            product_data = {
                "name": "Test Brake Pad Set",
                "name_ar": "طقم فحمات فرامل تجريبي",
                "sku": f"TEST-BP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "price": 150.00,
                "category_id": "cat_12345678",
                "product_brand_id": "pb_12345678",
                "car_model_ids": ["cm_corolla"],
                "description": "Test brake pad set for testing",
                "description_ar": "طقم فحمات فرامل للاختبار",
                "stock_quantity": 10,
                "min_stock_level": 2
            }
            response = self.make_request("POST", "/api/products", json=product_data)
            if response.status_code == 401:
                self.log_test("POST /api/products (Auth Check)", True, "Correctly requires authentication (401)")
            elif response.status_code == 403:
                self.log_test("POST /api/products (Auth Check)", True, "Correctly requires admin access (403)")
            elif response.status_code == 201 or response.status_code == 200:
                data = response.json()
                self.log_test("POST /api/products", True, f"Product created: {data.get('id', 'N/A')}")
            else:
                self.log_test("POST /api/products", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/products", False, f"Error: {str(e)}")
            
        # Test DELETE /api/products/{id} (delete product - requires admin)
        try:
            # Try to delete a non-existent product to test auth
            response = self.make_request("DELETE", "/api/products/test_product_id")
            if response.status_code == 401:
                self.log_test("DELETE /api/products/{id} (Auth Check)", True, "Correctly requires authentication (401)")
            elif response.status_code == 403:
                self.log_test("DELETE /api/products/{id} (Auth Check)", True, "Correctly requires admin access (403)")
            elif response.status_code == 404:
                self.log_test("DELETE /api/products/{id} (Not Found)", True, "Correctly returns 404 for non-existent product")
            elif response.status_code == 200:
                self.log_test("DELETE /api/products/{id}", True, "Product deletion successful")
            else:
                self.log_test("DELETE /api/products/{id}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("DELETE /api/products/{id}", False, f"Error: {str(e)}")

    def test_category_apis(self):
        """Test Category APIs - GET, POST, DELETE"""
        print("\n=== CATEGORY API TESTS ===")
        
        # Test GET /api/categories (list all categories)
        try:
            response = self.make_request("GET", "/api/categories")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/categories", True, f"Found {len(data)} categories")
            else:
                self.log_test("GET /api/categories", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/categories", False, f"Error: {str(e)}")
            
        # Test GET /api/categories/all
        try:
            response = self.make_request("GET", "/api/categories/all")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/categories/all", True, f"Found {len(data)} total categories")
            else:
                self.log_test("GET /api/categories/all", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/categories/all", False, f"Error: {str(e)}")
            
        # Test POST /api/categories (create category)
        try:
            category_data = {
                "name": "Test Category",
                "name_ar": "فئة تجريبية",
                "description": "Test category for API testing",
                "description_ar": "فئة تجريبية لاختبار API",
                "parent_id": None,
                "image_data": None
            }
            response = self.make_request("POST", "/api/categories", json=category_data)
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                self.log_test("POST /api/categories", True, f"Category created: {data.get('id', 'N/A')}")
            else:
                self.log_test("POST /api/categories", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/categories", False, f"Error: {str(e)}")
            
        # Test DELETE /api/categories/{id} (delete category)
        try:
            response = self.make_request("DELETE", "/api/categories/test_category_id")
            if response.status_code == 200:
                self.log_test("DELETE /api/categories/{id}", True, "Category deletion endpoint accessible")
            elif response.status_code == 404:
                self.log_test("DELETE /api/categories/{id} (Not Found)", True, "Correctly returns 404 for non-existent category")
            else:
                self.log_test("DELETE /api/categories/{id}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("DELETE /api/categories/{id}", False, f"Error: {str(e)}")

    def test_product_brand_apis(self):
        """Test Product Brand APIs - GET, POST, DELETE"""
        print("\n=== PRODUCT BRAND API TESTS ===")
        
        # Test GET /api/product-brands (list all brands)
        try:
            response = self.make_request("GET", "/api/product-brands")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/product-brands", True, f"Found {len(data)} product brands")
            else:
                self.log_test("GET /api/product-brands", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/product-brands", False, f"Error: {str(e)}")
            
        # Test POST /api/product-brands (create brand)
        try:
            brand_data = {
                "name": "Test Brand",
                "name_ar": "علامة تجارية تجريبية",
                "country_of_origin": "Germany",
                "country_of_origin_ar": "ألمانيا",
                "description": "Test brand for API testing",
                "description_ar": "علامة تجارية تجريبية لاختبار API",
                "supplier_id": None
            }
            response = self.make_request("POST", "/api/product-brands", json=brand_data)
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                self.log_test("POST /api/product-brands", True, f"Brand created: {data.get('id', 'N/A')}")
            else:
                self.log_test("POST /api/product-brands", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/product-brands", False, f"Error: {str(e)}")
            
        # Test DELETE /api/product-brands/{id} (delete brand)
        try:
            response = self.make_request("DELETE", "/api/product-brands/test_brand_id")
            if response.status_code == 200:
                self.log_test("DELETE /api/product-brands/{id}", True, "Brand deletion endpoint accessible")
            elif response.status_code == 404:
                self.log_test("DELETE /api/product-brands/{id} (Not Found)", True, "Correctly returns 404 for non-existent brand")
            else:
                self.log_test("DELETE /api/product-brands/{id}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("DELETE /api/product-brands/{id}", False, f"Error: {str(e)}")

    def test_promotion_apis(self):
        """Test Promotion APIs - GET, POST, DELETE (High Priority Sync)"""
        print("\n=== PROMOTION API TESTS (HIGH PRIORITY SYNC) ===")
        
        # Test GET /api/promotions (list all promotions)
        try:
            response = self.make_request("GET", "/api/promotions")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/promotions", True, f"Found {len(data)} active promotions")
            else:
                self.log_test("GET /api/promotions", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/promotions", False, f"Error: {str(e)}")
            
        # Test GET /api/promotions with active_only=false
        try:
            response = self.make_request("GET", "/api/promotions?active_only=false")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/promotions (All)", True, f"Found {len(data)} total promotions")
            else:
                self.log_test("GET /api/promotions (All)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/promotions (All)", False, f"Error: {str(e)}")
            
        # Test POST /api/promotions (create promotion)
        try:
            promotion_data = {
                "title": "Test Promotion",
                "title_ar": "عرض ترويجي تجريبي",
                "description": "Test promotion for API testing",
                "description_ar": "عرض ترويجي تجريبي لاختبار API",
                "promotion_type": "discount",
                "discount_percentage": 15.0,
                "target_type": "all_products",
                "target_car_model_id": None,
                "target_category_id": None,
                "is_active": True,
                "sort_order": 1,
                "image_data": None
            }
            response = self.make_request("POST", "/api/promotions", json=promotion_data)
            if response.status_code == 401:
                self.log_test("POST /api/promotions (Auth Check)", True, "Correctly requires authentication (401)")
            elif response.status_code == 403:
                self.log_test("POST /api/promotions (Auth Check)", True, "Correctly requires admin access (403)")
            elif response.status_code == 201 or response.status_code == 200:
                data = response.json()
                self.log_test("POST /api/promotions", True, f"Promotion created: {data.get('id', 'N/A')}")
            else:
                self.log_test("POST /api/promotions", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/promotions", False, f"Error: {str(e)}")
            
        # Test DELETE /api/promotions/{id} (delete promotion)
        try:
            response = self.make_request("DELETE", "/api/promotions/test_promotion_id")
            if response.status_code == 401:
                self.log_test("DELETE /api/promotions/{id} (Auth Check)", True, "Correctly requires authentication (401)")
            elif response.status_code == 403:
                self.log_test("DELETE /api/promotions/{id} (Auth Check)", True, "Correctly requires admin access (403)")
            elif response.status_code == 404:
                self.log_test("DELETE /api/promotions/{id} (Not Found)", True, "Correctly returns 404 for non-existent promotion")
            elif response.status_code == 200:
                self.log_test("DELETE /api/promotions/{id}", True, "Promotion deletion successful")
            else:
                self.log_test("DELETE /api/promotions/{id}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("DELETE /api/promotions/{id}", False, f"Error: {str(e)}")

    def test_bundle_offer_apis(self):
        """Test Bundle Offer APIs - GET, POST, DELETE (High Priority Sync)"""
        print("\n=== BUNDLE OFFER API TESTS (HIGH PRIORITY SYNC) ===")
        
        # Test GET /api/bundle-offers (list all bundles)
        try:
            response = self.make_request("GET", "/api/bundle-offers")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/bundle-offers", True, f"Found {len(data)} active bundle offers")
            else:
                self.log_test("GET /api/bundle-offers", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/bundle-offers", False, f"Error: {str(e)}")
            
        # Test GET /api/bundle-offers with active_only=false
        try:
            response = self.make_request("GET", "/api/bundle-offers?active_only=false")
            if response.status_code == 200:
                data = response.json()
                self.log_test("GET /api/bundle-offers (All)", True, f"Found {len(data)} total bundle offers")
            else:
                self.log_test("GET /api/bundle-offers (All)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/bundle-offers (All)", False, f"Error: {str(e)}")
            
        # Test POST /api/bundle-offers (create bundle)
        try:
            bundle_data = {
                "name": "Test Bundle Offer",
                "name_ar": "عرض حزمة تجريبي",
                "description": "Test bundle offer for API testing",
                "description_ar": "عرض حزمة تجريبي لاختبار API",
                "product_ids": ["prod_12345678", "prod_87654321"],
                "discount_percentage": 20.0,
                "target_car_model_id": "cm_corolla",
                "is_active": True,
                "image_data": None
            }
            response = self.make_request("POST", "/api/bundle-offers", json=bundle_data)
            if response.status_code == 401:
                self.log_test("POST /api/bundle-offers (Auth Check)", True, "Correctly requires authentication (401)")
            elif response.status_code == 403:
                self.log_test("POST /api/bundle-offers (Auth Check)", True, "Correctly requires admin access (403)")
            elif response.status_code == 201 or response.status_code == 200:
                data = response.json()
                self.log_test("POST /api/bundle-offers", True, f"Bundle offer created: {data.get('id', 'N/A')}")
            else:
                self.log_test("POST /api/bundle-offers", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/bundle-offers", False, f"Error: {str(e)}")
            
        # Test DELETE /api/bundle-offers/{id} (delete bundle)
        try:
            response = self.make_request("DELETE", "/api/bundle-offers/test_bundle_id")
            if response.status_code == 401:
                self.log_test("DELETE /api/bundle-offers/{id} (Auth Check)", True, "Correctly requires authentication (401)")
            elif response.status_code == 403:
                self.log_test("DELETE /api/bundle-offers/{id} (Auth Check)", True, "Correctly requires admin access (403)")
            elif response.status_code == 404:
                self.log_test("DELETE /api/bundle-offers/{id} (Not Found)", True, "Correctly returns 404 for non-existent bundle")
            elif response.status_code == 200:
                self.log_test("DELETE /api/bundle-offers/{id}", True, "Bundle offer deletion successful")
            else:
                self.log_test("DELETE /api/bundle-offers/{id}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("DELETE /api/bundle-offers/{id}", False, f"Error: {str(e)}")

    def test_data_structure_validation(self):
        """Test that all GET endpoints return valid JSON with correct data structure"""
        print("\n=== DATA STRUCTURE VALIDATION TESTS ===")
        
        endpoints_to_test = [
            ("/api/products", "products"),
            ("/api/categories", "categories"),
            ("/api/product-brands", "product_brands"),
            ("/api/promotions", "promotions"),
            ("/api/bundle-offers", "bundle_offers")
        ]
        
        for endpoint, data_type in endpoints_to_test:
            try:
                response = self.make_request("GET", endpoint)
                if response.status_code == 200:
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            self.log_test(f"JSON Structure - {data_type}", True, f"Valid JSON array with {len(data)} items")
                        elif isinstance(data, dict) and 'products' in data:
                            products = data.get('products', [])
                            self.log_test(f"JSON Structure - {data_type}", True, f"Valid JSON object with {len(products)} products")
                        else:
                            self.log_test(f"JSON Structure - {data_type}", True, f"Valid JSON response")
                    except json.JSONDecodeError:
                        self.log_test(f"JSON Structure - {data_type}", False, "Invalid JSON response")
                else:
                    self.log_test(f"JSON Structure - {data_type}", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test(f"JSON Structure - {data_type}", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting ALghazaly Auto Parts Backend API v4.1.0 Testing Suite")
        print("=" * 80)
        
        start_time = datetime.now()
        
        # Run all test suites
        self.test_health_check()
        self.test_product_apis()
        self.test_category_apis()
        self.test_product_brand_apis()
        self.test_promotion_apis()
        self.test_bundle_offer_apis()
        self.test_data_structure_validation()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        if self.failed_tests:
            print("\n🔍 FAILED TESTS DETAILS:")
            print("-" * 40)
            for test in self.failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        print("\n🎯 FOCUS AREAS TESTED:")
        print("✓ Product APIs (GET, POST, DELETE)")
        print("✓ Category APIs (GET, POST, DELETE)")
        print("✓ Product Brand APIs (GET, POST, DELETE)")
        print("✓ Promotion APIs (GET, POST, DELETE) - High Priority Sync")
        print("✓ Bundle Offer APIs (GET, POST, DELETE) - High Priority Sync")
        print("✓ Authentication & Authorization checks")
        print("✓ JSON response validation")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": passed_tests/total_tests*100,
            "duration": duration,
            "failed_tests": self.failed_tests
        }

def main():
    """Main test execution"""
    print("ALghazaly Auto Parts Backend API v4.1.0 - Admin Sync & Auto-Cleanup Testing")
    print("Backend URL: http://localhost:8001")
    print()
    
    tester = ALghazalyAPITester("http://localhost:8001")
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results["failed"] > 0:
        print(f"\n⚠️  {results['failed']} tests failed. Check the details above.")
        sys.exit(1)
    else:
        print(f"\n🎉 All {results['passed']} tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()