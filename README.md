# Radico Khaitan — Vendor & Customer Onboarding Portal

Full-stack onboarding portal with Django REST API backend and React frontend.

---

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | Django 4.2 + Django REST Framework          |
| Auth       | JWT (djangorestframework-simplejwt)         |
| Database   | PostgreSQL                                  |
| Frontend   | React 18 + Vite                             |
| Email      | SMTP (Gmail / Office 365 / any SMTP server) |

---

## Project Structure

```
Vendor Onboarding/
├── backend/
│   ├── config/          Django settings & URL routing
│   ├── apps/
│   │   ├── accounts/    Custom User model, JWT login
│   │   ├── onboarding/  Onboarding model, token, views
│   │   ├── documents/   File upload
│   │   └── notifications/ Email service
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/       LoginPage, DashboardPage, OnboardingFormPage
│   │   ├── components/  CreateOnboardingModal, OnboardingDetailPanel, etc.
│   │   ├── context/     AuthContext, ToastContext
│   │   └── api/         Axios instance with JWT interceptors
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally)

---

## Backend Setup

### 1. Create & activate virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
SECRET_KEY=your-very-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=vendor_onboarding
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
DEFAULT_FROM_EMAIL=Radico Vendor Portal <your-email@gmail.com>

FRONTEND_URL=http://localhost:5173
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords → Generate a 16-character password.

### 4. Create PostgreSQL database

```sql
-- In psql or pgAdmin:
CREATE DATABASE vendor_onboarding;
```

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Create admin user

```bash
python manage.py createsuperuser
# or use the register-admin API endpoint (see below)
```

### 7. Start the backend server

```bash
python manage.py runserver
```

Backend will be available at: **http://localhost:8000**

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## First-Time Admin Setup

### Option A — Django CLI (recommended)

```bash
# In backend/ with venv active:
python manage.py createsuperuser
```

### Option B — API endpoint

```bash
curl -X POST http://localhost:8000/api/v1/auth/register-admin/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@radico.co.in", "full_name": "Admin User", "password": "yourpassword"}'
```

---

## Application Flow

### Admin Flow
1. Log in at **http://localhost:5173/login**
2. Dashboard shows all registrations with stats
3. Click **"New Onboarding"** → enter email & select Vendor/Customer
4. System creates a record and sends an invite email with a secure link
5. Click any row to view details, approve, reject, or resend invite

### Vendor / Customer Flow
1. Receive email with a secure link (valid for 72 hours)
2. Open the link → fill the 4-step form:
   - Step 1: Company info + address
   - Step 2: PAN, GST, bank details
   - Step 3: MSME status + document uploads
   - Step 4: Review & submit
3. On submit → status changes to **Pending**
4. Admin reviews and approves/rejects

---

## API Reference

### Authentication

| Method | Endpoint                        | Auth      | Description          |
|--------|---------------------------------|-----------|----------------------|
| POST   | `/api/v1/auth/login/`           | Public    | Login, returns JWT   |
| POST   | `/api/v1/auth/logout/`          | JWT       | Logout               |
| POST   | `/api/v1/auth/token/refresh/`   | Public    | Refresh access token |
| GET    | `/api/v1/auth/profile/`         | JWT       | Get current user     |

### Onboarding (Admin)

| Method | Endpoint                              | Description                     |
|--------|---------------------------------------|---------------------------------|
| GET    | `/api/v1/onboarding/`                 | List all (filter: type, status, search) |
| POST   | `/api/v1/onboarding/create/`          | Create + send invite email      |
| GET    | `/api/v1/onboarding/stats/`           | Dashboard statistics            |
| GET    | `/api/v1/onboarding/<id>/`            | Get onboarding detail           |
| POST   | `/api/v1/onboarding/<id>/approve/`    | Approve                         |
| POST   | `/api/v1/onboarding/<id>/reject/`     | Reject (remarks required)       |
| POST   | `/api/v1/onboarding/<id>/resend-invite/` | Resend email invite          |

### Onboarding Form (Public — token-based)

| Method | Endpoint                                    | Description              |
|--------|---------------------------------------------|--------------------------|
| GET    | `/api/v1/onboarding/form/<token>/`          | Validate token & get form |
| PUT    | `/api/v1/onboarding/form/<token>/submit/`   | Save/update form (draft) |
| POST   | `/api/v1/onboarding/form/<token>/submit/`   | Final submit             |

### Documents (Public — token-based)

| Method | Endpoint                               | Description            |
|--------|----------------------------------------|------------------------|
| POST   | `/api/v1/documents/upload/<token>/`    | Upload document        |

---

## ID Generation

- **Vendor**: V1, V2, V3, …
- **Customer**: C1, C2, C3, …

---

## Status Workflow

```
DRAFT → PENDING → UNDER_REVIEW → APPROVED
                              ↘ REJECTED
```

---

## Document Types

| Type   | Label             | Required When          |
|--------|-------------------|------------------------|
| PAN    | PAN Card          | Always                 |
| GST    | GST Certificate   | GST Applicable = Yes   |
| CHEQUE | Cancelled Cheque  | Always                 |
| MSME   | MSME Certificate  | MSME Applicable = Yes  |

---

## Production Deployment Notes

1. Set `DEBUG=False` in `.env`
2. Run `python manage.py collectstatic`
3. Use Gunicorn + Nginx for the Django backend
4. Run `npm run build` and serve `dist/` with Nginx
5. Use environment variables for all secrets (never commit `.env`)
6. Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` for your domain
