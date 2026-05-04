# SpareKart

SpareKart is a Next.js marketplace app with custom authentication, MongoDB-backed runtime services, Resend email delivery, Google OAuth login, guest checkout, seller/admin workflows, and deployment readiness checks.

`.env.example` is a template only. Do not commit real secrets to the repository. Use `.env` locally and your hosting provider's environment variable dashboard in staging/production.

## Local setup

1. Install dependencies:

```bash
npm ci
```

2. Copy the template and fill in real values:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

## Required environment variables

```env
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SPAREKART_RUNTIME_DIR=.sparekart-runtime

MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=sparekart

RESEND_API_KEY=re_example_replace_me
RESEND_FROM_EMAIL=no-reply@example.com
RESEND_FROM_NAME=SpareKart

GOOGLE_CLIENT_ID=replace-with-your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=replace-with-your-google-client-secret

JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters

SPAREKART_SEED_PASSWORD=replace-with-a-strong-seed-password
SPAREKART_SUPER_ADMIN_EMAIL=superadmin@example.com
SPAREKART_SUPER_ADMIN_PASSWORD=replace-with-a-strong-super-admin-password
```

Notes:

- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` must be set together for live delivery.
- If Resend is not configured, email previews are written to `SPAREKART_RUNTIME_DIR/email-previews`.
- Legacy aliases `SPAREKART_SUPERADMIN_EMAIL` and `SPAREKART_SUPERADMIN_PASSWORD` are still supported, but `SPAREKART_SUPER_ADMIN_*` is the preferred format.

## Google OAuth Configuration

To configure Google OAuth, you need to set up the OAuth consent screen and add authorized redirect URIs in the Google Cloud Console.

### Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add these authorized redirect URIs:

#### For Local Development:
```
http://localhost:3000/api/auth/google/callback
```

#### For Production:
```
https://sparekart.live/api/auth/google/callback
```

7. Save the client ID and secret, and add them to your `.env` file

### How It Works

The redirect URI is constructed dynamically using the `NEXT_PUBLIC_SITE_URL` environment variable:
- Local development: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Production: `NEXT_PUBLIC_SITE_URL=https://sparekart.live`

The complete redirect URI is: `{NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`

## Validation commands

Run these before deployment:

```bash
npm run doctor
npm run mongo:ping
npm run build
npm run start
```

Useful endpoints:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/mongodb/health`

Performance notes:

- `GET /api/health` is intentionally lightweight and does not require a database round-trip.
- `GET /api/ready` is the dependency-aware endpoint for MongoDB, email, OAuth, runtime storage, and deployment warnings.
- Public route transitions now use route-level loading states and a top progress bar so users see immediate feedback while Mongo-backed pages stream in.

## Data storage map

MongoDB collections used by SpareKart:

- `auth_runtime` for auth users, sessions, verification tokens, and password reset tokens
- `users` for marketplace user profiles and roles
- `seller_profiles`
- `products`
- `categories`
- `brands`
- `carts`
- `orders`
- `order_items`
- `payment_proofs`
- `inventory_items`
- `inventory_movements`
- `notifications`
- `admin_action_logs`
- `coupons`
- `coupon_redemptions`
- `reviews`
- `email_audits`
- `email_jobs`
- `marketplace_state` as the canonical marketplace snapshot used to rebuild the projection collections
- `sparekart_uploads.files` and `sparekart_uploads.chunks` for GridFS uploads, including payment proof images

Runtime file storage:

- `SPAREKART_RUNTIME_DIR/email-previews` for local email previews when Resend is intentionally disabled
- `SPAREKART_RUNTIME_DIR` write probes and operational temp files
- `auth-store.json` is only used as a fallback when MongoDB is not configured

Browser localStorage:

- `sparekart.guest-cart.v1`
- `sparekart.guest-coupon.v1`

That localStorage usage is limited to guest cart convenience. Checkout, orders, catalog data, seller/admin product updates, payment proof metadata, and order tracking are persisted in MongoDB.

## Local validation checklist

1. Register with email/password from `/register`.
2. Verify the account from `/verify-email`.
3. Log in from `/login`.
4. Request and confirm a password reset from `/forgot-password`.
5. Test Google login from `/login`.
6. Place a guest checkout order from `/checkout`.
7. Confirm order notifications and status emails.
8. Check `.sparekart-runtime/email-previews` when Resend is disabled.
9. Confirm `GET /api/mongodb/health` reports a successful Atlas connection.

## Deployment

SpareKart is currently best suited for a Node-capable host with a writable runtime directory, such as Render or Railway.

If you are deploying on Render Free, expect cold-start delays after inactivity. The app can show loading feedback, but the first request after spin-down will still be slower than a paid instance. Render Starter or higher is recommended for serious production traffic.

Recommended production env vars:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://sparekart.live`
- `SPAREKART_RUNTIME_DIR=/opt/render/project/runtime/sparekart`
- `MONGODB_URI=...`
- `MONGODB_DB_NAME=sparekart`
- `RESEND_API_KEY=...`
- `RESEND_FROM_EMAIL=...`
- `RESEND_FROM_NAME=SpareKart`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `JWT_SECRET=...`
- `SPAREKART_SEED_PASSWORD=...`
- `SPAREKART_SUPER_ADMIN_EMAIL=...`
- `SPAREKART_SUPER_ADMIN_PASSWORD=...`

See [DEPLOYMENT.md](/Users/mm/drive-deliver-marketplace/DEPLOYMENT.md) for the full deployment guide and handoff checklist.
