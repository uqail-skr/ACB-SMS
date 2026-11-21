# Northstar School Management System

Northstar is a React/TypeScript school-management UI backed by a FastAPI and SQLAlchemy API. The frontend reads records from the API, and attendance, gate movements, grades, report comments, and newly added student/staff records are written to the configured database.

## Run locally

The backend uses PostgreSQL. In pgAdmin 4, create a database named `school_management`. Then, from the project root, configure the backend connection:

```powershell
cd backend
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` with the PostgreSQL username and password you use in pgAdmin, and generate a private signing key:

```env
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/school_management
JWT_SECRET=<a random secret of at least 32 characters>
```

Generate a key in PowerShell with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and paste the output as `JWT_SECRET`. Keep this secret private; changing it signs out all users.

Create the tables from the SQLAlchemy ORM models with the Alembic migration:

```powershell
python -m alembic upgrade head
```

Create the first school account (including the principal account) using the interactive command. It securely prompts for and hashes the password; no default credentials are installed. For a database that already has an account with the same username and email, rerun the command to set its real password:

```powershell
python -m app.create_user
```

Choose the `PRINCIPAL` role for the initial administrator. Repeat this command to add staff and family accounts.

Optionally populate the empty database with demo records:

```powershell
python -m app.seed
```

Start the API:

```powershell
python -m uvicorn app.main:app --reload --port 8001
```

In another terminal:

```powershell
npm install
npm run dev
```

Open the frontend URL printed by Vite. The API health check is at `http://127.0.0.1:8001/health`; interactive API documentation is at `http://127.0.0.1:8001/docs`. Set `VITE_API_BASE_URL` if the API runs at a different origin.

`python -m app.seed` creates a connected sample dataset only when the PostgreSQL database has no students. If records already exist, it reports counts and makes no changes. The API does not create tables at startup; apply schema changes with Alembic (`python -m alembic upgrade head`). Do not commit `.env`.

## Included modules

- Authenticated username/password access with expiring bearer tokens and role-aware navigation.
- Database-backed student and staff directories, including create and profile/status edit flows.
- Attendance reading and status updates.
- Gate movement register and new movement entries.
- Gradebook updates with automatic save and report cards/comments.
- CSV exports for attendance and gradebooks; printable dashboard and report cards.
- Responsive layouts for desktop, tablet, and mobile.

The API requires authentication for school data endpoints. Per-role API permissions, account recovery, audit logging, backups, and deployment hardening are not yet implemented; do not expose this starter system to the public internet or enter real student personal/health information until those protections are in place.
