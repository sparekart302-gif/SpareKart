# SpareKart Deployment Guide

This project currently supports local validation of:

- email/password signup and login
- email verification
- OTP-based password reset
- guest checkout
- order confirmation and order-status emails
- seller/customer order notification emails

## 1. Local prerequisites

- Node.js 20 or newer
- npm 10 or newer
- a `.env` file copied from `.env.example`

## 2. Local environment setup

Create `.env` in the project root and start with:

```env
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SPAREKART_RUNTIME_DIR=.sparekart-runtime

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=sparekart

RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=SpareKart

SPAREKART_SEED_PASSWORD=SpareKart123!
```

Notes:

- Set both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` together when enabling live email delivery.
- If both are empty, emails are written to `.sparekart-runtime/email-previews`.
- `SPAREKART_RUNTIME_DIR` is where auth runtime data and email audit files are stored.
- `MONGODB_URI` is used by the new Mongoose CRUD APIs and Atlas connectivity.

## 3. Local validation commands

Install dependencies:

```bash
npm ci
```

Run the deployment doctor:

```bash
npm run doctor
```

Test MongoDB Atlas directly:

```bash
npm run mongo:ping
```

Build for production:

```bash
npm run build
```

Start local development:

```bash
npm run dev
```

## 4. Manual local test checklist

### Auth

1. Open `/register`.
2. Create a customer account with a real or test email.
3. Confirm a verification code email is sent through Resend, or check `.sparekart-runtime/email-previews`.
4. Open `/verify-email` and verify the account.
5. Log in from `/login`.
6. Open `/forgot-password`, request an OTP, and confirm the reset flow completes.

### Guest checkout

1. Add one or more products to the cart without logging in.
2. Go to `/checkout`.
3. Use the guest checkout flow and place an order.
4. Confirm the guest order lookup works on `/order-tracking`.

### Order notifications

1. Place a customer order with an email address.
2. Confirm the customer receives an order confirmation email.
3. Confirm the seller receives a seller-side order confirmation email.
4. Update the order status to `SHIPPED` from the seller/admin workflow.
5. Confirm the customer receives the order-status email.
6. For manual payment methods, upload payment proof and confirm the payment-proof email is generated.

### MongoDB CRUD

1. Hit `GET /api/mongodb/health` and confirm Atlas connectivity.
2. Create a product with `POST /api/mongodb/products`.
3. Read products with `GET /api/mongodb/products?page=1&limit=20`.
4. Update a product with `PATCH /api/mongodb/products/:productId`.
5. Delete a product with `DELETE /api/mongodb/products/:productId`.
6. Repeat the same pattern for `/api/mongodb/users` and `/api/mongodb/orders`.

## 5. Readiness endpoints

Health check:

```text
GET /api/health
```

Deployment readiness report:

```text
GET /api/ready
```

`/api/ready` returns warnings when important deployment limitations still exist, such as browser-local marketplace state.

## 6. Recommended free-tier deployment path

For the current build, the safest deployment target is a Node-capable platform that supports a writable server runtime path:

- Render
- Railway
- Fly.io

Why:

- auth runtime data is stored server-side
- email outbox and audit files are stored server-side
- fully serverless platforms are a poor fit until shared backend persistence replaces browser-local marketplace state and file-backed runtime storage

## 7. Render-style deployment settings

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm run start
```

Important environment variables:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://your-domain.example`
- `SPAREKART_RUNTIME_DIR=/opt/render/project/runtime/sparekart`
- `MONGODB_URI=...`
- `MONGODB_DB_NAME=sparekart`
- `RESEND_API_KEY=...`
- `RESEND_FROM_EMAIL=...`
- `RESEND_FROM_NAME=SpareKart`

## 8. Important current limitation

The marketplace workflow state is still browser-local for the demo build. That means:

- cart state is browser-specific
- operational order and catalog changes are not yet backed by shared persistent marketplace storage

This setup is fine for local testing and controlled demos, but a full production rollout should move shared marketplace state into backend persistence before going live at scale.
