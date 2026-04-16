# Frontier Ledger - Product Requirements Document

## Overview
Frontier Ledger is a shared management app designed for RP (roleplay) groups to track resources, crops, money, inventory, duties, and group assets in one place, with Discord integration so updates flow between the app and the server automatically.

## Tech Stack
- **Frontend**: React Native / Expo SDK 54 with Expo Router
- **Backend**: FastAPI (Python) with MongoDB
- **Auth**: Discord OAuth2 (MOCKED) + JWT + Email/Password
- **Database**: MongoDB (local)

## Features Implemented

### 1. Authentication
- Mock Discord OAuth2 login (enter display name)
- Email/password registration and login
- JWT token-based sessions
- Secure password hashing with bcrypt

### 2. Multi-Organization Support
- Create organizations with auto-generated invite codes
- Join organizations via invite codes
- Switch between organizations
- Organization-scoped data isolation

### 3. Dashboard
- Overview stats: inventory count, treasury balance, active crops, pending tasks, assets, members
- Recent activity feed from audit log
- Pull-to-refresh

### 4. Inventory Management
- Full CRUD for inventory items
- Category-based filtering (food, crops, medical, crafting, weapons, etc.)
- Quick update buttons (+1, -1, +5, -5)
- Search functionality
- Storage location and notes tracking
- Change attribution (last updated by)

### 5. Treasury / Finance Ledger
- Deposit and withdrawal transactions
- Real-time balance calculation
- Category tagging (sales, donations, payroll, etc.)
- Transaction history with attribution

### 6. Crop Management
- Plant new crops with location and estimated harvest time
- Status tracking (planted, growing, ready, harvested, spoiled)
- Harvest action with confirmation
- Days-until-harvest countdown
- Filter by crop status

### 7. Assets Registry
- Register group-owned property (wagons, horses, buildings, etc.)
- Condition tracking (excellent, good, fair, poor, damaged)
- Value and location tracking
- Member assignment
- Category classification

### 8. Task Board
- Create and assign duties
- Priority levels (low, medium, high)
- Status management (pending, in_progress, completed)
- Task completion with timestamps
- Filter by status

### 9. Roles & Permissions
- 8 role levels: Leader, Treasurer, Quartermaster, Ranch Manager, Farmer, Soldier, Member, Guest
- Leader-only role management
- Member list with role display

### 10. Audit Log
- Complete change history for all entities
- User attribution for every change
- Timestamp tracking
- Action type icons and categorization

### 11. Discord Integration (MOCKED)
- Discord OAuth2 login flow structure (mock credentials)
- Webhook notification structure for updates
- Bot command format ready
- Can be activated with real Discord credentials

## API Endpoints
- Auth: POST /api/auth/mock-discord, /api/auth/register, /api/auth/login, GET /api/auth/me
- Organizations: POST/GET /api/organizations, POST /api/organizations/join
- Inventory: CRUD at /api/organizations/{org_id}/inventory with quick-update
- Treasury: GET/POST /api/organizations/{org_id}/treasury, GET balance
- Crops: CRUD at /api/organizations/{org_id}/crops with harvest action
- Assets: CRUD at /api/organizations/{org_id}/assets
- Tasks: CRUD at /api/organizations/{org_id}/tasks
- Audit: GET /api/organizations/{org_id}/audit-log
- Stats: GET /api/organizations/{org_id}/stats
- Roles: PUT /api/organizations/{org_id}/members/{user_id}/role

## Design
- Dark western/frontier theme with earthy tones
- Colors: Deep brown background (#17110C), gold primary (#C5A059), green secondary (#4A5D23)
- Bottom tab navigation: Dashboard, Inventory, Treasury, Crops, More
- Mobile-first responsive design

## Mocked Features
- **Discord OAuth2**: Accepts any display name, creates mock user
- **Discord Webhooks**: Returns mock success response
- Real Discord integration ready when credentials are provided

## Future Enhancements
- Real Discord OAuth2, bot commands, and webhook integration
- Offline/low-signal draft updates with sync
- Analytics and reporting
- Custom themes per organization
- Premium tier features
