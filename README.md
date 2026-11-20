# Northstar School Management System

Northstar is a React/TypeScript school-management UI backed by a FastAPI and SQLAlchemy API. The frontend reads records from the API, and attendance, gate movements, grades, report comments, and newly added student/staff records are written to the configured database.

## Run locally

The backend defaults to SQLite at `backend/northstar.db`. From the project root:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m app.seed
python -m uvicorn app.main:app --reload --port 8001
```

In another terminal:

```powershell
npm install
npm run dev
```

Open the frontend URL printed by Vite. The API health check is at `http://127.0.0.1:8001/health`; interactive API documentation is at `http://127.0.0.1:8001/docs`. Set `VITE_API_BASE_URL` if the API runs at a different origin.

`python -m app.seed` creates a connected sample dataset only when the database has no students. If records already exist, it reports counts and makes no changes. The checked-in SQLite database already contains dummy school records.

To use PostgreSQL instead, set `DATABASE_URL` in `backend/.env`, for example:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/school_management
```

Do not commit `.env`. Tables are created by the API on startup; review and use formal Alembic migrations for production schema changes.

## Included modules

- Role-based demo navigation and dashboards.
- Database-backed student and staff directories, including create and profile/status edit flows.
- Attendance reading and status updates.
- Gate movement register and new movement entries.
- Gradebook updates with automatic save and report cards/comments.
- CSV exports for attendance and gradebooks; printable dashboard and report cards.
- Responsive layouts for desktop, tablet, and mobile.

The account cards and role switcher are for local testing, not production authentication or authorization. The API also does not yet enforce per-role permissions. Do not expose it to the public internet or enter real student personal/health information until authentication, authorization, audit logging, backups, and appropriate privacy protections are implemented.
