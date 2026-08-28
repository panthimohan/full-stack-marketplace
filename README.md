# Marketto — Multi-Vendor Marketplace

A production-oriented multi-vendor marketplace: customers browse products
from many independent vendors, check out once (even across vendors), and
pay with Cash on Delivery or eSewa. Vendors manage their own shop, products,
and orders. Admins approve vendors and oversee the platform.

Built as a Django REST Framework backend + React/TypeScript frontend,
containerized with Docker, with a real (not mocked) eSewa ePay v2
integration.

> **Scope note.** This was built end-to-end and tested (46 passing backend
> tests, verified checkout/eSewa flows, clean TypeScript build) but is
> sized for a capstone/portfolio project rather than a hardened
> production deployment. See "What's intentionally simplified" near the
> bottom before treating this as launch-ready for real payments.

---

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Quick start (local, no Docker)](#quick-start-local-no-docker)
- [Quick start (Docker)](#quick-start-docker)
- [Environment variables](#environment-variables)
- [Seed data / demo accounts](#seed-data--demo-accounts)
- [eSewa setup](#esewa-setup)
- [API documentation](#api-documentation)
- [Testing](#testing)
- [Deployment (VPS)](#deployment-vps)
- [Security considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [What's intentionally simplified](#whats-intentionally-simplified)

---

## Features

- **Auth**: registration (customer or vendor), login/logout, JWT access +
  refresh with auto-refresh, password reset via email, profile management.
- **Vendors**: shop profile + logo, approval lifecycle
  (pending/approved/rejected/suspended), vendor-scoped product & order
  management enforced server-side.
- **Catalog**: category management, product CRUD with multi-image upload,
  server-side search/filter (category, vendor, price range, in-stock)/
  sort/pagination.
- **Cart & checkout**: stock-validated cart, backend-computed totals
  (never trusts client-supplied prices), Cash on Delivery and eSewa.
- **Multi-vendor orders**: one cart can span vendors; checkout splits it
  into a parent `Order` + one `VendorOrder` per vendor, so vendors only
  ever see their own slice. See `docs/architecture.md` §4.
- **eSewa integration**: real ePay v2 flow — HMAC-signed initiation,
  signature-verified callback, independent server-to-server status
  confirmation, duplicate-callback protection, automatic stock release on
  failure.
- **Dashboards**: admin (platform stats), vendor (shop stats), customer
  (order summary).
- **Docs**: Swagger/ReDoc via drf-spectacular, this README, and
  `docs/architecture.md` with Mermaid diagrams.

## Technology stack

**Backend**: Python 3.12, Django 5, Django REST Framework, SimpleJWT,
django-filter, Pillow, Celery + Redis, drf-spectacular, pytest-django,
PostgreSQL (SQLite fallback for zero-setup local dev).

**Frontend**: React 19, TypeScript (strict), Vite, Tailwind CSS, React
Router, TanStack Query, Zustand, React Hook Form + Zod, Axios, lucide-react.

**Infra**: Docker, Docker Compose, Nginx, GitHub Actions CI.

## Project structure

```
marketplace/
├── backend/
│   ├── config/                # settings, urls, celery app
│   ├── apps/
│   │   ├── common/            # base models, pagination, permissions, seed_data command
│   │   ├── accounts/          # custom User, auth, password reset
│   │   ├── vendors/           # vendor profile + approval workflow
│   │   ├── categories/
│   │   ├── products/          # catalog + vendor/admin product management
│   │   ├── cart/
│   │   ├── orders/            # checkout service, multi-vendor order splitting
│   │   ├── payments/          # Payment model + services/esewa.py
│   │   └── dashboards/
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                # typed axios clients per domain
│   │   ├── features/<domain>/  # TanStack Query hooks + domain components
│   │   ├── pages/{public,customer,vendor,admin}/
│   │   ├── components/{ui,layout}/
│   │   ├── store/               # zustand (auth, toasts)
│   │   └── routes/              # ProtectedRoute
│   └── Dockerfile
├── infrastructure/nginx/        # production reverse-proxy config
├── docs/architecture.md
├── .github/workflows/ci.yml
├── docker-compose.yml
└── .env.example
```

## Quick start (local, no Docker)

Requires Python 3.12+, Node 20+. SQLite is used automatically if you don't
configure Postgres, so there's no database to install for local dev.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env        # then edit as needed
python manage.py migrate
python manage.py seed_data     # creates demo admin/vendor/customer accounts + products
python manage.py runserver     # http://localhost:8000
```

```bash
# Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env           # VITE_API_BASE_URL=http://localhost:8000/api/v1
npm run dev                    # http://localhost:5173
```

Open http://localhost:5173 and log in with one of the [seed accounts](#seed-data--demo-accounts).

Celery is optional for local dev — `CELERY_TASK_ALWAYS_EAGER=True` (the
`.env.example` default) runs tasks synchronously in-process, so you don't
need Redis running just to try things out. To run it for real:

```bash
# needs Redis running locally, and CELERY_TASK_ALWAYS_EAGER=False
cd backend && celery -A config worker --loglevel=info
```

## Quick start (Docker)

```bash
cp .env.example .env   # edit POSTGRES_*, SECRET_KEY, etc. for your setup
docker compose up --build
```

This starts Postgres, Redis, the Django backend (migrates + serves on
`:8000`), a Celery worker, and the built React app served by Nginx on
`:5173`. Seed data isn't run automatically — do it once the backend
container is up:

```bash
docker compose exec backend python manage.py seed_data
```

## Environment variables

See `.env.example` at the repo root for the full list with inline comments.
Highlights:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key — generate a real one for anything beyond local dev |
| `DEBUG` | `True` locally, **must be `False`** in production |
| `DATABASE_URL` / `POSTGRES_*` | Leave blank to use SQLite locally; set for Postgres |
| `REDIS_URL`, `CELERY_TASK_ALWAYS_EAGER` | Celery/Redis config |
| `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL` | Must match your frontend's real origin in production |
| `ESEWA_*` | See [eSewa setup](#esewa-setup) |
| `VITE_API_BASE_URL` | Frontend → backend API base URL |

## Seed data / demo accounts

`python manage.py seed_data` creates:

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@marketplace.local` | `Admin@12345` | Full platform access |
| Vendor | `vendor1@marketplace.local` | `Vendor@12345` | TechHub Nepal — approved |
| Vendor | `vendor2@marketplace.local` | `Vendor@12345` | Urban Threads — approved |
| Vendor | `vendor3@marketplace.local` | `Vendor@12345` | Home Essentials Co — approved |
| Vendor | `vendor4-pending@marketplace.local` | `Vendor@12345` | Pending — demonstrates the approval workflow |
| Customer | `customer1@marketplace.local` | `Customer@12345` | Has one seeded sample order |
| Customer | `customer2@marketplace.local` / `customer3@marketplace.local` | `Customer@12345` | |

These are local-development-only credentials — never reuse them anywhere real.

## eSewa setup

The integration follows eSewa's **ePay v2** developer documentation
(`https://developer.esewa.com.np`) as verified at build time:

- **Sandbox (default in `.env.example`)** uses eSewa's published UAT test
  merchant code (`EPAYTEST`) and secret key — safe to commit/use for local
  development and demos, no account needed. Sandbox base URL:
  `https://rc-epay.esewa.com.np`.
- **Production**: register as an eSewa merchant, then set:
  ```
  ESEWA_ENVIRONMENT=production
  ESEWA_MERCHANT_ID=<your real merchant/product code>
  ESEWA_SECRET_KEY=<your real secret key>
  ESEWA_BASE_URL=https://epay.esewa.com.np
  ```
- The integration logic lives entirely in
  `backend/apps/payments/services/esewa.py`, isolated from order/checkout
  logic — see `docs/architecture.md` §6 for the full signing/verification
  flow and why the callback alone is never trusted as proof of payment.
- To test the eSewa flow locally: check out with "eSewa" selected, you'll
  be redirected to eSewa's sandbox hosted checkout, where you can use
  eSewa's published UAT test login (see their developer docs for current
  test credentials, as these can change).

## API documentation

With the backend running:

- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- Raw OpenAPI schema: `http://localhost:8000/api/schema/`
- Django admin: `http://localhost:8000/admin/`

## Testing

```bash
cd backend
python -m pytest apps/ -v
```

46 tests cover: registration & auth, vendor approval workflow, product
CRUD & cross-vendor permission isolation, cart stock validation and
price-injection resistance, multi-vendor checkout splitting, historical
order-item snapshotting, COD checkout end-to-end, order visibility
isolation (customer/vendor/admin), and eSewa signature verification +
duplicate-callback protection.

Frontend: `cd frontend && npx tsc -b --noEmit && npm run build` verifies
the app type-checks and builds cleanly (used in CI).

## Deployment (VPS)

Aimed at a plain Ubuntu + Docker + Nginx VPS:

1. **Provision**: Ubuntu 22.04+, install Docker & Docker Compose.
2. **Clone & configure**:
   ```bash
   git clone <your-repo> && cd marketplace
   cp .env.example .env
   # set: SECRET_KEY (generate a real one), DEBUG=False,
   # ALLOWED_HOSTS=your-domain.com, POSTGRES_PASSWORD (strong),
   # CORS_ALLOWED_ORIGINS / CSRF_TRUSTED_ORIGINS / FRONTEND_URL = https://your-domain.com,
   # ESEWA_ENVIRONMENT=production + real ESEWA_MERCHANT_ID / ESEWA_SECRET_KEY
   ```
3. **Build & run**:
   ```bash
   docker compose up -d --build
   docker compose exec backend python manage.py createsuperuser
   ```
4. **Reverse proxy + HTTPS**: put the provided
   `infrastructure/nginx/marketplace.conf` in front of the `backend` (8000)
   and `frontend` (80, mapped to 5173 in compose — adjust as needed)
   containers. Obtain a certificate with certbot and uncomment the HTTPS
   block in that file:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```
5. **Static & media**: the backend container runs `collectstatic`
   automatically on startup (via WhiteNoise) and serves `/media/` itself;
   for heavier traffic, point `MEDIA_ROOT`/`STATIC_ROOT` at a mounted
   volume (already done in `docker-compose.yml`) or migrate to S3/R2 later
   — the code already uses Django's storage abstraction, so this is a
   config change, not a rewrite.
6. **Backups**: schedule `pg_dump` against the `db` service's volume
   (`postgres_data`) on a cron job; test restores periodically.
7. **Celery**: the `celery_worker` service in `docker-compose.yml` runs
   alongside the backend automatically.

## Security considerations

- Every price/total is computed server-side from the locked `Product` row
  at checkout time — the frontend cannot influence what a customer is
  charged (see `apps/orders/services.py` and the cart tests that assert
  this).
- Role and ownership checks happen in DRF permission classes and
  queryset filtering, never only in the frontend — a vendor's own API
  queryset is always pre-filtered to their `vendor_profile`, so
  cross-vendor requests 404 rather than leak existence via 403.
- eSewa callbacks are HMAC-verified, then independently re-confirmed
  against eSewa's server-to-server status API — a forged or replayed
  redirect cannot mark an order paid.
- Product image uploads are validated by content-type and size (5MB max,
  JPEG/PNG/WEBP only) before being written to disk.
- `DEBUG=False`, HSTS, secure cookies, and SSL redirect are enabled
  automatically in `config/settings.py` whenever `DEBUG` is false.
- Secrets (DB password, `SECRET_KEY`, eSewa secret) are read from
  environment variables only — never hardcoded, never committed
  (`.env` is gitignored; only `.env.example` is checked in).

## Troubleshooting

- **`django.db.utils.OperationalError` on startup with Docker** — Postgres
  probably isn't ready yet; `docker-compose.yml` already waits on its
  healthcheck, but if you see this on a cold start, `docker compose up`
  again.
- **CORS errors in the browser console** — make sure
  `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` in `.env` exactly match
  the origin the frontend is served from (protocol + host + port).
- **eSewa redirect doesn't come back to your app** — the `success_url` /
  `failure_url` sent to eSewa are built from `FRONTEND_URL`; make sure
  that's set to a URL eSewa can actually redirect the browser to (for
  local sandbox testing this generally means `http://localhost:5173`).
- **"Only approved vendors can add products"** — expected; approve the
  vendor from the admin dashboard (or via `admin@marketplace.local` after
  seeding) first.

## What's intentionally simplified

Being upfront about capstone-appropriate trade-offs versus a fully
hardened commercial deployment:

- No coupon/wishlist/review system (explicitly out of scope per the
  original spec's "don't blindly create unnecessary tables" guidance).
- Shipping cost is a flat "free shipping" placeholder — extend
  `orders/services.py::create_order_from_cart` for real shipping rules.
- Email verification architecture exists (`is_email_verified` field) but
  no verification email is sent yet — password reset email *is* fully
  wired and working.
- Test coverage is solid for the critical paths (46 tests) but isn't
  exhaustive line-by-line coverage of every endpoint.
- No live production deployment is included — Docker/Nginx/CI are all
  provided and validated, but you'll need to point them at your own
  domain and eSewa merchant credentials to go live.
