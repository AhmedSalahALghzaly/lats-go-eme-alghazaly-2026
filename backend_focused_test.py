#!/usr/bin/env python3
"""
Focused Backend API Testing for Al-Ghazaly Auto Parts API
Testing specific endpoints that were fixed to return 403 instead of 405/404
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any

# Test Configuration - Using backend URL
BASE_URL = "http://localhost:8001/api"  # Backend running on port 8001

class FocusedAPITester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def setup_session(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
    
    async def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if headers is None:
                headers = {}
            
            if method.upper() == "GET":
                async with self.session.get(url, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        response_data = await response.json() if response_text else {}
                    except:
                        response_data = {"raw_response": response_text}
                    return {
                        "status": response.status,
                        "data": response_data,
                        "headers": dict(response.headers)
                    }
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        response_data = await response.json() if response_text else {}
                    except:
                        response_data = {"raw_response": response_text}
                    return {
                        "status": response.status,
                        "data": response_data,
                        "headers": dict(response.headers)
                    }
            elif method.upper() == "PUT":
                async with self.session.put(url, json=data, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        response_data = await response.json() if response_text else {}
                    except:
                        response_data = {"raw_response": response_text}
                    return {
                        "status": response.status,
                        "data": response_data,
                        "headers": dict(response.headers)
                    }
            elif method.upper() == "PATCH":
                async with self.session.patch(url, json=data, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        response_data = await response.json() if response_text else {}
                    except:
                        response_data = {"raw_response": response_text}
                    return {
                        "status": response.status,
                        "data": response_data,
                        "headers": dict(response.headers)
                    }
            elif method.upper() == "DELETE":
                async with self.session.delete(url, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        response_data = await response.json() if response_text else {}
                    except:
                        response_data = {"raw_response": response_text}
                    return {
                        "status": response.status,
                        "data": response_data,
                        "headers": dict(response.headers)
                    }
        except Exception as e:
            return {
                "status": 0,
                "data": {"error": str(e)},
                "headers": {}
            }
    
    async def test_admin_endpoints(self):
        """Test Admin endpoints - should return 403 for unauthenticated requests"""
        print("\n=== Testing Admin Endpoints ===")
        
        # Test GET /api/admins - should return 403 (Access denied)
        response = await self.make_request("GET", "/admins")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("GET /api/admins (unauthenticated)", success, details, response["data"])
        
        # Test POST /api/admins - should return 403 (Access denied)
        admin_data = {"email": "test@admin.com", "name": "Test Admin"}
        response = await self.make_request("POST", "/admins", admin_data)
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("POST /api/admins (unauthenticated)", success, details, response["data"])
        
        # Test GET /api/admins/{admin_id} - should return 403 (Access denied) NOT 405
        test_admin_id = "test_admin_123"
        response = await self.make_request("GET", f"/admins/{test_admin_id}")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if response["status"] == 405:
            details += " - CRITICAL: Returns 405 Method Not Allowed instead of 403 Access denied"
        elif not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("GET /api/admins/{admin_id} (unauthenticated)", success, details, response["data"])
        
        # Test PUT /api/admins/{admin_id} - should return 403 (Access denied) NOT 405
        update_data = {"email": "updated@admin.com", "name": "Updated Admin"}
        response = await self.make_request("PUT", f"/admins/{test_admin_id}", update_data)
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if response["status"] == 405:
            details += " - CRITICAL: Returns 405 Method Not Allowed instead of 403 Access denied"
        elif not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("PUT /api/admins/{admin_id} (unauthenticated)", success, details, response["data"])
        
        # Test DELETE /api/admins/{admin_id} - should return 403 (Access denied)
        response = await self.make_request("DELETE", f"/admins/{test_admin_id}")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("DELETE /api/admins/{admin_id} (unauthenticated)", success, details, response["data"])
    
    async def test_collections_endpoint(self):
        """Test Collections endpoint - should return 403 for unauthenticated requests"""
        print("\n=== Testing Collections Endpoint ===")
        
        # Test GET /api/collections - should return 403 (Access denied) NOT 404
        response = await self.make_request("GET", "/collections")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if response["status"] == 404:
            details += " - CRITICAL: Returns 404 Not Found instead of 403 Access denied"
        elif not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("GET /api/collections (unauthenticated)", success, details, response["data"])
    
    async def test_subscription_requests_endpoints(self):
        """Test Subscription Requests endpoints"""
        print("\n=== Testing Subscription Requests Endpoints ===")
        
        # Test GET /api/subscription-requests - should return 403 (Access denied)
        response = await self.make_request("GET", "/subscription-requests")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("GET /api/subscription-requests (unauthenticated)", success, details, response["data"])
        
        # Test POST /api/subscription-requests - should accept subscription request data (no auth required)
        subscription_data = {
            "customer_name": "Test Customer",
            "email": "test@customer.com",
            "phone": "+1234567890",
            "governorate": "Test Governorate",
            "village": "Test Village",
            "address": "Test Address",
            "car_model": "Test Car Model"
        }
        response = await self.make_request("POST", "/subscription-requests", subscription_data)
        expected_status = 201
        success = response["status"] in [200, 201]
        details = f"Status: {response['status']} (Expected: 200/201)"
        if success and "id" in response["data"]:
            details += f", Created request ID: {response['data']['id']}"
        self.log_result("POST /api/subscription-requests (no auth)", success, details, response["data"])
        
        # Test PATCH /api/subscription-requests/{id}/approve - should return 403 (Access denied)
        test_request_id = "test_request_123"
        response = await self.make_request("PATCH", f"/subscription-requests/{test_request_id}/approve")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("PATCH /api/subscription-requests/{id}/approve (unauthenticated)", success, details, response["data"])
    
    async def test_analytics_endpoints(self):
        """Test Analytics endpoints"""
        print("\n=== Testing Analytics Endpoints ===")
        
        # Test GET /api/analytics/overview - should return 403 (Access denied)
        response = await self.make_request("GET", "/analytics/overview")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("GET /api/analytics/overview (unauthenticated)", success, details, response["data"])
    
    async def test_subscribers_endpoints(self):
        """Test Subscribers endpoints"""
        print("\n=== Testing Subscribers Endpoints ===")
        
        # Test GET /api/subscribers - should return 403 (Access denied)
        response = await self.make_request("GET", "/subscribers")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("GET /api/subscribers (unauthenticated)", success, details, response["data"])
    
    async def test_customers_endpoints(self):
        """Test Customers endpoints"""
        print("\n=== Testing Customers Endpoints ===")
        
        # Test PATCH /api/customers/admin/customer/{id}/orders/mark-viewed - should return 403 (Access denied)
        test_customer_id = "test_customer_123"
        response = await self.make_request("PATCH", f"/customers/admin/customer/{test_customer_id}/orders/mark-viewed")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("PATCH /api/customers/admin/customer/{id}/orders/mark-viewed (unauthenticated)", success, details, response["data"])
        
        # Test DELETE /api/customers/{id} - should return 403 (Access denied)
        response = await self.make_request("DELETE", f"/customers/{test_customer_id}")
        expected_status = 403
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if not success:
            details += f" - Should return 403 Access denied, not {response['status']}"
        self.log_result("DELETE /api/customers/{id} (unauthenticated)", success, details, response["data"])
    
    async def test_public_endpoints(self):
        """Test public endpoints that should work without authentication"""
        print("\n=== Testing Public Endpoints ===")
        
        # Test GET /api/car-brands - should return car brands list
        response = await self.make_request("GET", "/car-brands")
        expected_status = 200
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if success and isinstance(response["data"], list):
            details += f", Found {len(response['data'])} car brands"
        self.log_result("GET /api/car-brands (public)", success, details)
        
        # Test GET /api/products - should return products list
        response = await self.make_request("GET", "/products")
        expected_status = 200
        success = response["status"] == expected_status
        details = f"Status: {response['status']} (Expected: {expected_status})"
        if success and isinstance(response["data"], list):
            details += f", Found {len(response['data'])} products"
        self.log_result("GET /api/products (public)", success, details)
    
    async def run_all_tests(self):
        """Run all focused API tests"""
        print("🚀 Starting Focused Backend API Testing for Al-Ghazaly Auto Parts")
        print(f"Testing URL: {BASE_URL}")
        print("Focus: Testing endpoints that should return 403 (not 405/404) for unauthenticated requests")
        print("=" * 80)
        
        await self.setup_session()
        
        try:
            # Run all test suites
            await self.test_admin_endpoints()
            await self.test_collections_endpoint()
            await self.test_subscription_requests_endpoints()
            await self.test_analytics_endpoints()
            await self.test_subscribers_endpoints()
            await self.test_customers_endpoints()
            await self.test_public_endpoints()
            
        finally:
            await self.cleanup_session()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("📊 FOCUSED API TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Categorize failures
        critical_failures = []
        other_failures = []
        
        for result in self.test_results:
            if not result["success"]:
                if "405 Method Not Allowed" in result["details"] or "404 Not Found" in result["details"]:
                    critical_failures.append(result)
                else:
                    other_failures.append(result)
        
        if critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(critical_failures)}) - Endpoints returning wrong status codes:")
            for result in critical_failures:
                print(f"  • {result['test']}: {result['details']}")
        
        if other_failures:
            print(f"\n❌ OTHER FAILURES ({len(other_failures)}):")
            for result in other_failures:
                print(f"  • {result['test']}: {result['details']}")
        
        if passed_tests > 0:
            print(f"\n✅ PASSED TESTS ({passed_tests}):")
            for result in self.test_results:
                if result["success"]:
                    print(f"  • {result['test']}")
        
        print("\n" + "=" * 80)
        print("🎯 ENDPOINTS TESTED:")
        print("• GET /api/admins/{admin_id} - Should return 403 (not 405)")
        print("• PUT /api/admins/{admin_id} - Should return 403 (not 405)")
        print("• GET /api/collections - Should return 403 (not 404)")
        print("• GET /api/subscription-requests - Should return 403")
        print("• POST /api/subscription-requests - Should accept data")
        print("• PATCH /api/subscription-requests/{id}/approve - Should return 403")
        print("• GET /api/analytics/overview - Should return 403")
        print("• GET /api/subscribers - Should return 403")
        print("• PATCH /api/customers/admin/customer/{id}/orders/mark-viewed - Should return 403")
        print("• DELETE /api/customers/{id} - Should return 403")
        print("• GET /api/admins - Should return 403")
        print("• POST /api/admins - Should return 403")
        print("• DELETE /api/admins/{id} - Should return 403")
        print("• GET /api/car-brands - Should return 200 (public)")
        print("• GET /api/products - Should return 200 (public)")
        
        # Overall assessment
        if len(critical_failures) == 0:
            print(f"\n🎉 CRITICAL ISSUES: RESOLVED!")
            print("All endpoints now return correct status codes (403 instead of 405/404)")
        else:
            print(f"\n🚨 CRITICAL ISSUES: {len(critical_failures)} endpoints still return wrong status codes")
            print("These need immediate attention from the main agent")

async def main():
    """Main test execution"""
    tester = FocusedAPITester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())