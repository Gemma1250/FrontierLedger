"""
Backend tests for Premium Tier features
Tests: Premium subscription, Stripe checkout, org limits, analytics (premium-gated), exports (premium-gated)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL not set", allow_module_level=True)

# Test data
TEST_USER = "TEST_PremiumUser"
TEST_ORG_1 = "TEST_Org_One"
TEST_ORG_2 = "TEST_Org_Two"
TEST_ORG_3 = "TEST_Org_Three"

# Global state
user_token = None
user_id = None
org_1_id = None
org_2_id = None


class TestPremiumSubscription:
    """Premium subscription endpoint tests"""
    
    def test_01_login_user(self):
        """Login with mock Discord to get token"""
        global user_token, user_id
        response = requests.post(f"{BASE_URL}/api/auth/mock-discord", json={
            "discord_username": TEST_USER
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        user_token = data["token"]
        user_id = data["user"]["id"]
        print(f"✓ User logged in - token: {user_token[:20]}...")
    
    def test_02_get_subscription_free_user(self):
        """GET /api/premium/subscription returns free plan for non-premium user"""
        response = requests.get(f"{BASE_URL}/api/premium/subscription",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_premium"] == False
        assert data["plan"] == "free"
        assert data["price"] == 5.0
        assert data["org_limit"] == 2
        assert data["owned_orgs"] == 0
        assert data["premium_until"] == ""
        print(f"✓ Free plan subscription info: {data}")
    
    def test_03_create_checkout_session(self):
        """POST /api/premium/checkout creates Stripe checkout session"""
        response = requests.post(f"{BASE_URL}/api/premium/checkout",
            json={"origin_url": "https://faction-stores.preview.emergentagent.com"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://")
        assert len(data["session_id"]) > 0
        print(f"✓ Checkout session created - session_id: {data['session_id'][:20]}...")


class TestOrgLimits:
    """Test free tier organization limits (max 2 owned orgs)"""
    
    def test_01_create_first_org(self):
        """Create first organization - should succeed"""
        global org_1_id
        response = requests.post(f"{BASE_URL}/api/organizations",
            json={"name": TEST_ORG_1, "description": "First test org"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == TEST_ORG_1
        org_1_id = data["id"]
        print(f"✓ First org created - ID: {org_1_id}")
    
    def test_02_create_second_org(self):
        """Create second organization - should succeed (at limit)"""
        global org_2_id
        response = requests.post(f"{BASE_URL}/api/organizations",
            json={"name": TEST_ORG_2, "description": "Second test org"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == TEST_ORG_2
        org_2_id = data["id"]
        print(f"✓ Second org created - ID: {org_2_id}")
    
    def test_03_verify_subscription_shows_2_orgs(self):
        """Verify subscription endpoint shows 2 owned orgs"""
        response = requests.get(f"{BASE_URL}/api/premium/subscription",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["owned_orgs"] == 2
        assert data["org_limit"] == 2
        print(f"✓ Subscription shows 2/2 orgs")
    
    def test_04_create_third_org_should_fail(self):
        """Create third organization - should fail with 403 (limit reached)"""
        response = requests.post(f"{BASE_URL}/api/organizations",
            json={"name": TEST_ORG_3, "description": "Third test org"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "limit reached" in data["detail"].lower()
        assert "2" in data["detail"]
        assert "free" in data["detail"].lower()
        print(f"✓ Third org creation blocked - {data['detail']}")


class TestAnalyticsPremiumGate:
    """Test analytics endpoints require premium (403 for free users)"""
    
    def test_01_analytics_inventory_requires_premium(self):
        """GET /api/organizations/{org_id}/analytics/inventory returns 403 for free user"""
        response = requests.get(f"{BASE_URL}/api/organizations/{org_1_id}/analytics/inventory",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "premium" in data["detail"].lower()
        print(f"✓ Analytics inventory blocked for free user - {data['detail']}")
    
    def test_02_analytics_treasury_requires_premium(self):
        """GET /api/organizations/{org_id}/analytics/treasury returns 403 for free user"""
        response = requests.get(f"{BASE_URL}/api/organizations/{org_1_id}/analytics/treasury",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "premium" in data["detail"].lower()
        print(f"✓ Analytics treasury blocked for free user - {data['detail']}")
    
    def test_03_analytics_crops_requires_premium(self):
        """GET /api/organizations/{org_id}/analytics/crops returns 403 for free user"""
        response = requests.get(f"{BASE_URL}/api/organizations/{org_1_id}/analytics/crops",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "premium" in data["detail"].lower()
        print(f"✓ Analytics crops blocked for free user - {data['detail']}")


class TestExportPremiumGate:
    """Test export endpoints require premium (403 for free users)"""
    
    def test_01_export_inventory_requires_premium(self):
        """GET /api/organizations/{org_id}/export/inventory returns 403 for free user"""
        response = requests.get(f"{BASE_URL}/api/organizations/{org_1_id}/export/inventory",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "premium" in data["detail"].lower()
        print(f"✓ Export inventory blocked for free user - {data['detail']}")
    
    def test_02_export_treasury_requires_premium(self):
        """GET /api/organizations/{org_id}/export/treasury returns 403 for free user"""
        response = requests.get(f"{BASE_URL}/api/organizations/{org_1_id}/export/treasury",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "premium" in data["detail"].lower()
        print(f"✓ Export treasury blocked for free user - {data['detail']}")


class TestExistingFeaturesStillWork:
    """Verify existing features still work after premium feature addition"""
    
    def test_01_create_inventory_item(self):
        """Create inventory item in org - should still work"""
        response = requests.post(f"{BASE_URL}/api/organizations/{org_1_id}/inventory",
            json={
                "name": "TEST_Premium_Corn",
                "category": "food",
                "quantity": 50,
                "storage_location": "Barn A"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Premium_Corn"
        print(f"✓ Inventory creation still works")
    
    def test_02_create_treasury_transaction(self):
        """Create treasury transaction - should still work"""
        response = requests.post(f"{BASE_URL}/api/organizations/{org_1_id}/treasury",
            json={
                "type": "deposit",
                "amount": 200.0,
                "category": "sales",
                "description": "Premium test deposit"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 200.0
        print(f"✓ Treasury transactions still work")
    
    def test_03_create_crop(self):
        """Create crop - should still work"""
        response = requests.post(f"{BASE_URL}/api/organizations/{org_1_id}/crops",
            json={
                "name": "TEST_Premium_Wheat",
                "location": "Field B",
                "estimated_harvest_days": 7
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Premium_Wheat"
        print(f"✓ Crop creation still works")
    
    def test_04_get_org_stats(self):
        """Get organization stats - should still work"""
        response = requests.get(f"{BASE_URL}/api/organizations/{org_1_id}/stats",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "inventory_count" in data
        assert "treasury_balance" in data
        assert data["inventory_count"] >= 1
        print(f"✓ Org stats still work - {data['inventory_count']} items, ${data['treasury_balance']} balance")
