# LaborTrack - Construction Site Labor Attendance PWA

A fast, mobile-first **Construction Site Labor Attendance & Wage Tracking Application** built with React, Vite, TypeScript, Tailwind CSS, and Supabase PostgreSQL. Designed to run smoothly as a Progressive Web App (PWA) installable directly from Android and iOS mobile browsers via **"Add to Home Screen"**.

---

## 🏗️ Core Features

- **📱 Mobile-First Experience**: High-contrast, tactile UI optimized for smartphones used at dusty construction sites with large 48px+ touch targets and zero gradients (clean navy blue, white, and slate color palette).
- **✉️ Simple Email Authentication**: Free, zero-SMS login using Email + Password or Email Verification Code with secure cross-session persistence via Supabase Auth.
- **⚡ Fast Daily Attendance**:
  - One-tap status marking: **Present (Full Day)**, **Half Day (0.5 Wage)**, **Absent (0 Wage)**, and **Leave**.
  - **"Mark All Present"** bulk shortcut to record dozens of workers in seconds.
  - Visual indicator showing un-marked laborers.
  - Date navigation stepper with date picker for historical entry and corrections.
- **🛡️ Audit Trail & Duplicate Prevention**:
  - Database-enforced unique constraint on `(laborer_id, attendance_date)` preventing accidental duplicate submissions.
  - Automated PostgreSQL trigger logging any status or wage adjustments into `attendance_audit_logs`.
- **📶 Offline Support & Pending Sync Queue**:
  - If network fluctuates on the job site, attendance is securely cached in local storage with timestamps.
  - Visual indicator alerts the supervisor: `X records pending sync` with an instant **Sync Now** button.
  - Automatic background synchronization when connectivity is restored.
- **💰 Automated Wage Calculation & Reports**:
  - Standard rules: `Present = 1.0 * daily_wage`, `Half Day = 0.5 * daily_wage`, `Absent = 0`, `Leave = 0`.
  - Date-range filtering (Today, Yesterday, Last 7 Days, This Month, Custom).
  - Trade Category breakdown (Mason, Helper, Electrician, Plumber, Carpenter, Painter, etc.).
  - Laborer-wise earnings summary and exportable **Excel CSV** (UTF-8 BOM formatted) + Printable layout.
- **🏢 Multi-Site Isolation & Row Level Security (RLS)**:
  - Administrators can create multiple construction sites and assign supervisors.
  - Strict database-level Row Level Security policies prevent supervisors from accessing unauthorized sites.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript |
| **Bundler & Tooling** | Vite 8 |
| **Styling** | Tailwind CSS v4 (Solid Navy `#0F172A`, Slate, White palette) |
| **Icons** | Lucide React |
| **Database & Auth** | Supabase (PostgreSQL with RLS & Phone Auth) |
| **App Type** | Progressive Web App (PWA) with Service Worker and Web Manifest |
| **Hosting** | Vercel, Netlify, or Cloudflare Pages |

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
*(You can also configure credentials directly inside the app using the **DB Config** button on the login screen).*

### 3. Run Supabase Database Migration
Open your project in the [Supabase Dashboard](https://supabase.com/dashboard) &gt; **SQL Editor**, and run the migration script located at:
```sql
supabase/migrations/20261016_init_construction_attendance.sql
```

*(Optional) Seed sample sites and laborers for testing:*
```sql
supabase/seed.sql
```

### 4. Enable Supabase Phone Authentication
In Supabase Dashboard:
1. Navigate to **Authentication &gt; Providers &gt; Phone**.
2. Toggle **Enable Phone Provider**.
3. Choose your SMS provider (Twilio, MessageBird, or Vonage) and add credentials.
4. **💡 Zero-Cost Testing (Recommended for local dev / demo):**
   Under **Phone Provider Settings**, expand **Test Phone Numbers** and add:
   - Phone: `+919999999999`
   - Test OTP: `123456`
   This allows you to log in instantly without any SMS gateway fees.

### 5. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser (or your mobile browser over local Wi-Fi).

---

## 🗄️ Database Architecture & RLS

### Schema Tables

1. `profiles`:
   - `id` (UUID, references `auth.users`)
   - `name` (Text), `phone` (Text unique)
   - `role` ('admin' | 'supervisor')
2. `construction_sites`:
   - `id` (UUID)
   - `name` (Text), `address` (Text), `is_active` (Boolean)
3. `site_members`:
   - `id` (UUID), `site_id` (UUID references `construction_sites`), `user_id` (UUID references `profiles`)
   - `role` ('admin' | 'supervisor')
4. `laborers`:
   - `id` (UUID), `site_id` (UUID references `construction_sites`)
   - `name` (Text), `phone` (Text), `category` (Text), `daily_wage` (Numeric), `is_active` (Boolean)
5. `attendance`:
   - `id` (UUID), `site_id` (UUID), `laborer_id` (UUID), `attendance_date` (Date)
   - `status` ('present' | 'absent' | 'half_day' | 'leave')
   - `wage_amount` (Numeric), `recorded_by` (UUID), `notes` (Text)
   - **Unique Constraint**: `(laborer_id, attendance_date)`
6. `attendance_audit_logs`:
   - Tracks all corrections (old status, new status, old wage, new wage, changed by, timestamp, reason) via automated trigger `log_attendance_audit()`.

### Security & Row Level Security (RLS)
- Every table has Row Level Security (`ENABLE ROW LEVEL SECURITY`) activated.
- Security helper function `has_site_access(site_uuid, user_uuid)` verifies membership in `site_members` or checks if user is an administrator (`is_admin()`).
- Supervisors can **never** query or modify laborer, attendance, or wage data from other construction sites.

---

## 📲 Installing as a PWA (Mobile App)

### On Android (Chrome / Brave / Edge):
1. Open the app URL in Chrome.
2. Tap the in-app banner **"Install App"** or tap browser menu (⋮) &gt; **Add to Home Screen**.
3. The app will install with a native app icon and run full-screen without browser address bars.

### On iOS (Safari):
1. Open the app URL in Safari.
2. Tap the **Share** button (box with upward arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

---

## 🚢 Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) &gt; **Add New Project**.
3. Import the repository.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
5. Click **Deploy**. Vercel will build and deploy the production PWA in seconds.
