# Attendance System

A full-stack attendance and leave management application. Companies (admins) can manage employees, mark attendance, and approve or reject leave requests. Employees have their own dashboard to apply for leave and view their attendance history.

## Features

- **Company (Admin) login** — view employees, mark attendance (Present / Absent), approve or reject pending leave requests, view leave history
- **Employee login** — apply for leave, view leave balance, see personal attendance records
- **Demo accounts** — pre-seeded data for interviews; one-click fill on the login page
- **Google OAuth** — optional; works when `VITE_GOOGLE_CLIENT_ID` is configured in `frontend/.env`

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) – REST API
- [SQLAlchemy](https://www.sqlalchemy.org/) – ORM
- [SQLite](https://www.sqlite.org/) – database (`attendance.db`)
- [Pydantic](https://docs.pydantic.dev/) – request/response schemas
- [bcrypt](https://pypi.org/project/bcrypt/) – password hashing
- [Uvicorn](https://www.uvicorn.org/) – ASGI server

**Frontend**
- [React 19](https://react.dev/)
- [Vite](https://vite.dev/) – dev server & build tool
- [Axios](https://axios-http.com/) – HTTP client

**Tooling**
- Docker / Docker Compose

## Project Structure

```
attendence-system/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app, employee, attendance & leave routes
│       ├── auth.py                # Company/employee signup, login, Google OAuth
│       ├── database.py            # SQLAlchemy engine, session, Base
│       ├── models.py              # Company, Employee, Attendance, Leave tables
│       ├── schemas.py             # Pydantic request models
│       ├── security.py            # bcrypt password hashing/verification
│       ├── seed_demo.py           # Demo data for interviews
│       └── attendance.db          # SQLite database (created on first run)
├── frontend/
│   └── src/
│       ├── App.jsx                # Auth gate (Login vs Dashboard)
│       ├── api.js                 # Axios instance (points to backend)
│       ├── authStorage.js         # localStorage session helpers
│       └── pages/
│           ├── Login.jsx          # Sign in / Sign up (Company & Employee)
│           ├── Dashboard.jsx      # Admin: employees, attendance, leave approvals
│           └── EmployeeDashboard.jsx  # Employee: apply leave, view records
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend

```bash
# from the project root
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

cd backend/app
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive docs: `http://127.0.0.1:8000/docs`.

The SQLite database and tables are created automatically on first run.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at the URL printed by Vite (typically `http://localhost:5173`). It expects the backend at `http://127.0.0.1:8000` — change `API` in `frontend/src/api.js` if needed.

### 3. Load demo data (for interviews / testing)

```bash
cd backend/app
python seed_demo.py
```

If demo data already exists, the script skips creation and prints the credentials again.

To reset demo data:

```bash
cd backend/app
del attendance.db        # Windows
# rm attendance.db     # macOS / Linux
python seed_demo.py
```

Then restart uvicorn.

## Demo Login Credentials

**Password for all accounts:** `demo123`

On the login page, click a demo account button to auto-fill email and password.

### Company (Admin)

| Field    | Value                  |
| -------- | ---------------------- |
| Tab      | **Company** → Sign in  |
| Email    | `admin@technova.com`   |
| Password | `demo123`              |
| Company  | TechNova Solutions     |

### Employees

| Tab      | **Employee** → Sign in |
| -------- | ---------------------- |
| Password | `demo123` (all)        |

| Name           | Email                  |
| -------------- | ---------------------- |
| Priya Sharma   | `priya@technova.com`   |
| Rahul Kumar    | `rahul@technova.com`   |
| Ananya Singh   | `ananya@technova.com`  |
| Vikram Patel   | `vikram@technova.com`  |

### Interview demo flow

1. **Employee login** (e.g. Priya) → apply for leave
2. **Admin login** → **Pending Approvals** → Approve or Reject
3. **Admin** → mark attendance for employees
4. **Employee** → view updated leave balance and attendance

## Google Sign-In (Optional)

Email/password login works without Google. To enable Google OAuth:

1. Copy `frontend/.env.example` to `frontend/.env`
2. Add your Google OAuth Client ID from [Google Cloud Console](https://console.cloud.google.com/)
3. Set authorized JavaScript origin to your dev URL (e.g. `http://localhost:5173`)
4. Restart the Vite dev server

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Running with Docker

```bash
docker compose up --build
```

The API is exposed on `http://localhost:8000`.

## API Endpoints

| Method | Endpoint                      | Description                                      |
| ------ | ----------------------------- | ------------------------------------------------ |
| GET    | `/`                           | Health check                                     |
| POST   | `/signup`                     | Register company                                 |
| POST   | `/login`                      | Company login                                    |
| POST   | `/employee/signup`            | Register employee                                |
| POST   | `/employee/login`             | Employee login                                   |
| POST   | `/auth/google`                | Google OAuth login/signup                        |
| GET    | `/employees`                  | List employees                                   |
| POST   | `/employees`                  | Create employee (no password)                    |
| GET    | `/employees/{id}/summary`     | Employee leave balance summary                   |
| POST   | `/attendance`                 | Mark attendance                                  |
| GET    | `/attendance`                 | List attendance (optional `?employee_id=`)       |
| POST   | `/leaves`                     | Apply for leave                                  |
| GET    | `/leaves`                     | List leaves (optional `?status=` / `?employee_id=`) |
| PATCH  | `/leaves/{id}`                | Approve / reject leave                           |

## How It Works

- **Authentication:** Companies and employees register and log in separately. Passwords are hashed with bcrypt. On success, the frontend stores a session in `localStorage`.
- **Admin role:** Mark attendance, approve or reject employee leave requests, view all records. Admins do not apply leave on behalf of employees.
- **Employee role:** Apply for leave from their dashboard; requests appear as Pending until admin approves or rejects.
- **Data:** Companies, employees, attendance, and leaves are stored in SQLite via SQLAlchemy.

## Notes & Limitations

- CORS is open to all origins (`*`) for development.
- No JWT or server-side sessions; auth is client-side only.
- Employees are global (not linked to a specific company in the database).
- SQLite is used for simplicity; change `DATABASE_URL` in `backend/app/database.py` for production.
