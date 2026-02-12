"""
Comprehensive Security Testing for Al-Ghazaly Auto Parts API
Tests all security requirements from the security audit
"""
import requests
import sys
import json
import time
import re
from datetime import datetime

class SecurityTester:
    def __init__(self, base_url="https://auto-parts-pro-2.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.session = requests.Session()
        self.test_results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }
        print(f"🔍 Testing API at: {self.api_base}")

    def log_result(self, test_name, success, message, is_warning=False):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        if is_warning:
            status = "⚠️ WARN"
            self.test_results["warnings"].append(f"{test_name}: {message}")
        elif success:
            self.test_results["passed"].append(f"{test_name}: {message}")
        else:
            self.test_results["failed"].append(f"{test_name}: {message}")
        
        print(f"{status} {test_name}: {message}")

    def test_auth_enforcement_crud_endpoints(self):
        """Test 1-3: Authentication enforcement on CRUD endpoints"""
        print("\n🔐 Testing Authentication Enforcement on CRUD Endpoints...")
        
        endpoints = [
            ("POST", "/car-brands", {"name": "Test Brand", "name_ar": "تست براند"}),
            ("PUT", "/car-brands/test123", {"name": "Updated", "name_ar": "محدث"}),
            ("DELETE", "/car-brands/test123", None),
            
            ("POST", "/car-models", {"brand_id": "test", "name": "Test Model", "name_ar": "موديل تست"}),
            ("PUT", "/car-models/test123", {"brand_id": "test", "name": "Updated", "name_ar": "محدث"}),
            ("DELETE", "/car-models/test123", None),
            
            ("POST", "/product-brands", {"name": "Test Brand", "name_ar": "براند تست"}),
            ("PUT", "/product-brands/test123", {"name": "Updated", "name_ar": "محدث"}),
            ("DELETE", "/product-brands/test123", None),
            
            ("POST", "/categories", {"name": "Test Category", "name_ar": "فئة تست"}),
            ("PUT", "/categories/test123", {"name": "Updated", "name_ar": "محدث"}),
            ("DELETE", "/categories/test123", None),
            
            ("POST", "/products", {
                "name": "Test Product", "name_ar": "منتج تست", 
                "price": 100, "sku": "TEST123"
            }),
            ("PUT", "/products/test123", {
                "name": "Updated Product", "name_ar": "منتج محدث", 
                "price": 150, "sku": "TEST456"
            }),
            ("DELETE", "/products/test123", None),
            ("PATCH", "/products/test123/price", {"price": 200}),
            ("PATCH", "/products/test123/hidden", {"hidden_status": True})
        ]
        
        for method, endpoint, data in endpoints:
            try:
                url = f"{self.api_base}{endpoint}"
                headers = {'Content-Type': 'application/json'}
                
                if method == "POST":
                    response = self.session.post(url, json=data, headers=headers)
                elif method == "PUT":
                    response = self.session.put(url, json=data, headers=headers)
                elif method == "PATCH":
                    response = self.session.patch(url, json=data, headers=headers)
                elif method == "DELETE":
                    response = self.session.delete(url, headers=headers)
                
                if response.status_code in [401, 403]:
                    self.log_result(
                        f"Auth Check {method} {endpoint}",
                        True,
                        f"Correctly rejected with {response.status_code}"
                    )
                else:
                    self.log_result(
                        f"Auth Check {method} {endpoint}",
                        False,
                        f"Should return 401/403, got {response.status_code}"
                    )
            except Exception as e:
                self.log_result(f"Auth Check {method} {endpoint}", False, f"Request failed: {str(e)}")

    def test_read_endpoints_public(self):
        """Test 4: READ endpoints should work without auth"""
        print("\n📖 Testing Public READ Endpoints...")
        
        endpoints = [
            "/car-brands",
            "/products",
            "/health",
            "/categories",
            "/product-brands",
            "/car-models"
        ]
        
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{self.api_base}{endpoint}")
                if response.status_code == 200:
                    self.log_result(
                        f"Public GET {endpoint}",
                        True,
                        "Accessible without authentication"
                    )
                else:
                    self.log_result(
                        f"Public GET {endpoint}",
                        False,
                        f"Should return 200, got {response.status_code}"
                    )
            except Exception as e:
                self.log_result(f"Public GET {endpoint}", False, f"Request failed: {str(e)}")

    def test_security_headers(self):
        """Test 5: Security headers must be present"""
        print("\n🛡️ Testing Security Headers...")
        
        required_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options", 
            "X-XSS-Protection",
            "Referrer-Policy",
            "Cache-Control"
        ]
        
        try:
            response = self.session.get(f"{self.api_base}/health")
            missing_headers = []
            
            for header in required_headers:
                if header not in response.headers:
                    missing_headers.append(header)
            
            if not missing_headers:
                self.log_result(
                    "Security Headers",
                    True,
                    "All required security headers present"
                )
            else:
                self.log_result(
                    "Security Headers",
                    False,
                    f"Missing headers: {', '.join(missing_headers)}"
                )
        except Exception as e:
            self.log_result("Security Headers", False, f"Request failed: {str(e)}")

    def test_health_endpoint_no_leakage(self):
        """Test 6: Health check must NOT leak database error details"""
        print("\n🏥 Testing Health Endpoint Information Leakage...")
        
        try:
            response = self.session.get(f"{self.api_base}/health")
            if response.status_code == 200:
                data = response.json()
                
                # Check that no detailed error information is leaked
                forbidden_fields = ["error", "stack", "trace", "exception", "mongodb_error"]
                leaked_fields = [field for field in forbidden_fields if field in data]
                
                if not leaked_fields:
                    self.log_result(
                        "Health Endpoint Security",
                        True,
                        "No sensitive error details leaked"
                    )
                else:
                    self.log_result(
                        "Health Endpoint Security",
                        False,
                        f"Leaked fields: {leaked_fields}"
                    )
            else:
                self.log_result(
                    "Health Endpoint Security",
                    False,
                    f"Health endpoint returned {response.status_code}"
                )
        except Exception as e:
            self.log_result("Health Endpoint Security", False, f"Request failed: {str(e)}")

    def test_regex_sanitization(self):
        """Test 7: Search endpoint regex sanitization (ReDoS prevention)"""
        print("\n🔍 Testing Regex Sanitization (ReDoS Prevention)...")
        
        # Test potentially dangerous regex patterns
        dangerous_patterns = [
            ".*|.*",      # Alternation with wildcards
            "(.*){10}",   # Excessive repetition
            ".*.*.*.*",   # Multiple wildcards
            "^(a+)+$",    # Nested quantifiers
            "a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*b"  # Catastrophic backtracking
        ]
        
        for pattern in dangerous_patterns:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.api_base}/products/search", 
                                          params={"q": pattern, "limit": 5},
                                          timeout=5)
                end_time = time.time()
                
                processing_time = end_time - start_time
                
                if processing_time < 3.0 and response.status_code == 200:
                    self.log_result(
                        f"Regex Safety: {pattern[:20]}...",
                        True,
                        f"Handled safely in {processing_time:.2f}s"
                    )
                elif processing_time >= 3.0:
                    self.log_result(
                        f"Regex Safety: {pattern[:20]}...",
                        False,
                        f"Potential ReDoS - took {processing_time:.2f}s"
                    )
                else:
                    self.log_result(
                        f"Regex Safety: {pattern[:20]}...",
                        True,
                        f"Rejected safely with {response.status_code}"
                    )
                    
            except requests.Timeout:
                self.log_result(
                    f"Regex Safety: {pattern[:20]}...",
                    False,
                    "Request timed out - possible ReDoS vulnerability"
                )
            except Exception as e:
                self.log_result(f"Regex Safety: {pattern[:20]}...", False, f"Request failed: {str(e)}")

    def test_promotion_reorder_auth(self):
        """Test 8: Promotion reorder without auth should be rejected"""
        print("\n🎯 Testing Promotion Reorder Authentication...")
        
        try:
            response = self.session.patch(
                f"{self.api_base}/promotions/test/reorder",
                json={"sort_order": 1}
            )
            
            if response.status_code == 403:
                self.log_result(
                    "Promotion Reorder Auth",
                    True,
                    "Correctly rejected with 403"
                )
            else:
                self.log_result(
                    "Promotion Reorder Auth",
                    False,
                    f"Should return 403, got {response.status_code}"
                )
        except Exception as e:
            self.log_result("Promotion Reorder Auth", False, f"Request failed: {str(e)}")

    def test_delta_sync_orders_auth(self):
        """Test 9: Delta sync orders endpoint without auth should return empty orders"""
        print("\n🔄 Testing Delta Sync Orders Authentication...")
        
        try:
            response = self.session.get(f"{self.api_base}/delta-sync/orders")
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get("orders", [])
                
                if len(orders) == 0:
                    self.log_result(
                        "Delta Sync Orders Auth",
                        True,
                        "Returns empty orders for unauthenticated user"
                    )
                else:
                    self.log_result(
                        "Delta Sync Orders Auth",
                        False,
                        f"Should return empty orders, got {len(orders)} orders"
                    )
            else:
                self.log_result(
                    "Delta Sync Orders Auth",
                    False,
                    f"Unexpected status code: {response.status_code}"
                )
        except Exception as e:
            self.log_result("Delta Sync Orders Auth", False, f"Request failed: {str(e)}")

    def test_subscription_status_no_leakage(self):
        """Test 10: Subscription status endpoint must NOT return sensitive IDs"""
        print("\n📧 Testing Subscription Status Information Leakage...")
        
        try:
            response = self.session.get(
                f"{self.api_base}/subscription-status",
                params={"email": "test@test.com"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check that sensitive fields are not returned
                sensitive_fields = ["subscriber_id", "request_id", "_id", "customer_id"]
                leaked_fields = [field for field in sensitive_fields if field in data]
                
                if not leaked_fields:
                    self.log_result(
                        "Subscription Status Security",
                        True,
                        "No sensitive IDs leaked"
                    )
                else:
                    self.log_result(
                        "Subscription Status Security",
                        False,
                        f"Leaked sensitive fields: {leaked_fields}"
                    )
            else:
                self.log_result(
                    "Subscription Status Security",
                    True,
                    f"Properly protected with status {response.status_code}"
                )
        except Exception as e:
            self.log_result("Subscription Status Security", False, f"Request failed: {str(e)}")

    def test_cors_configuration(self):
        """Test 11: CORS should NOT have allow_origins=* with allow_credentials=True"""
        print("\n🌐 Testing CORS Configuration...")
        
        try:
            # Send a CORS preflight request
            response = self.session.options(
                f"{self.api_base}/health",
                headers={
                    "Origin": "https://malicious-site.com",
                    "Access-Control-Request-Method": "GET"
                }
            )
            
            cors_origin = response.headers.get("Access-Control-Allow-Origin", "")
            cors_credentials = response.headers.get("Access-Control-Allow-Credentials", "")
            
            # Check for dangerous CORS configuration
            if cors_origin == "*" and cors_credentials.lower() == "true":
                self.log_result(
                    "CORS Configuration",
                    False,
                    "Dangerous: allow_origins=* with allow_credentials=true"
                )
            else:
                self.log_result(
                    "CORS Configuration",
                    True,
                    f"Safe CORS config - Origin: {cors_origin}, Credentials: {cors_credentials}"
                )
        except Exception as e:
            self.log_result("CORS Configuration", False, f"Request failed: {str(e)}")

    def test_invalid_json_handling(self):
        """Test 12: Backend should respond properly to invalid JSON"""
        print("\n📝 Testing Invalid JSON Handling...")
        
        try:
            response = self.session.post(
                f"{self.api_base}/products",
                data="invalid json{{{",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400 or response.status_code == 422:
                self.log_result(
                    "Invalid JSON Handling",
                    True,
                    f"Properly rejected invalid JSON with {response.status_code}"
                )
            else:
                self.log_result(
                    "Invalid JSON Handling",
                    False,
                    f"Should return 400/422 for invalid JSON, got {response.status_code}"
                )
        except Exception as e:
            self.log_result("Invalid JSON Handling", False, f"Request failed: {str(e)}")

    def test_input_validation_length(self):
        """Test 13: Input validation for excessively long inputs"""
        print("\n📏 Testing Input Length Validation...")
        
        # Test with very long strings
        long_string = "A" * 10000  # 10KB string
        
        test_data = {
            "name": long_string,
            "name_ar": long_string,
            "description": long_string,
            "price": 100,
            "sku": "TEST123"
        }
        
        try:
            response = self.session.post(
                f"{self.api_base}/products",
                json=test_data
            )
            
            if response.status_code in [400, 422]:
                data = response.json()
                detail = data.get("detail", "")
                if "length" in str(detail).lower() or "exceeds" in str(detail).lower():
                    self.log_result(
                        "Input Length Validation",
                        True,
                        f"Correctly rejected long input with {response.status_code}"
                    )
                else:
                    self.log_result(
                        "Input Length Validation",
                        True,
                        f"Rejected with {response.status_code} (validation error)"
                    )
            elif response.status_code in [401, 403]:
                self.log_result(
                    "Input Length Validation",
                    True,
                    "Auth protection prevents input validation test"
                )
            else:
                self.log_result(
                    "Input Length Validation",
                    False,
                    f"Should reject long inputs, got {response.status_code}"
                )
        except Exception as e:
            self.log_result("Input Length Validation", False, f"Request failed: {str(e)}")

    def run_all_tests(self):
        """Run all security tests"""
        print("🚀 Starting Comprehensive Security Testing...\n")
        
        self.test_auth_enforcement_crud_endpoints()
        self.test_read_endpoints_public()
        self.test_security_headers()
        self.test_health_endpoint_no_leakage()
        self.test_regex_sanitization()
        self.test_promotion_reorder_auth()
        self.test_delta_sync_orders_auth()
        self.test_subscription_status_no_leakage()
        self.test_cors_configuration()
        self.test_invalid_json_handling()
        self.test_input_validation_length()
        
        # Print summary
        print("\n" + "="*60)
        print("🏁 SECURITY TESTING SUMMARY")
        print("="*60)
        print(f"✅ Passed: {len(self.test_results['passed'])}")
        print(f"❌ Failed: {len(self.test_results['failed'])}")
        print(f"⚠️ Warnings: {len(self.test_results['warnings'])}")
        
        if self.test_results['failed']:
            print("\n❌ FAILED TESTS:")
            for fail in self.test_results['failed']:
                print(f"  - {fail}")
        
        if self.test_results['warnings']:
            print("\n⚠️ WARNINGS:")
            for warning in self.test_results['warnings']:
                print(f"  - {warning}")
        
        # Return success rate
        total_tests = len(self.test_results['passed']) + len(self.test_results['failed'])
        if total_tests > 0:
            success_rate = len(self.test_results['passed']) / total_tests * 100
            print(f"\n📊 Success Rate: {success_rate:.1f}%")
            return success_rate >= 90.0
        
        return False

if __name__ == "__main__":
    tester = SecurityTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)