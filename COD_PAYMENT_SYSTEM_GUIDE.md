# COD Payment Management & Commission Deduction System

## Complete Implementation Guide

---

## 🎯 System Overview

This is a **professional COD payment management and commission deduction system** for SpareKart, a multi-vendor automotive ecommerce marketplace. It handles:

1. **COD Payment Verification** - Admin approval/rejection of cash payments
2. **Automatic Commission Calculation** - Category-based commission deduction
3. **Seller Payout Management** - Scheduled and manual seller payments
4. **Real-time Earnings Tracking** - Seller commission dashboard
5. **Admin Reporting** - Commission analytics and payment insights

---

## 📦 Files Created

### 1. **Commission Types** (`src/modules/marketplace/commission-types.ts`)

Core data structures for the system:

```typescript
- CommissionRecord: Individual order commission tracking
- SellerPayout: Seller payment records with status
- CommissionDeductionSummary: Aggregated commission breakdown
- PayoutCycleConfig: Payout schedule configuration
- CODPaymentVerificationRequest/Response: Payment verification DTOs
- CommissionReport: Admin dashboard reports
- SellerEarningsSummary: Seller-facing earnings overview
```

**Key Features:**

- Tracks commission per order and per seller
- Supports multiple payout statuses (PENDING, SCHEDULED, PROCESSING, PAID, etc.)
- Category-based deduction tracking
- Historical payout records

---

### 2. **Commission Management** (`src/modules/marketplace/commission-management.ts`)

Business logic for commission calculations:

**Commission Calculation Engine:**

```typescript
getCommissionRateForCategory(); // Get rate for product category
calculateOrderCommission(); // Calculate commission for single order
calculateSellerCommissions(); // Batch commission calculation
calculateCommissionDeductionSummary(); // Aggregate commission data
```

**Payout Management:**

```typescript
createPayoutFromCommissions(); // Generate payout from commissions
generateSellerEarningsSummary(); // Create seller earnings overview
generateCommissionReport(); // Admin commission report
shouldGeneratePayout(); // Payout eligibility check
```

**Category Commission Rates (Configurable):**

- Engine: 10%
- Suspension: 12%
- Brakes: 11%
- Electrical: 15%
- Cooling: 10%
- Exhaust: 10%
- Fuel: 14%
- Transmission: 13%
- Steering: 12%
- Lights: 16%
- Body: 9%
- Interior: 20%
- Tyres & Wheels: 8%

**Default Payout Config:**

- Period: Monthly
- Minimum Payout: 1000 PKR
- Holding Period: 3 days after delivery
- Day of Month: 5th

---

### 3. **Admin Payment Verification** (`src/modules/marketplace/admin-payment-verification.ts`)

Admin-only payment verification logic:

**Core Functions:**

```typescript
canVerifyPayments(); // Authorization check
verifyCODPayment(); // Main verification handler
approvePayment(); // Approve COD payment and trigger commissions
rejectPayment(); // Reject COD payment
generatePaymentVerificationReport(); // Create verification status report
batchVerifyCODPayments(); // Batch process multiple paymentsholdPaymentForReview()             // Flag payment for investigation
releasePaymentFromHold(); // Release flagged payment with decision
```

**Access Control:**

- Only ADMIN and SUPER_ADMIN roles
- Role-based authorization checks

**Approval Workflow:**

1. Admin reviews pending COD payment
2. Admin can approve or reject with notes
3. On approval:
   - Order status → CONFIRMED
   - Payment status → PAID
   - Commissions automatically calculated
   - Inventory committed
4. On rejection:
   - Order status → PENDING
   - Payment status → REJECTED
   - Seller notified

---

### 4. **COD Payment Verification Panel** (`src/components/admin/CODPaymentVerificationPanel.tsx`)

Professional admin UI component:

**Features:**

- Real-time payment queue with filtering
- Search by order #, customer, phone
- Status badges (PENDING, UNDER_REVIEW, PAID, REJECTED)
- Payment amount and verification status
- Admin notes field (required for rejection)
- Batch processing support
- Commission breakdown on approval

**Layout:**

- Left: Payment queue table (searchable, filterable)
- Right: Verification details and action buttons
- Top: Summary statistics

---

### 5. **Seller Commission Dashboard** (`src/components/marketplace/SellerCommissionDashboard.tsx`)

Real-time earnings tracking for sellers:

**Seller Views:**

1. **Overview Stats:**
   - Total Earnings (all-time)
   - Total Commissions (deducted)
   - Pending Earnings (current period)
   - Scheduled Payouts (next cycle)

2. **Commission History Table:**
   - Order breakdown
   - Category-wise deductions
   - Commission rates
   - Net earning per order

3. **Payout History:**
   - Paid payouts
   - Scheduled payouts
   - Processing payouts
   - Status tracking

4. **Current Month Summary:**
   - Monthly earnings
   - Monthly commissions
   - Net monthly income

**Real-time Updates:**

- Tracks commission rates by category
- Shows pending vs. scheduled vs. paid
- Calculates net earnings automatically

---

### 6. **Admin Payments Dashboard** (`src/routes/admin.payments.tsx`)

Administrative payment and commission management page:

**Admin Views:**

1. **Overview Metrics:**
   - Total Commissions Earned
   - Payouts Paid
   - Pending Payouts
   - Active Sellers

2. **Commission Breakdown:**
   - By category
   - By seller (top 10)
   - Historical trends

3. **Payout Management:**
   - Recent payouts table
   - Status tracking
   - Period filtering
   - Seller details

---

## 🔄 Order Flow: COD Payment Process

```
Customer Places COD Order
    ↓
Order Created (status: PENDING)
    ↓
Payment Created (status: PENDING)
    ↓
Admin Reviews Payment (Verification Panel)
    ├→ APPROVED
    │   ↓
    │   Order Status → CONFIRMED
    │   Payment Status → PAID
    │   Commission Calculated & Deducted
    │   Inventory Committed
    │   ↓
    │   Seller can process order
    │
    └→ REJECTED
        ↓
        Order Status → PENDING
        Payment Status → REJECTED
        Seller notified
        ↓
        Retry available
```

---

## 💰 Commission Deduction Logic

**When it triggers:**

1. **COD Orders**: After admin approval
2. **Online Payment Orders**: On payment confirmation
3. **Manual**: Admin can manually calculate

**What it does:**

1. Identifies all items in order by seller
2. Groups by product category
3. Applies category commission rate
4. Deducts from seller's earnings
5. Records commission transaction
6. Creates audit log entry

**Example:**

```
Order Total: 10,000 PKR
Items:
  - Engine Part: 5,000 PKR (10% commission) = 4,500 PKR to seller
  - Suspension: 3,000 PKR (12% commission) = 2,640 PKR to seller
  - Interior: 2,000 PKR (20% commission) = 1,600 PKR to seller

Total Commission: 1,260 PKR (12.6% average)
Seller Net Earning: 8,740 PKR
```

---

## 📋 Payout Cycle

**Default: Monthly Payouts**

1. **Accumulation Phase** (Month)
   - Orders confirmed daily
   - Commissions calculated and deducted
   - Payouts deferred

2. **Aggregation Phase** (End of month)
   - All approved orders aggregated
   - Total earnings calculated
   - Total commissions calculated
   - Payout record created (status: SCHEDULED)

3. **Processing Phase** (5th of next month)
   - Payout processed
   - Status: PROCESSING
   - Seller notified

4. **Completion Phase**
   - Payment transferred
   - Status: PAID
   - Transaction reference recorded
   - Seller receives funds

**Holding Period:** 3 days after delivery before payout
**Minimum Payout:** 1000 PKR (configurable)

---

## 🔐 Security & Authorization

**Role-Based Access:**

| Feature                      | CUSTOMER | SELLER | ADMIN | SUPER_ADMIN |
| ---------------------------- | -------- | ------ | ----- | ----------- |
| View own commissions         | ✗        | ✓      | ✗     | ✗           |
| View all commissions         | ✗        | ✗      | ✓     | ✓           |
| Verify COD payments          | ✗        | ✗      | ✓     | ✓           |
| Manage payouts               | ✗        | ✗      | ✓     | ✓           |
| Manual commission adjustment | ✗        | ✗      | ✗     | ✓           |
| View commission reports      | ✗        | ✗      | ✓     | ✓           |

**Validation:**

- Payment method verification
- Amount validation
- Authorization checks before operations
- Audit trail for all changes

---

## 📊 Reports Available

### For Sellers:

- Earnings Summary (all-time and monthly)
- Commission Breakdown (by category)
- Payout History (with dates and amounts)
- Pending Payouts (upcoming)
- Average Commission Rate

### For Admins:

- Total Commissions Earned
- Total Payouts Paid
- Pending Payouts
- Commission by Category
- Commission by Seller (top 10)
- Payment Verification Queue
- Historical Payout Trends

---

## 🔌 Integration Points

### Existing Systems to Connect:

1. **State Management** (`useMarketplace` Hook)
   - Add commission records to state
   - Add payout records to state
   - Update order status transitions
   - Trigger notification system

2. **Notification System**
   - Payment verification status
   - Commission deduction alerts
   - Payout confirmation
   - Payout failure/hold alerts

3. **API Service**
   - Save Commission Records
   - Save Payout Records
   - Update Order Status
   - Payment verification endpoints

4. **Audit System**
   - Log commission calculations
   - Log payout creation
   - Log payment approvals/rejections
   - Track all modifications

---

## 📱 UI Workflow

### Admin Traffic Flow:

```
Admin Dashboard
    ↓
Payments Section
    ├→ Payment Verification Queue
    │   ├→ Filter by status/method
    │   ├→ Search orders
    │   └→ Approve/Reject with notes
    │
    └→ Commission Dashboard
        ├→ Overview metrics
        ├→ Category breakdown
        └→ Payout history
```

### Seller Traffic Flow:

```
Seller Dashboard
    ↓
Earnings Section
    ├→ Commission Summary
    │   ├→ Total earnings
    │   ├→ Total commissions
    │   └→ Current month
    │
    └→ Payout Details
        ├→ Commission history table
        ├→ Paid payouts
        └→ Scheduled payouts
```

---

## 🚀 Implementation Checklist

### Phase 1: Core Types & Logic ✅

- [x] Commission types
- [x] Commission calculation engine
- [x] Payout management logic
- [x] Admin verification system

### Phase 2: UI Components ✅

- [x] Admin payment verification panel
- [x] Seller commission dashboard
- [x] Admin payments dashboard

### Phase 3: Integration (TODO)

- [ ] Connect to Zustand store
- [ ] Add API endpoints for persistence
- [ ] Integrate with notification system
- [ ] Add audit logging
- [ ] Update order status transitions
- [ ] Add payment verification admin page

### Phase 4: Testing & Polish (TODO)

- [ ] Unit tests for commission calculations
- [ ] Integration tests for workflows
- [ ] E2E tests for full flow
- [ ] Performance optimization
- [ ] Error handling improvements

---

## 🔧 Configuration

### To modify commission rates:

Edit `CATEGORY_COMMISSION_RATES` in `commission-management.ts`

### To change payout schedule:

Edit `getDefaultPayoutCycleConfig()` function

### To add new seller tier rates:

Extend the commission calculation logic with seller tier lookup

---

## 📞 API Endpoints Needed

```
POST   /api/payments/verify-cod           # Admin: Verify COD payment
POST   /api/commissions/calculate         # Calculate commission for order
GET    /api/commissions/seller/:slug      # Get seller commissions
GET    /api/payouts/seller/:slug          # Get seller payouts
GET    /api/admin/commission-report       # Admin: Commission report
POST   /api/admin/payouts/generate        # Admin: Generate payouts
POST   /api/admin/payouts/:id/process     # Admin: Process payout
```

---

## 📋 Next Steps

1. **Store Integration**
   - Add commission records to Zustand state
   - Add payout records to Zustand state
   - Update order verification flow

2. **Payment Verification Page**
   - Create `/admin/payments/verify` route
   - Integrate CODPaymentVerificationPanel
   - Connect to state management

3. **Seller Earnings Page**
   - Create `/seller/earnings` route
   - Integrate SellerCommissionDashboard
   - Connect to seller's orders

4. **Notifications**
   - Payment verification notifications
   - Commission deduction alerts
   - Payout notifications

5. **Testing**
   - Test commission calculations
   - Test payout scheduling
   - Test admin verification flow

---

## 💡 Notes

- All amounts are in PKR (Pakistani Rupees)
- Commission rates are flexible and can be configured per category or seller tier
- System supports both automatic and manual payout triggering
- All operations are audit-logged for compliance
- Sellers can only see their own commission data
- Admins have full visibility across all sellers and commissions
