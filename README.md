Hono Custom Auth Backend
A Node.js + Hono based authentication and authorization backend with hybrid session management (JWT + Redis access keys). Built for audit‑friendly, role‑sensitive access control with dual login support (email or phone number).

🚀 Features
Authentication
Signup (email or phone number) → auto‑login after signup, verification gates advanced features.

Login (dual login: email or phone number).

Logout (single session) → invalidate current device.

Logout All → invalidate all sessions across devices.

Forgot Password / Reset Password → supports token or OTP reset.

Verify Account → unlock restricted features.

Upgrade Account → elevate role with proper hierarchy checks.

Authorization
Role‑based hierarchy with seniority rules:

CEO → can create Admins.

Admin & CEO → can create Customer Care.

Customer Care → can create/update Users.

Users → default role, limited privileges.

Restricted role creation from frontend: only dual, tenant, landlord, real_estate_company, broker allowed.

Admins cannot view or update CEO accounts.

Profile updates → secure: users can only update safe fields (display name, country, timezone). Roles and permissions cannot be changed via profile endpoint.

Profile Management
Current user endpoint → fetch authenticated user.

Profile update → safe fields only.

Admin‑only user listing → restricted by hierarchy.

Security
Password hashing → bcrypt.

UUIDs → unique user IDs.

JWT → stateless authentication.

Redis → session store (Upstash for dev, self‑hosted for prod).

Zod → input validation.

Audit‑friendly design → timestamps, restricted role changes, clear error codes.

📂 Project Structure
Code
src/
  routes/
    signup.ts
    login.ts
    logout.ts
    logoutAll.ts
    forgotPassword.ts
    resetPassword.ts
    verifyAccount.ts
    upgradeAccount.ts
    profile.ts
    currentUser.ts
    users.ts
  controllers/
    signupController.ts
    loginController.ts
    ...
  models/
    userModel.ts
  utils/
    db.ts          # Database connection + queries
    bcrypt.ts      # Password hashing helpers
    jwt.ts         # JWT generation/verification
    redis.ts       # Redis session management
🗄️ Database Schema
sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  role TEXT,
  permissions TEXT,
  email TEXT,
  phone_number TEXT,
  password_hash TEXT,
  is_verified BOOLEAN,
  display_name TEXT,
  country TEXT,
  timezone TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
🔑 Session Strategy
Hybrid sessions:

JWT for stateless authentication.

Redis access keys for long‑lived sessions.

Redis:

Development → Upstash.

Production → Self‑hosted instance.

🛡️ Role Hierarchy Rules
Role	Can Create	Can Update	Restrictions
CEO	Admin, Customer Care, Users	All except other CEOs	Admins cannot view/update CEO
Admin	Customer Care, Users	Users	Cannot create Admins or CEOs
Customer Care	Users	Users	Limited to user management
User	None	Own profile	Default role, limited privileges
🛠️ Tech Stack
Framework: Hono

Language: Node.js (TypeScript)

Database: Postgres (recommended)

Session Store: Redis

Libraries:

bcrypt → password hashing

uuid → unique IDs

jsonwebtoken → JWT handling

zod → schema validation

⚙️ Setup & Installation
bash
# Clone repo
git clone <repo-url>
cd hono-auth-backend

# Install dependencies
npm install

# Environment variables
cp .env.example .env
# Update DB, Redis, JWT_SECRET, etc.

# Run dev server
npm run dev
📌 Roadmap
[ ] Add audit logs for role changes

[ ] Implement rate limiting on login/signup

[ ] Add multi‑factor authentication

[ ] Improve tenant isolation for multi‑company setups

🧑‍💻 Contributing
Fork the repo

Create a feature branch (git checkout -b feature/new-endpoint)

Commit changes with clear messages

Push and open a PR