# Team Task Manager

Full-stack web app for **projects**, **team membership with roles** (Admin / Member), and **tasks** with assignment, status, and due dates. Includes a **dashboard** for counts, overdue work, and upcoming deadlines.

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| API      | Node.js, Express, REST, Zod validation          |
| Auth     | JWT (Bearer), bcrypt password hashing           |
| Data     | PostgreSQL, Prisma ORM, migrations              |
| UI       | React 19, Vite, TypeScript, Tailwind CSS v4     |
| Deploy   | Single Railway service (API + static SPA)       |

## Role-based access

- **Admin**: Edit/delete project, manage members and roles, delete any task, full task edits.
- **Member**: Create tasks, update status when unassigned / creator / assignee; edit task details only as assignee (or admin). Cannot delete tasks or manage project/members.

## Local development

### 1. Database

Either start Postgres with Docker:

```bash
docker compose up -d
```

Or use any PostgreSQL instance and set `DATABASE_URL` in `.env` (see `.env.example`).

Example for the compose file above:

```bash
cp .env.example .env
# Set DATABASE_URL to:
# postgresql://app:app@localhost:5432/team_tasks?schema=public
```

### 2. Install and migrate

```bash
npm install
cd server && npx prisma migrate deploy && cd ..
```

For first-time local setup from scratch you can use:

```bash
cd server && npx prisma migrate dev && cd ..
```

### 3. Run app

```bash
npm run dev
```

- Frontend: http://localhost:5173 (proxies `/api` to the server)
- API: http://localhost:4000

Create two accounts to test invites: register user A, create a project, invite user B by **email** (user B must register first with that email).

## Production build

```bash
npm run build
npm run start
```

The server serves the built SPA from `client/dist` and exposes REST routes under `/api`.

## Deploy on Railway (required for submission)

1. Create a **new project** on Railway and connect this **GitHub repo** (or deploy from the CLI).
2. Add a **PostgreSQL** plugin and copy the generated `DATABASE_URL` into the service variables (Railway often wires this automatically).
3. Set **variables** on the Node service:
   - `DATABASE_URL` — from Postgres (if not already linked).
   - `JWT_SECRET` — long random string (required for production; the server enforces this when `NODE_ENV=production`).
   - `NODE_ENV` — `production`.
4. **Root directory**: repository root (default).
5. **Node 20:** The repo ships `nixpacks.toml` and `package.json` `engines` so Railway’s Nixpacks builder uses **Node 20** (fixes Tailwind/build failures on Node 18).
6. **Build command** (if not using `railway.toml`): `npm install --include=dev && npm run build`  
   (`--include=dev` is required so **vite** and **typescript** install during Railway’s production image build.)
7. **Start command**: `npm run start`

On deploy, `npm run start` runs `prisma migrate deploy` then the server, so the schema is applied automatically.

8. Generate a **public domain**: Service → Settings → Networking → Generate domain.

After deploy, open the URL, **register**, and use the app in the browser.

### Railway troubleshooting (service keeps restarting)

Use **one Node service** for this repo: it builds the React app and the API together and serves both. Do **not** add a separate “client-only” service unless you know how to split the deployment—extra services often crash or show “Not Found”.

**Check variables on that same Node service** (not only on Postgres):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Reference/copy from your Railway Postgres. If migrations fail, try the **direct** connection URL (Railway sometimes labels pooler vs direct—migrations need a URL that accepts DDL). |
| `JWT_SECRET` | Any long random string. Missing → process exits in production. |
| `NODE_ENV` | Set to `production`. |

**Logs:** Open **Deployments → View logs**.  
If you see `[start-prod] Migration failed`, fix `DATABASE_URL` (direct URL / SSL).  
If you see `Missing required env: JWT_SECRET`, add it under Variables.

The API listens on **`0.0.0.0`** and Railway’s **`PORT`** automatically.

## REST API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Sign up |
| POST | `/api/auth/login` | — | Sign in |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/dashboard` | JWT | Summary, overdue, upcoming, recent projects |
| GET/POST | `/api/projects` | JWT | List / create projects |
| GET/PATCH/DELETE | `/api/projects/:projectId` | Member / Admin | Project detail, update (admin), delete (admin) |
| POST | `/api/projects/:projectId/members` | Admin | Invite by email + role |
| PATCH/DELETE | `/api/projects/:projectId/members/:memberId` | Admin | Role / remove member |
| GET/POST | `/api/projects/:projectId/tasks` | Member | List / create tasks |
| PATCH/DELETE | `/api/projects/:projectId/tasks/:taskId` | Member | Update / delete task (delete admin-only) |
| GET | `/api/health` | — | Health check |

## Project layout

```
├── client/          React SPA
├── server/          Express API + Prisma
├── package.json     npm workspaces + scripts
├── railway.toml     Railway build/start hints
└── docker-compose.yml   Local Postgres (optional)
```

## License

MIT — use freely for coursework and portfolios.

