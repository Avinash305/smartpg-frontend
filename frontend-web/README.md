# PG Management System – Production Guide

This document summarizes the minimal steps to deploy the PG Management System to production.

## 1) Backend (Django)

- __Env variables (set on the server)__
  - `DEBUG=False`
  - `SECRET_KEY=your-strong-secret`
  - `ALLOWED_HOSTS=api.yourdomain.com,123.45.67.89`
  - `CORS_ALLOWED_ORIGINS=https://app.yourdomain.com`
  - `CSRF_TRUSTED_ORIGINS=https://app.yourdomain.com`
  - `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME`
  - `REDIS_URL=redis://HOST:6379/0`
  - Email (if sending emails): `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`, `EMAIL_USE_TLS`/`EMAIL_USE_SSL`

- __Install and initialize__
  - Create venv and install deps:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```
  - Run migrations and collect static:
    ```bash
    python manage.py migrate
    python manage.py collectstatic --noinput
    ```

- __Run processes__
  - Gunicorn (Django):
    ```bash
    gunicorn backend.wsgi:application --bind 0.0.0.0:8000
    ```
  - Celery worker:
    ```bash
    celery -A backend worker -l info
    ```
  - Celery beat (scheduled tasks):
    ```bash
    celery -A backend beat -l info
    ```

- __Notes__
  - Security headers, HSTS, secure cookies, and WhiteNoise hashed static files are automatically enabled when `DEBUG=False` in `backend/backend/settings.py`.
  - Media uploads default to local disk `backend/media/`. For production, prefer S3/Cloudinary.

## 2) Frontend (Vite + React)

- __Create a production env file__ at `frontend-web/.env.production`:
  ```bash
  VITE_API_URL=https://api.yourdomain.com/api
  ```
- __Build__:
  ```bash
  cd frontend-web
  npm ci
  npm run build
  ```
- __Host__ the generated `frontend-web/dist/` via Nginx, a CDN, or a static hosting service (Netlify/Vercel/S3+CloudFront).

## 3) Nginx (example)

- Reverse proxy HTTPS traffic to Gunicorn at `127.0.0.1:8000`.
- Serve Django static from `backend/staticfiles/` at `/static/`.
- Serve media locally at `/media/` (or offload to S3/Cloudinary).
- Ensure `X-Forwarded-Proto` is set so Django sees HTTPS.

## 4) Housekeeping

- Remove the unused file `backend/accounts/settings.py` to avoid confusion with JWT settings (the canonical settings live in `backend/backend/settings.py`).
- Provide strong unique secrets and rotate them periodically.
- Add monitoring/alerts (e.g., Sentry) if desired.

## 5) Quick checklist

- [ ] Env vars set (backend + frontend)
- [ ] Postgres + Redis reachable
- [ ] `migrate` and `collectstatic` done
- [ ] Gunicorn + Celery worker + Celery beat running
- [ ] Frontend built with correct `VITE_API_URL`
- [ ] Nginx proxy and HTTPS configured
