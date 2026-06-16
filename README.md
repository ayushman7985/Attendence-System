# Attendance System

A full-stack attendance management application. Companies can sign up / log in, view employees, mark daily attendance (Present / Absent), and review attendance records from a clean React dashboard backed by a FastAPI API.

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
│       ├── main.py          # FastAPI app, employee & attendance routes, CORS
│       ├── auth.py          # /signup and /login routes
│       ├── database.py      # SQLAlchemy engine, session, Base
│       ├── models.py        # Attendance & Company tables
│       ├── schemas.py       # Pydantic request models
│       ├── security.py      # bcrypt password hashing/verification
│       └── attendance.db    # SQLite database file
├── frontend/
│   └── src/
│       ├── App.jsx          # Auth gate (Login vs Dashboard)
│       ├── api.js           # Axios instance (points to backend)
│       ├── authStorage.js   # localStorage session helpers
│       └── pages/
│           ├── Login.jsx    # Sign in / Sign up
│           └── Dashboard.jsx# Employees, mark attendance, records
├── requirements.txt         # Python dependencies
├── Dockerfile               # Backend image
└── docker-compose.yml       # Backend service
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

# run the API (from the backend/ directory)
cd backend
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive docs are available at `http://127.0.0.1:8000/docs`.

The SQLite database (`attendance.db`) and its tables are created automatically on first run.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at the URL printed by Vite (typically `http://localhost:5173`). It expects the backend at `http://127.0.0.1:8000` — change `API` in `frontend/src/api.js` if your backend runs elsewhere.

## Running with Docker

The included `Dockerfile` and `docker-compose.yml` build and run the backend API:

```bash
docker compose up --build
```

The API is exposed on `http://localhost:8000`.

## API Endpoints

| Method | Endpoint       | Description                                   |
| ------ | -------------- | --------------------------------------------- |
| GET    | `/`            | Health check – returns a running message      |
| POST   | `/signup`      | Register a company (`company_name`, `email`, `password`) |
| POST   | `/login`       | Log in a company (`email`, `password`)        |
| GET    | `/employees`   | List employees                                |
| POST   | `/employees`   | Create an employee (`name`, `email`)          |
| POST   | `/attendance`  | Mark attendance (`employee_id`, `status`)     |
| GET    | `/attendance`  | List all attendance records                   |

## How It Works

- **Authentication:** Companies register and log in via `/signup` and `/login`. Passwords are hashed with bcrypt before being stored. On success, the frontend keeps a lightweight session in `localStorage`.
- **Employees:** Currently served from an in-memory list in `backend/app/main.py` (seeded with sample data). Newly created employees persist only for the lifetime of the server process.
- **Attendance:** Attendance records are persisted to SQLite via SQLAlchemy and shown in the dashboard, with present/absent stats.

## Notes & Limitations

- Employees are stored in memory, not the database, so they reset when the backend restarts.
- CORS is currently open to all origins (`*`) for development convenience.
- Login does not yet issue a token (e.g. JWT); the session is client-side only.
- SQLite is used for simplicity; swap `DATABASE_URL` in `backend/app/database.py` for another database if needed.

These are good candidates for future improvements.
