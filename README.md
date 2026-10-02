# Daywise ☀️ — Mobile-First To-Do Web App

Daywise is a modern, mobile-first daily task management web application crafted with a focus on seamless smartphone ergonomics (specifically phone viewports around **390 × 844 px**) while remaining fully responsive and usable on tablets and desktop browsers.

---

## 📱 Features

### User Accounts & Security
- **Authentication**: Secure registration and sign-in with email address and password.
- **Password Hashing**: State-of-the-art **bcrypt** password hashing (no plain-text passwords ever stored).
- **JWT Authorization**: Stateless bearer tokens safeguarding private user data on every API request.
- **Account Verification**: Email verification flow with token verification and one-click in-app dev simulation.
- **Password Reset**: Secure tokenized password reset flow with expiring tokens.
- **Privacy & Isolation**: Every user’s tasks, categories, and notification preferences are strictly private and isolated.

### Task Management
- **Full CRUD**: Create, view, edit, complete, and delete tasks.
- **Detailed Attributes**: Title, rich notes/description, due date, due time, priority, category, and recurring schedule.
- **Priority Levels**: **Low**, **Medium**, and **High** with distinct color-coded badges.
- **Categories**: Pre-seeded with **Personal**, **Work**, **Study**, and **Health**, plus full support for user-created custom categories with custom color palettes and icons.
- **Interactive Subtasks**: Build checklists inside tasks with instant progress indicators (`X/Y` completed).
- **Search, Filters & Sorting**:
  - Filter by: **All**, **Today**, **Upcoming**, and **Completed**.
  - Secondary filters by Category and Priority.
  - Live debounced search across titles and notes.
  - Sort by: Due Date, Priority, Title, or Creation Date.
- **Repeating Schedules**: Automatic rollover for **Daily**, **Weekdays (Mon–Fri)**, **Weekly**, and **Monthly** tasks upon completion.
- **Permanent Deletion Safety**: Interactive confirmation modal before permanently deleting any task or category.
- **Timezone Support**: Persisted per-user timezone preferences, aligning all schedules and greetings to the user’s local time.

### Mobile Dashboard
- **Friendly Greeting & Date**: Dynamic time-of-day greeting (*"Good morning"*, *"Good afternoon"*, *"Good evening"*) with formatted date.
- **Daily Progress Ring**: Animated circular indicator showing percentage and count of today's completed tasks with motivating status messages.
- **Today's Tasks**: Quick checklist cards with due times, priority badges, category tags, and subtask counters.
- **Upcoming Preview**: Quick glance at upcoming deadlines with one-tap link to Calendar.
- **Prominent Add-Task Button (FAB)**: Easily reachable floating action button `+` for rapid task entry.
- **Fixed Bottom Navigation**: Instant switching between **Today (Dashboard)**, **Tasks**, **Calendar**, and **Settings**.
- **Desktop Phone Frame**: On larger screens, Daywise displays centered inside a sleek phone canvas with an optional toggle button in the header to switch to an expanded view.

### Interactive Calendar
- Monthly calendar grid with weekdays header and previous/next month navigation.
- Visual indicator dots for days that have pending or completed scheduled tasks.
- Date selection displaying all tasks scheduled for that day, with quick completion checkboxes and inline task creation for that date.

### Notification System
- **In-App Notification Center**: Notification bell in top bar with live unread badge, detailed drawer, mark-as-read, and mark-all-read buttons.
- **Configurable Reminder Timing**: Choose when reminders trigger: *At due time*, *10 minutes before*, *1 hour before*, or *1 day before*.
- **Email Notifications (SMTP)**:
  - Supports configurable SMTP server (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`).
  - **Live SMTP Status Indicator**: Explicitly indicates whether SMTP is connected or running in local simulation mode.
  - **Test Email Trigger**: One-click test button in Settings that sends a test email to verify credentials.
  - In simulation mode (when SMTP is not configured), email messages and verification tokens are safely logged to console and surfaced directly in the UI for effortless testing.
- **Browser Push Notifications**: Optional browser notification permission request that triggers only after explicit user opt-in in Settings.
- **Automated Background Scheduler**: Built-in scheduler worker that checks for due task reminders and dispatches in-app and email notifications.

---

## 🛠️ Technology Stack

- **Backend**: **Python 3.13** with **FastAPI** (Python only; no Node.js or other backend runtimes).
- **Database ORM**: **SQLAlchemy 2.0** with SQLite default and PostgreSQL production support.
- **Validation**: **Pydantic v2** & **Pydantic Settings**.
- **Security**: **Bcrypt** for password hashing, **PyJWT** for authentication tokens.
- **Frontend**: Mobile-first responsive web application built with HTML5, **Tailwind CSS**, **Lucide Icons**, and vanilla **ES6 JavaScript modules** (zero complex Node build toolchains needed; served directly by FastAPI).
- **Testing**: **Pytest** with **HTTPX** test client.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Modern web browser (Chrome, Safari, Firefox, Edge)

### 2. Installation & Setup

1. **Navigate to the project directory**:
   ```bash
   cd C:\Users\ishan\.gemini\antigravity\scratch\daywise
   ```

2. **Activate the virtual environment**:
   - Windows PowerShell / Command Prompt:
     ```powershell
     .\.venv\Scripts\activate
     ```
   - macOS / Linux:
     ```bash
     source .venv/bin/activate
     ```

3. **Install dependencies** (already installed in `.venv`):
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Environment Variables**:
   A `.env.example` file is provided. Copy it to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(A pre-configured `.env` is already created for local development with SQLite)*

---

## 🏃 Running the Application

### Single-Command Run
Run the launcher script using Python:
```powershell
.\.venv\Scripts\python.exe run.py
```
Or directly via `uvicorn`:
```powershell
.\.venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Once started:
- 📱 **Mobile Web App**: Open [http://localhost:8000](http://localhost:8000)
- 📖 **Interactive API Docs (Swagger UI)**: Open [http://localhost:8000/docs](http://localhost:8000/docs)
- 🔍 **Health Check Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🗄️ Database Configuration

### SQLite (Default for Local Development)
By default, Daywise runs on SQLite without requiring any external database server:
```ini
DATABASE_URL=sqlite:///./daywise.db
```
The database file `daywise.db` is automatically created on startup with all tables and relationships.

### PostgreSQL (For Production Deployment)
To connect Daywise to a PostgreSQL instance, set `DATABASE_URL` in your `.env` file:
```ini
DATABASE_URL=postgresql://username:password@localhost:5432/daywise_db
```
Ensure a PostgreSQL driver is installed (e.g., `pip install psycopg2-binary` or `pip install psycopg[binary]`). Daywise automatically normalizes connection URLs and initializes schema tables.

---

## 📧 Email & Notification Configuration

Daywise includes a robust email dispatch system for verification, password resets, and task reminders.

### Configuring Live SMTP
To enable real email delivery, set the following in `.env`:
```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=notifications@daywise.app
SMTP_FROM_NAME=Daywise
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

### Local / Simulation Mode (Default)
If `SMTP_HOST` or `SMTP_USER` are left empty:
1. Daywise automatically operates in **Simulation Mode**.
2. Verification links and reminder notifications are cleanly logged to the application console.
3. The Settings screen displays an amber badge: `Simulation Mode`.
4. Verification and password reset tokens are returned in the development response so you can test complete flows seamlessly without configuring an SMTP provider.
5. In-app notifications continue to work in real-time.

---

## 🧪 Running Automated Tests

Run the comprehensive pytest suite covering authentication, tasks CRUD, categories, subtasks, and notification endpoints:
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```

All 7 test suites will execute against an isolated in-memory test database:
- `backend/tests/test_auth.py`: Registration, duplicate check, login, `/api/auth/me`, email verification, password reset.
- `backend/tests/test_tasks.py`: Task CRUD, subtask checklist, filtering (Today, Upcoming), search, recurring task rollover, permanent deletion.
- `backend/tests/test_categories.py`: Default categories verification, custom category creation, updating, and safe deletion.
- `backend/tests/test_notifications.py`: Notification preferences, in-app notifications, SMTP status checks, manual reminder trigger.

---

## 📐 Project Structure

```text
daywise/
├── .env                  # Local environment configuration
├── .env.example          # Environment variable templates
├── run.py                # Single-command application launcher
├── README.md             # Complete documentation
├── backend/
│   ├── requirements.txt  # Python package requirements
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py       # FastAPI application & static mounting
│   │   ├── config.py     # Pydantic BaseSettings & env loader
│   │   ├── database.py   # SQLAlchemy engine, session & init_db
│   │   ├── models.py     # SQLAlchemy ORM models (User, Task, Category, etc.)
│   │   ├── schemas.py    # Pydantic input/output schemas
│   │   ├── auth.py       # Bcrypt, JWT tokens, dependencies
│   │   ├── email_service.py # SMTP sender & simulation handler
│   │   ├── scheduler.py  # Background reminder worker thread
│   │   └── routers/
│   │       ├── auth.py          # Auth endpoints
│   │       ├── tasks.py         # Tasks & subtasks endpoints
│   │       ├── categories.py    # Categories endpoints
│   │       ├── notifications.py # Notification endpoints
│   │       └── users.py         # Profile & account management
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_tasks.py
│       ├── test_categories.py
│       └── test_notifications.py
└── frontend/
    ├── index.html        # Mobile-first app interface shell
    ├── manifest.json     # PWA manifest
    ├── assets/
    │   └── icon.svg      # Daywise vector app icon
    ├── css/
    │   └── style.css     # Custom mobile stylesheet & animations
    └── js/
        ├── api.js        # Fetch client with auth headers
        ├── auth.js       # Auth state & token storage
        ├── dashboard.js  # Mobile dashboard view controller
        ├── tasks.js      # Tasks list, filter & search controller
        ├── calendar.js   # Monthly calendar view controller
        ├── notifications.js # In-app notification center & push
        ├── settings.js   # Preferences, categories, SMTP status
        └── app.js        # Master app orchestrator
```
