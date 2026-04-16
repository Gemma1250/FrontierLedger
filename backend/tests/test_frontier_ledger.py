"""
Comprehensive backend tests for Frontier Ledger API
Tests: Auth (mock Discord + email), Organizations, Inventory, Treasury, Crops, Assets, Tasks, Audit, Roles
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL not set", allow_module_level=True)

# Test data
TEST_DISCORD_USER = "TEST_RangerBot"
TEST_EMAIL_USER = {
    "username": "TEST_EmailRanger",
    "email": "test_email_ranger@frontier.test",
    "password": "testpass123"
}
TEST_ORG_NAME = "TEST_Moonrest_Ranch"
TEST_INVITE_CODE = ""

# Global state
discord_token = None
email_token = None
org_id = None
inventory_item_id = None
crop_id = None
asset_id = None
task_id = None


class TestHealth:
    """Health check endpoint"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
        print("✓ Health check passed")


class TestAuthMockDiscord:
    """Mock Discord authentication flow"""
    
    def test_mock_discord_login_new_user(self):
        global discord_token
        response = requests.post(f"{BASE_URL}/api/auth/mock-discord", json={
            "discord_username": TEST_DISCORD_USER
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["discord_username"] == TEST_DISCORD_USER
        discord_token = data["token"]
        print(f"✓ Mock Discord login successful - token: {discord_token[:20]}...")
    
    def test_mock_discord_login_existing_user(self):
        response = requests.post(f"{BASE_URL}/api/auth/mock-discord", json={
            "discord_username": TEST_DISCORD_USER
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["discord_username"] == TEST_DISCORD_USER
        print("✓ Mock Discord login for existing user works")
    
    def test_get_me_with_discord_token(self):
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {discord_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["discord_username"] == TEST_DISCORD_USER
        print("✓ /auth/me works with Discord token")


class TestAuthEmail:
    """Email/password authentication flow"""
    
    def test_email_register(self):
        global email_token
        response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_EMAIL_USER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL_USER["email"]
        assert data["user"]["username"] == TEST_EMAIL_USER["username"]
        assert "password_hash" not in data["user"]
        email_token = data["token"]
        print(f"✓ Email registration successful - token: {email_token[:20]}...")
    
    def test_email_register_duplicate(self):
        response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_EMAIL_USER)
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()
        print("✓ Duplicate email registration blocked")
    
    def test_email_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL_USER["email"],
            "password": TEST_EMAIL_USER["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == TEST_EMAIL_USER["email"]
        print("✓ Email login successful")
    
    def test_email_login_wrong_password(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL_USER["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Wrong password rejected")
    
    def test_email_login_nonexistent_user(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "password"
        })
        assert response.status_code == 401
        print("✓ Nonexistent user login rejected")


class TestOrganizations:
    """Organization CRUD and join flow"""
    
    def test_create_organization(self):
        global org_id
        response = requests.post(f"{BASE_URL}/api/organizations", 
            json={"name": TEST_ORG_NAME, "description": "Test RP group"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == TEST_ORG_NAME
        assert "invite_code" in data
        assert len(data["members"]) == 1
        assert data["members"][0]["role"] == "leader"
        org_id = data["id"]
        global TEST_INVITE_CODE
        TEST_INVITE_CODE = data["invite_code"]
        print(f"✓ Organization created - ID: {org_id}, Invite: {TEST_INVITE_CODE}")
    
    def test_list_organizations(self):
        response = requests.get(f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(org["id"] == org_id for org in data)
        print(f"✓ List organizations - found {len(data)} orgs")
    
    def test_get_organization(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == org_id
        assert data["name"] == TEST_ORG_NAME
        print("✓ Get organization by ID works")
    
    def test_join_organization_with_invite(self):
        response = requests.post(f"{BASE_URL}/api/organizations/join",
            json={"invite_code": TEST_INVITE_CODE},
            headers={"Authorization": f"Bearer {email_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["members"]) == 2
        print("✓ Join organization with invite code works")
    
    def test_join_organization_invalid_code(self):
        response = requests.post(f"{BASE_URL}/api/organizations/join",
            json={"invite_code": "INVALID"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 404
        print("✓ Invalid invite code rejected")


class TestInventory:
    """Inventory CRUD and quick update"""
    
    def test_create_inventory_item(self):
        global inventory_item_id
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/inventory",
            json={
                "name": "TEST_Corn",
                "category": "food",
                "quantity": 10,
                "storage_location": "Main Barn",
                "notes": "Fresh harvest"
            },
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Corn"
        assert data["quantity"] == 10
        assert data["category"] == "food"
        inventory_item_id = data["id"]
        print(f"✓ Inventory item created - ID: {inventory_item_id}")
    
    def test_list_inventory(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/inventory",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ List inventory - found {len(data)} items")
    
    def test_quick_update_plus_one(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/inventory/{inventory_item_id}/quick-update",
            json={"amount": 1},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 11
        print("✓ Quick update +1 works")
    
    def test_quick_update_plus_five(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/inventory/{inventory_item_id}/quick-update",
            json={"amount": 5},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 16
        print("✓ Quick update +5 works")
    
    def test_quick_update_minus_one(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/inventory/{inventory_item_id}/quick-update",
            json={"amount": -1},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 15
        print("✓ Quick update -1 works")
    
    def test_quick_update_minus_five(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/inventory/{inventory_item_id}/quick-update",
            json={"amount": -5},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 10
        print("✓ Quick update -5 works")
    
    def test_update_inventory_item(self):
        response = requests.put(f"{BASE_URL}/api/organizations/{org_id}/inventory/{inventory_item_id}",
            json={"quantity": 20, "notes": "Updated notes"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 20
        assert data["notes"] == "Updated notes"
        print("✓ Update inventory item works")
    
    def test_delete_inventory_item(self):
        response = requests.delete(f"{BASE_URL}/api/organizations/{org_id}/inventory/{inventory_item_id}",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        print("✓ Delete inventory item works")


class TestTreasury:
    """Treasury transactions and balance"""
    
    def test_get_initial_balance(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/treasury/balance",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "total_deposits" in data
        assert "total_withdrawals" in data
        print(f"✓ Initial balance: ${data['balance']}")
    
    def test_create_deposit(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/treasury",
            json={
                "type": "deposit",
                "amount": 100.50,
                "category": "sales",
                "description": "Sold hides at market"
            },
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "deposit"
        assert data["amount"] == 100.50
        print("✓ Deposit transaction created")
    
    def test_create_withdrawal(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/treasury",
            json={
                "type": "withdrawal",
                "amount": 25.00,
                "category": "supplies",
                "description": "Bought seeds"
            },
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "withdrawal"
        assert data["amount"] == 25.00
        print("✓ Withdrawal transaction created")
    
    def test_get_balance_after_transactions(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/treasury/balance",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["balance"] == 75.50
        assert data["total_deposits"] == 100.50
        assert data["total_withdrawals"] == 25.00
        print(f"✓ Balance after transactions: ${data['balance']}")
    
    def test_list_transactions(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/treasury",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        print(f"✓ List transactions - found {len(data)} transactions")


class TestCrops:
    """Crops CRUD and harvest"""
    
    def test_plant_crop(self):
        global crop_id
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/crops",
            json={
                "name": "TEST_Wheat",
                "location": "North Field",
                "notes": "Spring planting",
                "estimated_harvest_days": 7
            },
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Wheat"
        assert data["status"] == "planted"
        assert "estimated_harvest" in data
        crop_id = data["id"]
        print(f"✓ Crop planted - ID: {crop_id}")
    
    def test_list_crops(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/crops",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ List crops - found {len(data)} crops")
    
    def test_update_crop(self):
        response = requests.put(f"{BASE_URL}/api/organizations/{org_id}/crops/{crop_id}",
            json={"status": "growing", "notes": "Growing well"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "growing"
        print("✓ Update crop works")
    
    def test_harvest_crop(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/crops/{crop_id}/harvest",
            json={},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "harvested"
        assert "harvested_at" in data
        print("✓ Harvest crop works")
    
    def test_delete_crop(self):
        response = requests.delete(f"{BASE_URL}/api/organizations/{org_id}/crops/{crop_id}",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        print("✓ Delete crop works")


class TestAssets:
    """Assets CRUD"""
    
    def test_create_asset(self):
        global asset_id
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/assets",
            json={
                "name": "TEST_Covered_Wagon",
                "category": "wagons",
                "assigned_to": "John",
                "condition": "good",
                "value": 500.00,
                "location": "Main Camp",
                "notes": "Needs new wheels soon"
            },
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Covered_Wagon"
        assert data["value"] == 500.00
        asset_id = data["id"]
        print(f"✓ Asset created - ID: {asset_id}")
    
    def test_list_assets(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/assets",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ List assets - found {len(data)} assets")
    
    def test_update_asset(self):
        response = requests.put(f"{BASE_URL}/api/organizations/{org_id}/assets/{asset_id}",
            json={"condition": "fair", "notes": "Wheels replaced"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["condition"] == "fair"
        print("✓ Update asset works")
    
    def test_delete_asset(self):
        response = requests.delete(f"{BASE_URL}/api/organizations/{org_id}/assets/{asset_id}",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        print("✓ Delete asset works")


class TestTasks:
    """Tasks CRUD and completion"""
    
    def test_create_task(self):
        global task_id
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/tasks",
            json={
                "title": "TEST_Water_the_crops",
                "description": "Water all fields",
                "assigned_to": "Sarah",
                "priority": "high"
            },
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Water_the_crops"
        assert data["status"] == "pending"
        assert data["priority"] == "high"
        task_id = data["id"]
        print(f"✓ Task created - ID: {task_id}")
    
    def test_list_tasks(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/tasks",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ List tasks - found {len(data)} tasks")
    
    def test_complete_task(self):
        response = requests.put(f"{BASE_URL}/api/organizations/{org_id}/tasks/{task_id}",
            json={"status": "completed"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None
        print("✓ Complete task works")
    
    def test_delete_task(self):
        response = requests.delete(f"{BASE_URL}/api/organizations/{org_id}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        print("✓ Delete task works")


class TestAuditLog:
    """Audit log retrieval"""
    
    def test_get_audit_log(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/audit-log",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check audit log structure
        log_entry = data[0]
        assert "action" in log_entry
        assert "entity_type" in log_entry
        assert "username" in log_entry
        assert "details" in log_entry
        print(f"✓ Audit log retrieved - {len(data)} entries")


class TestStats:
    """Organization stats"""
    
    def test_get_org_stats(self):
        response = requests.get(f"{BASE_URL}/api/organizations/{org_id}/stats",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "inventory_count" in data
        assert "treasury_balance" in data
        assert "active_crops" in data
        assert "asset_count" in data
        assert "pending_tasks" in data
        assert "member_count" in data
        assert data["member_count"] == 2
        print(f"✓ Stats retrieved - {data['member_count']} members, ${data['treasury_balance']} balance")


class TestRoles:
    """Role management"""
    
    def test_update_member_role_as_leader(self):
        # Get email user's user_id from org members
        org_response = requests.get(f"{BASE_URL}/api/organizations/{org_id}",
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        org_data = org_response.json()
        email_member = [m for m in org_data["members"] if m["username"] == TEST_EMAIL_USER["username"]][0]
        
        response = requests.put(f"{BASE_URL}/api/organizations/{org_id}/members/{email_member['user_id']}/role",
            json={"role": "officer"},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        print("✓ Leader can update member role")
    
    def test_update_member_role_as_non_leader(self):
        # Try to update role as email user (now officer, not leader)
        org_response = requests.get(f"{BASE_URL}/api/organizations/{org_id}",
            headers={"Authorization": f"Bearer {email_token}"}
        )
        org_data = org_response.json()
        discord_member = [m for m in org_data["members"] if m["username"] == TEST_DISCORD_USER][0]
        
        response = requests.put(f"{BASE_URL}/api/organizations/{org_id}/members/{discord_member['user_id']}/role",
            json={"role": "member"},
            headers={"Authorization": f"Bearer {email_token}"}
        )
        assert response.status_code == 403
        print("✓ Non-leader cannot update member role")


class TestDiscordWebhook:
    """Discord webhook mock"""
    
    def test_discord_webhook_test(self):
        response = requests.post(f"{BASE_URL}/api/organizations/{org_id}/discord/webhook-test",
            json={},
            headers={"Authorization": f"Bearer {discord_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Discord webhook test - status: {data['status']}")
