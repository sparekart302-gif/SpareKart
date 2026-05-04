# SpareKart Deployment Guide

This guide covers local validation, Google OAuth, Resend, MongoDB Atlas, and production deployment for SpareKart.

## 1. Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- a writable runtime directory
- a `.env` file created from `.env.example`

## 2. Environment variables

`.env.example` contains placeholder values only. Replace them in your local `.env` and in your hosting dashboard.

```env
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SPAREKART_RUNTIME_DIR=.sparekart-runtime

MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=sparekart

RESEND_API_KEY=re_example_replace_me
RESEND_FROM_EMAIL=noreply@sparekart.live
RESEND_FROM_NAME=SpareKart

GOOGLE_CLIENT_ID=replace-with-your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=replace-with-your-google-client-secret

JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters

SPAREKART_SEED_PASSWORD=replace-with-a-strong-seed-password
SPAREKART_SUPER_ADMIN_EMAIL=superadmin@example.com
SPAREKART_SUPER_ADMIN_PASSWORD=replace-with-a-strong-super-admin-password
```

Notes:

- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` must be set together for live email delivery.
- `RESEND_FROM_EMAIL` must use a verified sender domain. Do not use personal inbox domains like `gmail.com`, `yahoo.com`, or `outlook.com`, because Resend will reject them.
- If Resend is disabled, email previews are written to `SPAREKART_RUNTIME_DIR/email-previews`.
- `SPAREKART_SUPERADMIN_EMAIL` and `SPAREKART_SUPERADMIN_PASSWORD` are still accepted as legacy aliases if an older `.env` already uses them.

For production deployment, set:

- `NEXT_PUBLIC_SITE_URL=https://sparekart.live`

## 3. Google Cloud OAuth setup

To configure Google OAuth, you need to set up the OAuth consent screen and add authorized redirect URIs in the Google Cloud Console.

### Environment Variables

Make sure these environment variables are set in your production environment:

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

7. Save the client ID and secret, and add them to your production environment variables

### How It Works

The redirect URI is constructed dynamically using the `NEXT_PUBLIC_SITE_URL` environment variable:

- Local development: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- Production: `NEXT_PUBLIC_SITE_URL=https://sparekart.live`

The complete redirect URI is: `{NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`

## 4. Resend setup

Set:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`

Recommended production sender:

- `RESEND_FROM_EMAIL=noreply@sparekart.live`

If Resend is omitted, SpareKart falls back to local preview files in:

- `.sparekart-runtime/email-previews` locally
- `${SPAREKART_RUNTIME_DIR}/email-previews` on hosted environments

Supported email flows:

- email verification
- password reset OTP
- order confirmation to customer
- seller order notification
- order status update
- payment proof notification

Production requirements:

- verify the sender domain in Resend before go-live
- publish the DNS records Resend provides for:
  - SPF
  - DKIM
  - DMARC
- keep `RESEND_API_KEY` server-side only

Admin-only delivery test:

```text
POST /api/email/test
```

This endpoint requires an authenticated `ADMIN` or `SUPER_ADMIN` session and confirms whether the current Resend API key and sender domain can deliver live mail.

## 5. MongoDB Atlas setup

Set:

- `MONGODB_URI`
- `MONGODB_DB_NAME`

Primary marketplace collections:

- `auth_runtime`
- `users`
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

Supporting collections:

- `marketplace_state` for the canonical Mongo-backed marketplace snapshot
- `sparekart_uploads.files`
- `sparekart_uploads.chunks`

Validation:

```bash
npm run mongo:ping
```

Health endpoint:

```text
GET /api/mongodb/health
```

## 6. Local validation commands

Install dependencies:

```bash
npm ci
```

Run the doctor:

```bash
npm run doctor
```

Check MongoDB Atlas:

```bash
npm run mongo:ping
```

Build:

```bash
npm run build
```

Start the production server locally:

```bash
npm run start
```

## 7. Manual local validation checklist

### Auth

1. Open `/register`.
2. Create a customer account with email/password.
3. Confirm the verification email is delivered through Resend or saved as a preview.
4. Verify the account from `/verify-email`.
5. Log in from `/login`.
6. Test Google login from `/login`.
7. Open `/forgot-password`, request an OTP, and complete the reset flow.

### Guest checkout and order notifications

1. Add products to the cart without signing in.
2. Place a guest order from `/checkout`.
3. Confirm the guest order email is stored or delivered.
4. Confirm the seller notification email is stored or delivered.
5. Open `/order-tracking` and confirm guest lookup works.
6. Update an order status from seller/admin views and confirm the customer status email is generated.

### MongoDB admin APIs

Sign in as an admin before testing these protected endpoints:

1. `GET /api/mongodb/health`
2. `GET /api/mongodb/products`
3. `POST /api/mongodb/products`
4. `PATCH /api/mongodb/products/:productId`
5. `DELETE /api/mongodb/products/:productId`
6. Repeat the same pattern for `/api/mongodb/users`
7. `GET /api/mongodb/orders`
8. `GET /api/mongodb/orders/:orderId`
9. `POST /api/email/test`

Notes:

- Order creation is intentionally handled through checkout and `/api/marketplace/command`, not direct admin CRUD.
- Seller/admin order progression is intentionally handled through the marketplace workflow endpoints so payment, inventory, notifications, and audit logs stay synchronized.

## 8. Readiness endpoints

Basic health:

```text
GET /api/health
```

`/api/health` is intentionally lightweight and should stay fast even if MongoDB is slow or restarting.

Deployment readiness:

```text
GET /api/ready
```

`/api/ready` returns:

- `status: "ready"` when checks pass cleanly
- `status: "warning"` when the app can run but still has notable deployment warnings
- `status: "not_ready"` when a blocking issue exists

## 9. Render deployment for sparekart.live

### Prerequisites

1. GitHub repository with SpareKart code pushed to `main` branch
2. MongoDB Atlas account with cluster running
3. Resend account with API key and sender domain verification
4. Google OAuth credentials created in Google Cloud Console
5. Domain sparekart.live registered and ready for DNS configuration

### Render Web Service Setup

1. Log in to [Render](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the Web Service with these exact settings:
   - **Name**: `sparekart`
   - **Environment**: Node
   - **Node Version**: 20 (or the version specified in package.json engines)
   - **Region**: Choose closest to your users (e.g., us-east-1 for US)
   - **Branch**: main
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Standard or Pro (depending on traffic expectations)

If you deploy on Render Free, expect cold starts after inactivity. That can make the first request noticeably slower even when the app is healthy. Upgrade to Starter or higher if you want more consistent response times in production.

### Environment Variables for Render

In your Render Web Service settings, add these environment variables in the "Environment" section:

```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SITE_URL=https://sparekart.live

SPAREKART_RUNTIME_DIR=/opt/render/project/runtime/sparekart

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=sparekart

RESEND_API_KEY=re_replace_with_your_resend_api_key
RESEND_FROM_EMAIL=noreply@sparekart.live
RESEND_FROM_NAME=SpareKart

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

JWT_SECRET=generate-a-random-32-plus-character-secret-use-cryptography

SPAREKART_SEED_PASSWORD=your-seed-password-for-dev-accounts
SPAREKART_SUPER_ADMIN_EMAIL=admin@sparekart.live
SPAREKART_SUPER_ADMIN_PASSWORD=your-super-admin-password
```

**Important:** Do NOT commit these values to GitHub. Use Render's environment dashboard only.

### Custom Domain Setup (sparekart.live)

1. In Render Web Service dashboard:
   - Navigate to Settings → Custom Domains
   - Click "Add Custom Domain"
   - Enter `sparekart.live`

2. Update your domain registrar's DNS records:
   - Point `sparekart.live` to the CNAME provided by Render
   - Wait for DNS propagation (usually 5–30 minutes)

3. Verify SSL certificate:
   - Render will automatically provision a Let's Encrypt certificate
   - Check that https://sparekart.live loads without SSL warnings

### Google OAuth Configuration for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to APIs & Services → Credentials
4. Edit your OAuth 2.0 Client ID credentials:
   - **Authorized JavaScript Origins**: `https://sparekart.live`
   - **Authorized Redirect URIs**: `https://sparekart.live/api/auth/google/callback`
5. Save changes

### Resend Email Configuration for Production

1. Log in to [Resend](https://resend.com)
2. Add and verify your domain:
   - Go to Domains → Add Domain
   - Enter `sparekart.live`
   - Complete DNS verification (add MX/TXT records to your registrar)
3. Set sender email:
   - Use `noreply@sparekart.live` as the verified sender
   - Render will send all marketplace emails from this address
4. Configure email limits if needed (e.g., rate limiting for high-traffic periods)

### MongoDB Atlas Configuration for Production

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Ensure your cluster is running and has a database named `sparekart`
3. Create a database user with strong password
4. Whitelist Render's IP addresses (or use "Allow access from anywhere" with caution)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Select "Drivers"
   - Copy the connection string and replace `<username>`, `<password>`, and `<dbname>`
   - Set as `MONGODB_URI` in Render environment

### First Deployment

1. Commit and push your code to GitHub main branch
2. Render will automatically detect the push and start building
3. Monitor the build and deploy logs in Render dashboard
4. Wait for deployment to complete (usually 5–10 minutes)

### Post-Deployment Validation

Check that the app is running:

```bash
curl https://sparekart.live/api/health
curl https://sparekart.live/api/ready
curl https://sparekart.live/api/mongodb/health
```

Expected responses:

- `/api/health` → `status: "ok"` or `"warning"`
- `/api/ready` → `status: "ready"` or `"warning"`
- `/api/mongodb/health` → `status: "ready"` (if MongoDB is configured)

### Testing the Production Deployment

1. **Register a new account**:
   - Visit https://sparekart.live/register
   - Create a customer account
   - Verify the verification email is delivered via Resend

2. **Test email verification**:
   - Check your email for the verification code
   - Complete the verification from https://sparekart.live/verify-email

3. **Test login**:
   - Log in from https://sparekart.live/login
   - Verify the session works correctly

4. **Test Google OAuth**:
   - Click "Sign in with Google" on login page
   - Verify the OAuth flow completes and you're logged in

5. **Test guest checkout**:
   - Add products to cart without signing in
   - Complete checkout from https://sparekart.live/checkout
   - Verify order confirmation email is sent

6. **Test admin access**:
   - Log in as super admin with credentials from `SPAREKART_SUPER_ADMIN_EMAIL` and `SPAREKART_SUPER_ADMIN_PASSWORD`
   - Verify admin dashboard at https://sparekart.live/admin works
   - Test user management, product management, etc.

### Monitoring and Troubleshooting

**View logs**:

- In Render dashboard, open your Web Service
- Click "Logs" tab to see real-time logs
- Look for any errors or warnings

**Common issues**:

- If MongoDB connection fails, verify MONGODB_URI is correct and Render IP is whitelisted
- If emails don't send, verify RESEND_API_KEY and RESEND_FROM_EMAIL are set correctly
- If Google OAuth fails, verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET match your credentials

**Scale up**:

- If experiencing high traffic, upgrade your Render plan
- Consider using Render's background workers for email processing if needed

### Ongoing Operations

- Monitor `/api/health` and `/api/ready` endpoints regularly
- Keep MongoDB Atlas and Resend accounts funded
- Rotate secrets regularly (JWT_SECRET, etc.) via Render environment dashboard
- Backup MongoDB Atlas data regularly via Atlas Backup settings

## 10. Current limitation

The only intended browser-local marketplace state is the guest cart and guest coupon cache used for unauthenticated browsing convenience.

This does not affect production-critical persistence. Catalog data, users, seller profiles, carts, orders, order items, payment proofs, inventory, notifications, reviews, audit logs, email jobs, email audits, auth runtime data, and upload metadata are stored in MongoDB.
