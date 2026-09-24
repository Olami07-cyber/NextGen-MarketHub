# NextGen MarketHub

## Current audit

The original `index.html` / `app.js` MVP is a client-only prototype. It registers users into a `seed` object, saves all marketplace records and its session into browser `localStorage`, compares plaintext passwords in the browser, and executes approvals, cart updates and checkout in the browser. It has no backend, shared database, secure authentication, or server authorization. Data survives browser restarts only in the same browser profile; other users/devices do not share it. It must not be used with real accounts or data.

The repository now includes the replacement backend contract: Express, Prisma and PostgreSQL source in `src/server.js`, a relational schema in `prisma/schema.prisma`, and a password-hashed seed script in `prisma/seed.js`. The visual client is deliberately retained unchanged while its API integration is pending dependency installation and a database connection.

## Full-stack setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env`; set `DATABASE_URL` and a unique, 32+ character `AUTH_SECRET`.
3. Run `npm install`.
4. Create the database named `nextgen_markethub`.
5. Run `npm run db:generate`, then `npm run db:migrate -- --name init`.
6. Run `npm run db:seed`.
7. Run `npm run dev`, then visit `http://localhost:3000`.

## Development-only accounts

All seeded accounts use `DevPassword123!` and must never be used outside local development.

| Role | Email |
|---|---|
| Admin | admin@nextgen.local |
| Approved seller | ama@freshnest.local |
| Buyer | maya@example.local |

## Backend capabilities

- HttpOnly signed JWT session cookie; BCrypt password hashing
- Server-authorized role and status guards
- Public queries constrain both store and seller approval status
- Buyer cart persistence and server-calculated totals
- Transactional, multi-store checkout with stock checks, decrements and cart clearing
- Seller-scoped product/order operations and admin-only review operations
- Local upload adapter (`uploads/`) with type/size restrictions; replace with cloud object storage in production

## Database setup

PostgreSQL/Prisma files remain available for a future persistent deployment. The default Express development server uses a seeded in-memory repository and does not require a database connection.

Run `npm.cmd install`, then `npm.cmd run dev` and open `http://localhost:3000`. Database records are reset each time the server restarts.

Development-only login password for every seeded account: `DevPassword123!`.

| Role | Email |
|---|---|
| Admin | admin@nextgen.local |
| Approved seller | ama@freshnest.local |
| Pending seller | tunde@urbanloom.local |
| Buyer | maya@example.local |

`GET /api/health` responds with `{ "status": "ok" }` while the development server is running.
