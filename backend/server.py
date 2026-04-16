from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
from urllib.parse import urlencode

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'frontier_ledger')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'frontier-ledger-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 72

# Discord Config
DISCORD_CLIENT_ID = os.environ.get('DISCORD_CLIENT_ID', '')
DISCORD_CLIENT_SECRET = os.environ.get('DISCORD_CLIENT_SECRET', '')
DISCORD_BOT_TOKEN = os.environ.get('DISCORD_BOT_TOKEN', '')
DISCORD_GUILD_ID = os.environ.get('DISCORD_GUILD_ID', '')
DISCORD_REDIRECT_URI = os.environ.get('DISCORD_REDIRECT_URI', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

app = FastAPI(title="Frontier Ledger API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class MockDiscordLogin(BaseModel):
    discord_username: str
    discord_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:18])

class OrgCreate(BaseModel):
    name: str
    description: str = ""

class OrgJoin(BaseModel):
    invite_code: str

class InventoryItemCreate(BaseModel):
    name: str
    category: str = "general"
    quantity: int = 0
    storage_location: str = ""
    notes: str = ""

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    reserved: Optional[bool] = None

class QuickUpdate(BaseModel):
    amount: int

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str = "general"
    description: str = ""

class CropCreate(BaseModel):
    name: str
    location: str = ""
    notes: str = ""
    estimated_harvest_days: int = 7

class CropUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    yield_amount: Optional[int] = None

class AssetCreate(BaseModel):
    name: str
    category: str = "general"
    assigned_to: str = ""
    condition: str = "good"
    value: float = 0
    location: str = ""
    notes: str = ""

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    condition: Optional[str] = None
    value: Optional[float] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assigned_to: str = ""
    priority: str = "medium"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None

class RoleUpdate(BaseModel):
    role: str

# ============ AUTH HELPERS ============

def create_token(user_id: str, username: str):
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def log_audit(org_id, user_id, username, action, entity_type, entity_id, details):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "user_id": user_id,
        "username": username,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/mock-discord")
async def mock_discord_login(data: MockDiscordLogin):
    user = await db.users.find_one({"discord_username": data.discord_username}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "username": data.discord_username,
            "email": f"{data.discord_username.lower().replace(' ', '_')}@discord.mock",
            "discord_id": data.discord_id,
            "discord_username": data.discord_username,
            "discord_avatar": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        user.pop('_id', None)
    token = create_token(user['id'], user['username'])
    return {"token": token, "user": {k: v for k, v in user.items() if k != 'password_hash'}}

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = {
        "id": str(uuid.uuid4()),
        "username": data.username,
        "email": data.email,
        "password_hash": hashed,
        "discord_id": "",
        "discord_username": "",
        "discord_avatar": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    user.pop('_id', None)
    safe = {k: v for k, v in user.items() if k != 'password_hash'}
    token = create_token(user['id'], user['username'])
    return {"token": token, "user": safe}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get('password_hash') or not bcrypt.checkpw(data.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    safe = {k: v for k, v in user.items() if k != 'password_hash'}
    token = create_token(user['id'], user['username'])
    return {"token": token, "user": safe}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != 'password_hash'}

# ============ REAL DISCORD OAUTH2 ============

@api_router.get("/auth/discord/url")
async def get_discord_auth_url():
    """Returns the Discord OAuth2 authorization URL"""
    if not DISCORD_CLIENT_ID or not DISCORD_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Discord not configured")
    params = urlencode({
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify guilds",
    })
    return {"url": f"https://discord.com/api/oauth2/authorize?{params}"}

@api_router.get("/auth/discord/callback")
async def discord_callback(code: str = Query(...)):
    """Handle Discord OAuth2 callback - exchanges code for token, creates user, redirects to frontend"""
    try:
        # Exchange code for access token
        async with httpx.AsyncClient() as http:
            token_resp = await http.post("https://discord.com/api/oauth2/token", data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
            }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=10)

            if token_resp.status_code != 200:
                logger.error(f"Discord token exchange failed: {token_resp.text}")
                return RedirectResponse(f"{FRONTEND_URL}/?discord_error=token_exchange_failed")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            # Get user info from Discord
            user_resp = await http.get("https://discord.com/api/users/@me", headers={
                "Authorization": f"Bearer {access_token}"
            }, timeout=10)

            if user_resp.status_code != 200:
                logger.error(f"Discord user info failed: {user_resp.text}")
                return RedirectResponse(f"{FRONTEND_URL}/?discord_error=user_info_failed")

            discord_user = user_resp.json()

        # Create or find user in our DB
        discord_id = discord_user["id"]
        discord_username = discord_user.get("global_name") or discord_user.get("username", "Unknown")
        discord_avatar = discord_user.get("avatar", "")
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{discord_avatar}.png" if discord_avatar else ""

        user = await db.users.find_one({"discord_id": discord_id}, {"_id": 0})
        if not user:
            user = {
                "id": str(uuid.uuid4()),
                "username": discord_username,
                "email": f"{discord_id}@discord.user",
                "discord_id": discord_id,
                "discord_username": discord_username,
                "discord_avatar": avatar_url,
                "discord_access_token": access_token,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
            user.pop('_id', None)
        else:
            # Update existing user's Discord info
            await db.users.update_one({"discord_id": discord_id}, {"$set": {
                "discord_username": discord_username,
                "discord_avatar": avatar_url,
                "discord_access_token": access_token,
            }})
            user["discord_username"] = discord_username
            user["discord_avatar"] = avatar_url

        jwt_token = create_token(user['id'], user['username'])
        logger.info(f"Discord OAuth success for {discord_username} (ID: {discord_id})")

        # Redirect to frontend with token
        return RedirectResponse(f"{FRONTEND_URL}/?discord_token={jwt_token}")

    except httpx.TimeoutException:
        logger.error("Discord API timeout")
        return RedirectResponse(f"{FRONTEND_URL}/?discord_error=timeout")
    except Exception as e:
        logger.error(f"Discord OAuth error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/?discord_error=unknown")

# ============ DISCORD WEBHOOK HELPER ============

async def send_discord_webhook(org_id: str, content: str = None, embed: dict = None):
    """Send a message to the organization's Discord webhook"""
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        return
    webhook_url = org.get('discord_webhook_url', '')
    if not webhook_url:
        return
    try:
        payload = {}
        if content:
            payload["content"] = content
        if embed:
            payload["embeds"] = [embed]
        async with httpx.AsyncClient() as http:
            resp = await http.post(webhook_url, json=payload, timeout=5)
            if resp.status_code not in (200, 204):
                logger.warning(f"Webhook response {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Discord webhook error for org {org_id}: {e}")

def make_embed(title: str, description: str, color: int = 0xC5A059, fields: list = None):
    """Create a Discord embed object"""
    embed = {"title": title, "description": description, "color": color, "timestamp": datetime.now(timezone.utc).isoformat(), "footer": {"text": "Frontier Ledger"}}
    if fields:
        embed["fields"] = fields
    return embed

# ============ DISCORD SETTINGS ============

class DiscordSettings(BaseModel):
    discord_webhook_url: str = ""
    discord_guild_id: str = ""

@api_router.put("/organizations/{org_id}/discord-settings")
async def update_discord_settings(org_id: str, data: DiscordSettings, user=Depends(get_current_user)):
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    is_leader = any(m['user_id'] == user['id'] and m['role'] in ('leader', 'treasurer') for m in org.get('members', []))
    if not is_leader:
        raise HTTPException(status_code=403, detail="Only leaders can update Discord settings")
    await db.organizations.update_one({"id": org_id}, {"$set": {"discord_webhook_url": data.discord_webhook_url, "discord_guild_id": data.discord_guild_id}})
    await log_audit(org_id, user['id'], user['username'], 'updated', 'discord_settings', org_id, "Updated Discord webhook settings")
    return {"status": "updated"}

# ============ ORGANIZATION ENDPOINTS ============

@api_router.post("/organizations")
async def create_org(data: OrgCreate, user=Depends(get_current_user)):
    org = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "owner_id": user['id'],
        "invite_code": str(uuid.uuid4())[:8].upper(),
        "members": [{
            "user_id": user['id'],
            "username": user['username'],
            "role": "leader",
            "joined_at": datetime.now(timezone.utc).isoformat()
        }],
        "discord_webhook_url": "",
        "discord_guild_id": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.organizations.insert_one(org)
    org.pop('_id', None)
    return org

@api_router.get("/organizations")
async def list_orgs(user=Depends(get_current_user)):
    orgs = await db.organizations.find({"members.user_id": user['id']}, {"_id": 0}).to_list(100)
    return orgs

@api_router.get("/organizations/{org_id}")
async def get_org(org_id: str, user=Depends(get_current_user)):
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@api_router.post("/organizations/join")
async def join_org(data: OrgJoin, user=Depends(get_current_user)):
    org = await db.organizations.find_one({"invite_code": data.invite_code.upper()}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    for m in org.get('members', []):
        if m['user_id'] == user['id']:
            raise HTTPException(status_code=400, detail="Already a member")
    member = {
        "user_id": user['id'],
        "username": user['username'],
        "role": "member",
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    await db.organizations.update_one({"id": org['id']}, {"$push": {"members": member}})
    org['members'].append(member)
    return org

# ============ INVENTORY ENDPOINTS ============

@api_router.get("/organizations/{org_id}/inventory")
async def list_inventory(org_id: str, category: Optional[str] = None, user=Depends(get_current_user)):
    query = {"org_id": org_id}
    if category and category != "all":
        query["category"] = category
    items = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/organizations/{org_id}/inventory")
async def create_inventory_item(org_id: str, data: InventoryItemCreate, user=Depends(get_current_user)):
    item = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "name": data.name,
        "category": data.category,
        "quantity": data.quantity,
        "storage_location": data.storage_location,
        "notes": data.notes,
        "reserved": False,
        "last_updated_by": user['username'],
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.inventory.insert_one(item)
    item.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'created', 'inventory', item['id'], f"Added {data.name} x{data.quantity}")
    await send_discord_webhook(org_id, embed=make_embed("Inventory Updated", f"**{user['username']}** added **{data.name}** x{data.quantity}", 0xC5A059))
    return item

@api_router.put("/organizations/{org_id}/inventory/{item_id}")
async def update_inventory_item(org_id: str, item_id: str, data: InventoryItemUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['last_updated_by'] = user['username']
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.inventory.find_one_and_update(
        {"id": item_id, "org_id": org_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    result.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'updated', 'inventory', item_id, f"Updated: {str(update_data)}")
    return result

@api_router.post("/organizations/{org_id}/inventory/{item_id}/quick-update")
async def quick_update_inventory(org_id: str, item_id: str, data: QuickUpdate, user=Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id, "org_id": org_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    new_qty = max(0, item['quantity'] + data.amount)
    result = await db.inventory.find_one_and_update(
        {"id": item_id},
        {"$set": {"quantity": new_qty, "last_updated_by": user['username'], "updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True
    )
    result.pop('_id', None)
    sign = f"+{data.amount}" if data.amount > 0 else str(data.amount)
    await log_audit(org_id, user['id'], user['username'], 'quick_update', 'inventory', item_id, f"{item['name']} {sign} (now {new_qty})")
    await send_discord_webhook(org_id, embed=make_embed("Inventory Updated", f"**{user['username']}** updated **{item['name']}** {sign} (now {new_qty})", 0xC5A059))
    return result

@api_router.delete("/organizations/{org_id}/inventory/{item_id}")
async def delete_inventory_item(org_id: str, item_id: str, user=Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id, "org_id": org_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.inventory.delete_one({"id": item_id})
    await log_audit(org_id, user['id'], user['username'], 'deleted', 'inventory', item_id, f"Removed {item['name']}")
    return {"status": "deleted"}

# ============ TREASURY ENDPOINTS ============

@api_router.get("/organizations/{org_id}/treasury/balance")
async def get_treasury_balance(org_id: str, user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"org_id": org_id}},
        {"$group": {
            "_id": None,
            "deposits": {"$sum": {"$cond": [{"$eq": ["$type", "deposit"]}, "$amount", 0]}},
            "withdrawals": {"$sum": {"$cond": [{"$eq": ["$type", "withdrawal"]}, "$amount", 0]}},
        }}
    ]
    result = await db.treasury.aggregate(pipeline).to_list(1)
    if result:
        return {"balance": result[0]['deposits'] - result[0]['withdrawals'], "total_deposits": result[0]['deposits'], "total_withdrawals": result[0]['withdrawals']}
    return {"balance": 0, "total_deposits": 0, "total_withdrawals": 0}

@api_router.get("/organizations/{org_id}/treasury")
async def list_transactions(org_id: str, user=Depends(get_current_user)):
    txns = await db.treasury.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return txns

@api_router.post("/organizations/{org_id}/treasury")
async def create_transaction(org_id: str, data: TransactionCreate, user=Depends(get_current_user)):
    txn = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "type": data.type,
        "amount": data.amount,
        "category": data.category,
        "description": data.description,
        "created_by": user['username'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.treasury.insert_one(txn)
    txn.pop('_id', None)
    sign = "+" if data.type == "deposit" else "-"
    await log_audit(org_id, user['id'], user['username'], data.type, 'treasury', txn['id'], f"{sign}${data.amount} - {data.description}")
    color = 0x4A5D23 if data.type == "deposit" else 0xA23B2A
    await send_discord_webhook(org_id, embed=make_embed(f"Treasury {'Deposit' if data.type == 'deposit' else 'Withdrawal'}", f"**{user['username']}** {sign}${data.amount}\n{data.description}", color))
    return txn

# ============ CROP ENDPOINTS ============

@api_router.get("/organizations/{org_id}/crops")
async def list_crops(org_id: str, status: Optional[str] = None, user=Depends(get_current_user)):
    query = {"org_id": org_id}
    if status and status != "all":
        query["status"] = status
    crops = await db.crops.find(query, {"_id": 0}).to_list(500)
    return crops

@api_router.post("/organizations/{org_id}/crops")
async def create_crop(org_id: str, data: CropCreate, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    crop = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "name": data.name,
        "planted_by": user['username'],
        "location": data.location,
        "status": "planted",
        "planted_at": now.isoformat(),
        "estimated_harvest": (now + timedelta(days=data.estimated_harvest_days)).isoformat(),
        "yield_amount": 0,
        "notes": data.notes,
        "created_at": now.isoformat()
    }
    await db.crops.insert_one(crop)
    crop.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'planted', 'crop', crop['id'], f"Planted {data.name} at {data.location}")
    return crop

@api_router.put("/organizations/{org_id}/crops/{crop_id}")
async def update_crop(org_id: str, crop_id: str, data: CropUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.crops.find_one_and_update({"id": crop_id, "org_id": org_id}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Crop not found")
    result.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'updated', 'crop', crop_id, f"Updated: {str(update_data)}")
    return result

@api_router.post("/organizations/{org_id}/crops/{crop_id}/harvest")
async def harvest_crop(org_id: str, crop_id: str, user=Depends(get_current_user)):
    result = await db.crops.find_one_and_update(
        {"id": crop_id, "org_id": org_id},
        {"$set": {"status": "harvested", "harvested_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Crop not found")
    result.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'harvested', 'crop', crop_id, f"Harvested {result['name']}")
    await send_discord_webhook(org_id, embed=make_embed("Crop Harvested!", f"**{user['username']}** harvested **{result['name']}**", 0x6B8E23))
    return result

@api_router.delete("/organizations/{org_id}/crops/{crop_id}")
async def delete_crop(org_id: str, crop_id: str, user=Depends(get_current_user)):
    crop = await db.crops.find_one({"id": crop_id, "org_id": org_id})
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    await db.crops.delete_one({"id": crop_id})
    await log_audit(org_id, user['id'], user['username'], 'deleted', 'crop', crop_id, f"Removed {crop['name']}")
    return {"status": "deleted"}

# ============ ASSET ENDPOINTS ============

@api_router.get("/organizations/{org_id}/assets")
async def list_assets(org_id: str, user=Depends(get_current_user)):
    return await db.assets.find({"org_id": org_id}, {"_id": 0}).to_list(500)

@api_router.post("/organizations/{org_id}/assets")
async def create_asset(org_id: str, data: AssetCreate, user=Depends(get_current_user)):
    asset = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "name": data.name,
        "category": data.category,
        "assigned_to": data.assigned_to,
        "condition": data.condition,
        "value": data.value,
        "location": data.location,
        "notes": data.notes,
        "created_by": user['username'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.assets.insert_one(asset)
    asset.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'created', 'asset', asset['id'], f"Added {data.name}")
    return asset

@api_router.put("/organizations/{org_id}/assets/{asset_id}")
async def update_asset(org_id: str, asset_id: str, data: AssetUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.assets.find_one_and_update({"id": asset_id, "org_id": org_id}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Asset not found")
    result.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'updated', 'asset', asset_id, f"Updated: {str(update_data)}")
    return result

@api_router.delete("/organizations/{org_id}/assets/{asset_id}")
async def delete_asset(org_id: str, asset_id: str, user=Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id, "org_id": org_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.assets.delete_one({"id": asset_id})
    await log_audit(org_id, user['id'], user['username'], 'deleted', 'asset', asset_id, f"Removed {asset['name']}")
    return {"status": "deleted"}

# ============ TASK ENDPOINTS ============

@api_router.get("/organizations/{org_id}/tasks")
async def list_tasks(org_id: str, status: Optional[str] = None, user=Depends(get_current_user)):
    query = {"org_id": org_id}
    if status and status != "all":
        query["status"] = status
    return await db.tasks.find(query, {"_id": 0}).to_list(500)

@api_router.post("/organizations/{org_id}/tasks")
async def create_task(org_id: str, data: TaskCreate, user=Depends(get_current_user)):
    task = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "title": data.title,
        "description": data.description,
        "assigned_to": data.assigned_to,
        "priority": data.priority,
        "status": "pending",
        "due_date": data.due_date,
        "created_by": user['username'],
        "completed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task)
    task.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'created', 'task', task['id'], f"Created: {data.title}")
    return task

@api_router.put("/organizations/{org_id}/tasks/{task_id}")
async def update_task(org_id: str, task_id: str, data: TaskUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data.get('status') == 'completed':
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.find_one_and_update({"id": task_id, "org_id": org_id}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    result.pop('_id', None)
    await log_audit(org_id, user['id'], user['username'], 'updated', 'task', task_id, f"Updated: {str(update_data)}")
    return result

@api_router.delete("/organizations/{org_id}/tasks/{task_id}")
async def delete_task(org_id: str, task_id: str, user=Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "org_id": org_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.tasks.delete_one({"id": task_id})
    await log_audit(org_id, user['id'], user['username'], 'deleted', 'task', task_id, f"Removed: {task['title']}")
    return {"status": "deleted"}

# ============ AUDIT & STATS ============

@api_router.get("/organizations/{org_id}/audit-log")
async def get_audit_log(org_id: str, user=Depends(get_current_user)):
    return await db.audit_logs.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/organizations/{org_id}/stats")
async def get_org_stats(org_id: str, user=Depends(get_current_user)):
    inventory_count = await db.inventory.count_documents({"org_id": org_id})
    pipeline = [
        {"$match": {"org_id": org_id}},
        {"$group": {"_id": None, "dep": {"$sum": {"$cond": [{"$eq": ["$type", "deposit"]}, "$amount", 0]}}, "wit": {"$sum": {"$cond": [{"$eq": ["$type", "withdrawal"]}, "$amount", 0]}}}}
    ]
    tres = await db.treasury.aggregate(pipeline).to_list(1)
    balance = (tres[0]['dep'] - tres[0]['wit']) if tres else 0
    active_crops = await db.crops.count_documents({"org_id": org_id, "status": {"$in": ["planted", "growing"]}})
    ready_crops = await db.crops.count_documents({"org_id": org_id, "status": "ready"})
    asset_count = await db.assets.count_documents({"org_id": org_id})
    pending_tasks = await db.tasks.count_documents({"org_id": org_id, "status": "pending"})
    recent = await db.audit_logs.find({"org_id": org_id}, {"_id": 0}).sort("created_at", -1).to_list(10)
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    return {
        "inventory_count": inventory_count,
        "treasury_balance": balance,
        "active_crops": active_crops,
        "ready_crops": ready_crops,
        "asset_count": asset_count,
        "pending_tasks": pending_tasks,
        "member_count": len(org.get('members', [])) if org else 0,
        "recent_activity": recent
    }

# ============ ROLES ============

@api_router.put("/organizations/{org_id}/members/{member_user_id}/role")
async def update_member_role(org_id: str, member_user_id: str, data: RoleUpdate, user=Depends(get_current_user)):
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    is_leader = any(m['user_id'] == user['id'] and m['role'] == 'leader' for m in org.get('members', []))
    if not is_leader:
        raise HTTPException(status_code=403, detail="Only leaders can change roles")
    result = await db.organizations.update_one({"id": org_id, "members.user_id": member_user_id}, {"$set": {"members.$.role": data.role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    await log_audit(org_id, user['id'], user['username'], 'role_change', 'member', member_user_id, f"Changed role to {data.role}")
    return {"status": "updated"}

# ============ DISCORD WEBHOOK MOCK ============

@api_router.post("/organizations/{org_id}/discord/webhook-test")
async def test_discord_webhook(org_id: str, user=Depends(get_current_user)):
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not org.get('discord_webhook_url'):
        return {"status": "no_webhook", "message": "No webhook URL configured. Add a Discord webhook URL in organization settings."}
    return {"status": "mock_sent", "message": "Webhook test sent (mock mode). Configure real Discord credentials to enable."}

@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "Frontier Ledger API"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
