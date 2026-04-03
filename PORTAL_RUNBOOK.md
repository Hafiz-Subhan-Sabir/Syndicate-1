# Portal migration runbook

This document covers the Django `apps.portal` API (JWT auth, RBAC, social links, missions/reminders/notes deck) and the Next.js dashboard integration.

## Environment variables

### Backend (`Syndicate_real/Backend`)

| Variable | Purpose |
|----------|---------|
| `DJANGO_SECRET_KEY` | Production secret (defaults to dev key if unset) |
| `.env` at project root | Loaded by `syndicate_backend/settings.py` |

### Frontend (`Syndicate_real/Frontend-Dashboard`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE` | Leave unset or `proxy` (default): browser uses `/api/portal-proxy/…` and Next forwards to Django. Set to `http://127.0.0.1:8000` only for direct browser → Django. |
| `BACKEND_INTERNAL_URL` | Server-only: Django origin for the proxy (default `http://127.0.0.1:8000`) |
| `NEXT_PUBLIC_AUTH_REQUIRED` | Set to `false` to allow the dashboard without login; any other value (including unset) enables redirect to `/login` when no JWT is stored |

Copy `Frontend-Dashboard/.env.local.example` to `.env.local` and adjust.

## RBAC matrix (seeded roles)

| Permission | viewer | operator | admin |
|------------|:------:|:--------:|:-----:|
| `portal.access` | ✓ | ✓ | ✓ |
| `deck.view` | ✓ | ✓ | ✓ |
| `deck.manage` | — | ✓ | ✓ |
| `social.links.view` | ✓ | ✓ | ✓ |
| `social.links.manage` | — | ✓ | ✓ |
| `social.links.manage_all` | — | — | ✓ |

Django superusers receive effective permission `*` (all) from `apps.portal.rbac`.

## Auth flow (JWT)

1. **Login:** `POST /api/auth/login/` with `{"username","password"}` → `access`, `refresh`, and `user` (profile + `roles` + `permissions`).
2. **Authenticated requests:** `Authorization: Bearer <access>`.
3. **Refresh:** `POST /api/auth/refresh/` with `{"refresh"}` → new `access` (refresh rotation is off by default).
4. **Logout:** `POST /api/auth/logout/` with Bearer access → `204`. Client clears stored tokens (JWT is stateless until blacklist is added).
5. **Current user:** `GET /api/auth/me/` with Bearer access.

## API surface (`/api/portal/`)

| Method | Path | Notes |
|--------|------|------|
| GET, POST | `/api/portal/social-links/` | List/create; queryset scoped to user unless `social.links.manage_all` |
| GET, PATCH, PUT, DELETE | `/api/portal/social-links/<id>/` | Object-level checks |
| GET, POST | `/api/portal/missions/` | Requires `deck.view` (read) / `deck.manage` (write) |
| … | `/api/portal/missions/<id>/` | Owner-scoped |
| GET, POST | `/api/portal/reminders/` | Same deck permissions |
| … | `/api/portal/reminders/<id>/` | |
| GET, POST | `/api/portal/notes/` | Same deck permissions |
| … | `/api/portal/notes/<id>/` | |

## Commands

### Backend

```bash
cd Syndicate_real/Backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_portal
# optional: python manage.py seed_portal --password 'YourSecurePass'
python manage.py runserver
```

### Backend tests

```bash
cd Syndicate_real/Backend
python manage.py test apps.portal.tests
```

### Frontend

```bash
cd Syndicate_real/Frontend-Dashboard
npm install
npm run dev
# production build
npm run build && npm start
```

## Seeded demo users

After `python manage.py seed_portal` (resets passwords for `demo`, `viewer1`, `admin1` unless `--no-reset-password`):

| User      | Email             | Role     | Notes                          |
|-----------|-------------------|----------|--------------------------------|
| **demo**  | demo@example.com  | operator | Full deck + own social links   |
| **viewer1** | viewer@example.com | viewer | Read-only deck, read social    |
| **admin1**  | admin@example.com  | admin  | Includes `social.links.manage_all` |

Default password: **`SyndicateDev2026!`** (override with `PORTAL_DEV_PASSWORD` in `Backend/.env` or `python manage.py seed_portal --password '...'`).

See also `Syndicate_real/LOCAL_DEV_CREDENTIALS.txt`.

## Migration notes

- The Next.js route `src/app/api/social-links/route.ts` was removed; social links are served only from Django when the user is authenticated with `social.links.view` (or manage). Without auth, the dashboard uses bundled defaults from `src/data/socialLinks.ts`.
- CORS is configured in `syndicate_backend/settings.py` for `http://localhost:3000` and `http://127.0.0.1:3000`; add production origins as needed.
- **404 on `POST /api/auth/login/`:** Portal auth is also mounted from `api/urls.py` under `auth/`, so `/api/auth/login/` resolves whenever `path("api/", include("api.urls"))` exists. Restart `runserver` after updating files.

## Troubleshooting

- **Hydration mismatch on `<body>` (e.g. `cz-shortcut-listen`):** Often a browser extension changing the DOM before React hydrates. `layout.tsx` sets `suppressHydrationWarning` on `<body>`; try disabling extensions to verify.

## Known assumptions

- **SQLite** is the default database in settings; switch `DATABASES` for PostgreSQL in production.
- **JWT** is not blacklisted on logout; enable `rest_framework_simplejwt.token_blacklist` if you need server-side invalidation.
- **Auth gate default:** If `NEXT_PUBLIC_AUTH_REQUIRED` is unset, the dashboard requires login. Set it to `false` for offline UI work without the API.
