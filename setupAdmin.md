# Administrator Role & Menu Protection Setup

This document details the changes made to secure the **SISTEM / Admin** menu across the IDX AI Trader platform. 
The system now properly relies on a database-backed `is_admin` flag.

## 1. Database Changes
A new boolean column `is_admin` was added to the `users` table via Alembic migrations.
- **Location:** `backend/app/models/user.py`
- **Default Value:** `False`
- **Migration Run:** `20260405_xxxx_add_admin_flag.py`

## 2. API Schema Updates
To ensure the React frontend knows if the logged-in user is an administrator, the backend authentication schema was updated.
- **Location:** `backend/app/schemas/auth.py`
- **Change:** Added `is_admin: bool = False` to the `UserResponse` Pydantic model. This safely payloads the DB flag to the frontend session.

## 3. Frontend Types
TypeScript definitions were updated to align with the new API response.
- **Location:** `types.ts`
- **Change:** Included `is_admin?: boolean;` in the core `User` interface.

## 4. Frontend Application Protections
The `App.tsx` file received two major upgrades to enforce horizontal security:

### A. UI Element Hiding
The sidebar navigation block that lists the **SISTEM** section and the **Admin** button was wrapped in a conditional renderer:
```tsx
{user.is_admin && (
  <section>
    <h3 className="text-[10px] font-bold uppercase mb-2 ml-3">SISTEM</h3>
    <div className="space-y-0.5">
      <SidebarItem icon={<Settings className="w-4 h-4" />} label="Admin" viewId="admin" view={view} setView={setView} />
    </div>
  </section>
)}
```

### B. Deep-link / Hard Route Protection
To prevent unauthorized users from manipulating the local state to force the `view === 'admin'` condition, the view render block now halts execution and displays an Access Denied error:
```tsx
  if (view === 'admin') {
    if (!user.is_admin) {
      return (
        <div className="min-h-screen flex items-center justify-center">
             <h1 className="text-2xl font-bold" style={{ color: SG.red }}>Access Denied</h1>
             {/* Back to Home Button */}
        </div>
      );
    }
    // ... Returns AdminDashboard ...
  }
```

---

## How to Make Yourself an Admin
Because UI controls for managing administrators do not exist yet (to prevent security loopholes), you must elevate your first admin user manually via the database.

Connect to your PostgreSQL instance using an SQL client (like pgAdmin or DBeaver) or via terminal (`psql -U postgres -d sahamgue`) and run:

```sql
UPDATE users SET is_admin = true WHERE email = 'your.email@example.com';
```

Replace `your.email@example.com` with the email you registered on the platform. Afterwards, log out and log back in on the web app to refresh your session state. You will immediately see the **SISTEM** menu appear.
