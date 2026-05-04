export type ResourcePageLink = {
  label: string;
  to: string;
  description?: string;
};

export type ResourcePageSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
};

export type ResourcePageContent = {
  breadcrumbLabel: string;
  description: string;
  eyebrow: string;
  metaDescription: string;
  sections: ResourcePageSection[];
  supportActions: ResourcePageLink[];
  supportBody: string;
  supportTitle: string;
  title: string;
  updatedLabel: string;
};

export const privacyPolicyPage: ResourcePageContent = {
  breadcrumbLabel: "Privacy Policy",
  eyebrow: "Privacy & data",
  title: "Privacy Policy",
  description:
    "How SpareKart collects, uses, stores, and protects customer, seller, and order information across the marketplace.",
  metaDescription:
    "Read how SpareKart handles account data, order records, payment proof uploads, and support communications.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "What we collect",
      paragraphs: [
        "We collect the information you provide when you create an account, place an order, contact support, apply as a seller, or upload payment proof.",
        "This can include your name, email address, phone number, delivery address, vehicle details, order history, support messages, and seller onboarding details.",
      ],
    },
    {
      title: "How we use your information",
      bullets: [
        "To create and manage your SpareKart account",
        "To process orders, delivery, returns, and refunds",
        "To send verification, password reset, and order status emails",
        "To help sellers fulfill marketplace orders accurately",
        "To prevent fraud, abuse, and unauthorized access",
      ],
    },
    {
      title: "Payment and proof uploads",
      paragraphs: [
        "SpareKart supports Cash on Delivery and selected manual payment methods. When you upload payment proof, we store the file reference and related transaction details so our operations team can verify the order.",
        "We do not store full payment card data inside SpareKart.",
      ],
    },
    {
      title: "Cookies and sessions",
      paragraphs: [
        "We use secure cookies and session tokens to keep you signed in, protect your account, and support essential marketplace actions.",
        "Guest cart data may also be stored in your browser to preserve your current shopping session before checkout.",
      ],
    },
    {
      title: "Retention and security",
      paragraphs: [
        "We retain operational records only as long as needed for order support, compliance, fraud prevention, platform governance, and reporting.",
        "We use access controls, secure transport, and role-based permissions to reduce the risk of unauthorized access.",
      ],
      note: "If you need help with account data or order history, contact the SpareKart support team from the Help Centre.",
    },
  ],
  supportTitle: "Need help with your data?",
  supportBody:
    "Use the Help Centre for account, order, or privacy-related requests. If you are a seller, use the seller resources below for marketplace operations questions.",
  supportActions: [
    { label: "Visit Help Centre", to: "/help", description: "Support for customers and orders" },
    {
      label: "Track an Order",
      to: "/order-tracking",
      description: "Look up guest or customer orders",
    },
    { label: "Seller Help", to: "/seller-help", description: "Operational help for stores" },
  ],
};

export const termsOfServicePage: ResourcePageContent = {
  breadcrumbLabel: "Terms of Service",
  eyebrow: "Marketplace rules",
  title: "Terms of Service",
  description:
    "The terms that govern customer, seller, and admin use of the SpareKart marketplace.",
  metaDescription:
    "Read the terms for accounts, orders, seller conduct, returns, and marketplace platform use on SpareKart.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Using SpareKart",
      paragraphs: [
        "By accessing SpareKart, you agree to use the platform lawfully and provide accurate account, order, and contact information.",
        "You are responsible for keeping your login details secure and for activity performed under your account.",
      ],
    },
    {
      title: "Orders and marketplace availability",
      paragraphs: [
        "Products listed on SpareKart are supplied by verified sellers, but stock, pricing, and dispatch timing can change. Orders are confirmed only after the platform accepts checkout and the relevant seller can fulfill the order.",
        "If an item becomes unavailable or requires operational review, SpareKart may contact you with an update, replacement option, or refund path.",
      ],
    },
    {
      title: "Seller responsibilities",
      bullets: [
        "List accurate product titles, fitment details, condition, and pricing",
        "Dispatch within the promised processing window",
        "Respond to buyer and platform requests in a timely way",
        "Honor approved returns, warranty, and marketplace policy decisions",
      ],
    },
    {
      title: "Restricted behavior",
      bullets: [
        "Fraudulent orders, fake proof uploads, or payment abuse",
        "Misleading product listings or counterfeit inventory",
        "Attempts to bypass platform security or admin controls",
        "Harassment, abuse, or misuse of support channels",
      ],
    },
    {
      title: "Policy enforcement",
      paragraphs: [
        "SpareKart may suspend listings, restrict access, cancel transactions, or remove accounts where policy violations, fraud, or repeated operational failures are identified.",
      ],
      note: "For seller-specific onboarding, pricing, and governance details, review the Seller Policies and Pricing & Fees pages.",
    },
  ],
  supportTitle: "Questions about the rules?",
  supportBody:
    "Use our public help resources first, then contact support if you need a policy clarification tied to a live order or account issue.",
  supportActions: [
    { label: "Help Centre", to: "/help", description: "Common order and support answers" },
    {
      label: "Seller Policies",
      to: "/seller-policies",
      description: "Marketplace seller standards",
    },
    {
      label: "Pricing & Fees",
      to: "/pricing-fees",
      description: "Seller commission and payout overview",
    },
  ],
};

export const returnsRefundsPage: ResourcePageContent = {
  breadcrumbLabel: "Returns & Refunds",
  eyebrow: "Order support",
  title: "Returns & Refunds",
  description:
    "SpareKart return windows, fitment support, refund handling, and operational rules for order issues.",
  metaDescription:
    "Learn how SpareKart handles fitment returns, damaged items, dispatch issues, and customer refunds.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Fitment-first support",
      paragraphs: [
        "If a part arrives and does not match the intended vehicle fitment, contact SpareKart support as soon as possible with your order number, vehicle details, and clear photos if needed.",
        "Our team may ask for additional details so we can confirm whether the issue is fitment mismatch, listing error, shipping damage, or installation-related.",
      ],
    },
    {
      title: "Standard return windows",
      bullets: [
        "Most verified sellers support 5 to 14 day return windows depending on the product and category",
        "Items should be unused, complete, and returned with original packaging where possible",
        "Electrical, special-order, or installation-sensitive items may follow stricter rules",
      ],
    },
    {
      title: "Refund handling",
      paragraphs: [
        "Approved refunds are processed after the returned item or order issue has been validated. Timing can vary based on the payment method and the nature of the issue.",
        "Cash on Delivery and manual payment orders may require an additional review step before settlement is closed.",
      ],
    },
    {
      title: "Non-returnable situations",
      bullets: [
        "Parts damaged by misuse, incorrect installation, or modification",
        "Consumables or opened items that cannot be safely resold",
        "Orders where the buyer provided incorrect fitment details and the listing itself was accurate",
      ],
    },
    {
      title: "How to start a return",
      paragraphs: [
        "Use the Help Centre or your order flow to contact SpareKart with the order number, the issue, and any evidence needed for review.",
      ],
      note: "Order tracking and support updates depend on accurate order number and contact details from checkout.",
    },
  ],
  supportTitle: "Need order support now?",
  supportBody:
    "Start with the tracking and help pages so the team can identify the order, seller, and current order state quickly.",
  supportActions: [
    {
      label: "Track an Order",
      to: "/order-tracking",
      description: "Look up your order details first",
    },
    { label: "Help Centre", to: "/help", description: "Support guidance and FAQ" },
    {
      label: "Payment Methods",
      to: "/payment-methods",
      description: "Manual payment and COD guidance",
    },
  ],
};

export const shippingInfoPage: ResourcePageContent = {
  breadcrumbLabel: "Shipping Info",
  eyebrow: "Delivery expectations",
  title: "Shipping Information",
  description:
    "Delivery timelines, multi-seller order behavior, and logistics guidance for SpareKart customers and sellers.",
  metaDescription:
    "Read how SpareKart handles standard shipping, express delivery, split shipments, and order tracking.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Delivery timelines",
      paragraphs: [
        "Standard delivery usually takes 3 to 5 business days across major cities in Pakistan. Some sellers may offer faster delivery windows for select locations and categories.",
        "Remote areas, large items, or multi-seller orders can take longer depending on stock location and courier routing.",
      ],
    },
    {
      title: "Split shipments",
      paragraphs: [
        "Because SpareKart is a multi-seller marketplace, one checkout can be fulfilled by more than one verified seller.",
        "That means items in the same order may dispatch separately and arrive at different times, especially when stores operate from different cities.",
      ],
    },
    {
      title: "Shipping charges",
      bullets: [
        "Shipping fees may vary by seller, region, and item type",
        "Some stores offer free shipping above their listed threshold",
        "Express or special handling options may cost more",
      ],
    },
    {
      title: "Tracking and delivery issues",
      paragraphs: [
        "Use the order tracking page to check the latest order status. If a package is delayed, marked delivered incorrectly, or arrives damaged, contact support with the order number immediately.",
      ],
    },
    {
      title: "Seller dispatch standards",
      paragraphs: [
        "Verified sellers are expected to dispatch within their stated handling window and keep status changes accurate so customers receive timely updates.",
      ],
      note: "Shipping performance can affect seller visibility, account health, and future marketplace eligibility.",
    },
  ],
  supportTitle: "Need delivery help?",
  supportBody:
    "If a shipment looks delayed or split across stores, check tracking first and then contact support with the exact order reference.",
  supportActions: [
    { label: "Track an Order", to: "/order-tracking", description: "Live order status lookup" },
    {
      label: "Returns & Refunds",
      to: "/returns-refunds",
      description: "What to do if something goes wrong",
    },
    { label: "Help Centre", to: "/help", description: "Shipping and logistics FAQ" },
  ],
};

export const paymentMethodsPage: ResourcePageContent = {
  breadcrumbLabel: "Payment Methods",
  eyebrow: "Checkout guidance",
  title: "Payment Methods",
  description:
    "Supported checkout methods on SpareKart and how manual payment proof verification works.",
  metaDescription:
    "Review Cash on Delivery, bank transfer, Easypaisa, JazzCash, and payment proof guidance for SpareKart orders.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Supported methods",
      bullets: ["Cash on Delivery", "Bank Transfer", "Easypaisa", "JazzCash"],
    },
    {
      title: "Cash on Delivery",
      paragraphs: [
        "COD stays available on eligible marketplace orders and lets you pay the courier at delivery. Seller payout release may still depend on platform-side cash verification after completion.",
      ],
    },
    {
      title: "Manual payments",
      paragraphs: [
        "For bank transfer, Easypaisa, and JazzCash, SpareKart may ask you to upload payment proof after checkout so the order can move into confirmation and seller fulfillment.",
        "Provide a readable screenshot or photo with the transaction reference and the correct paid amount to avoid delays.",
      ],
    },
    {
      title: "Verification timing",
      paragraphs: [
        "Manual payment review typically happens after proof is submitted and checked by the platform team. Orders may remain in review states until the proof is accepted.",
      ],
    },
    {
      title: "Failed or unclear proofs",
      bullets: [
        "Blurry images may delay approval",
        "Incorrect transaction references can block confirmation",
        "Missing or mismatched payment amounts may require follow-up",
      ],
      note: "If you submitted proof and the order has not moved forward, use the tracking page or support flow with the order number.",
    },
  ],
  supportTitle: "Need payment help?",
  supportBody:
    "Use the order lookup flow if you need to resubmit proof, confirm a status, or understand what the next payment review step is.",
  supportActions: [
    {
      label: "Track an Order",
      to: "/order-tracking",
      description: "Check proof and payment status",
    },
    {
      label: "Shipping Info",
      to: "/shipping-info",
      description: "What happens after payment confirmation",
    },
    { label: "Help Centre", to: "/help", description: "FAQ for payment and verification" },
  ],
};

export const sellerPoliciesPage: ResourcePageContent = {
  breadcrumbLabel: "Seller Policies",
  eyebrow: "For marketplace sellers",
  title: "Seller Policies",
  description:
    "Operational and quality standards that verified sellers must follow on the SpareKart marketplace.",
  metaDescription:
    "Read SpareKart seller standards for listing quality, dispatch, communication, fitment accuracy, and policy enforcement.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Approval and verification",
      paragraphs: [
        "Sellers must complete the SpareKart onboarding and verification process before they can operate live on the marketplace.",
        "Approval can depend on store details, operating history, product category risk, and policy review results.",
      ],
    },
    {
      title: "Catalog quality requirements",
      bullets: [
        "Use accurate titles, brand names, fitment details, and condition descriptions",
        "Do not list counterfeit, misleading, or prohibited products",
        "Keep pricing, stock, and warranty expectations current",
      ],
    },
    {
      title: "Fulfillment expectations",
      bullets: [
        "Accept and process marketplace orders promptly",
        "Ship within your stated operational window",
        "Keep status changes accurate inside the seller workspace",
        "Respond to customer and platform escalations professionally",
      ],
    },
    {
      title: "Returns, disputes, and policy reviews",
      paragraphs: [
        "Sellers are expected to cooperate with platform-side reviews for fitment issues, returns, proof verification, payout holds, and account audits.",
        "Repeated fulfillment failures, poor communication, or catalog issues can lead to restrictions, payout holds, or removal.",
      ],
    },
    {
      title: "Trust signals and account health",
      paragraphs: [
        "Seller visibility on SpareKart depends on fulfillment quality, accurate stock, review history, response time, and adherence to marketplace policy.",
      ],
      note: "Operational health is continuously monitored to protect customer trust across the marketplace.",
    },
  ],
  supportTitle: "Need seller guidance?",
  supportBody:
    "Review seller operations resources first, then use onboarding or support routes if you need help getting your store live or keeping it healthy.",
  supportActions: [
    { label: "Seller Help", to: "/seller-help", description: "Operational guidance for stores" },
    { label: "Pricing & Fees", to: "/pricing-fees", description: "Commission and payout overview" },
    {
      label: "Become a Seller",
      to: "/seller-onboarding",
      description: "Start the onboarding flow",
    },
  ],
};

export const pricingFeesPage: ResourcePageContent = {
  breadcrumbLabel: "Pricing & Fees",
  eyebrow: "For marketplace sellers",
  title: "Pricing & Fees",
  description:
    "A high-level explanation of SpareKart commission, payout review, and marketplace fee expectations for sellers.",
  metaDescription:
    "Understand the SpareKart commission model, payout timing, adjustments, and fee-related seller expectations.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Commission model",
      paragraphs: [
        "SpareKart charges a marketplace commission on completed orders to support platform operations, seller discovery, trust tooling, and customer support.",
        "Commission rates can vary based on seller tier, product category, policy standing, or promotional terms.",
      ],
    },
    {
      title: "Payout review and release",
      paragraphs: [
        "Seller payouts may be reviewed before release, especially for manual payment verification, COD settlement confirmation, refunds, disputes, or account governance checks.",
      ],
    },
    {
      title: "Possible adjustments",
      bullets: [
        "Approved refunds or cancellations",
        "Charge or settlement discrepancies",
        "Marketplace policy penalties or payout holds",
        "Coupon or promotion cost sharing where applicable",
      ],
    },
    {
      title: "Seller pricing expectations",
      paragraphs: [
        "Sellers are responsible for listing accurate product prices, respecting campaign commitments, and avoiding misleading discount claims.",
        "Repeated pricing abuse or mismatch between listing and real fulfillment can trigger enforcement actions.",
      ],
    },
    {
      title: "Need exact commercial terms?",
      paragraphs: [
        "Your final commercial terms depend on your seller setup, category mix, risk profile, and current marketplace program.",
      ],
      note: "Use seller onboarding or support to confirm the exact commission and payout terms that apply to your store.",
    },
  ],
  supportTitle: "Need your store terms clarified?",
  supportBody:
    "Use seller resources to confirm the commercial structure that applies to your current or planned marketplace account.",
  supportActions: [
    { label: "Seller Help", to: "/seller-help", description: "Operational and commercial help" },
    {
      label: "Seller Policies",
      to: "/seller-policies",
      description: "Platform standards and governance",
    },
    {
      label: "Become a Seller",
      to: "/seller-onboarding",
      description: "Apply to join the marketplace",
    },
  ],
};

export const sellerHelpPage: ResourcePageContent = {
  breadcrumbLabel: "Seller Help",
  eyebrow: "For marketplace sellers",
  title: "Seller Help",
  description:
    "Guidance for onboarding, catalog quality, order handling, payout readiness, and day-to-day seller operations on SpareKart.",
  metaDescription:
    "Read SpareKart seller help guidance for store setup, fulfillment, account health, and payout preparation.",
  updatedLabel: "Last updated: May 2026",
  sections: [
    {
      title: "Getting started",
      bullets: [
        "Apply from the seller onboarding page with accurate store details",
        "Prepare your catalog, branding, and support contact information",
        "Review pricing, payout, and marketplace policy expectations before launch",
      ],
    },
    {
      title: "Catalog and fitment quality",
      paragraphs: [
        "Strong seller performance starts with clean titles, accurate vehicle compatibility, realistic stock, clear warranty notes, and honest pricing.",
        "Good catalog quality reduces cancellations, support load, and payout disputes.",
      ],
    },
    {
      title: "Order operations",
      bullets: [
        "Monitor the seller orders dashboard regularly",
        "Update fulfillment status promptly",
        "Coordinate with SpareKart if payment or COD verification blocks dispatch",
        "Respond quickly to fitment or support escalations",
      ],
    },
    {
      title: "Payout readiness",
      paragraphs: [
        "Keep your payout account information accurate and verified. Payout release can depend on order completion, payment confirmation, and account health reviews.",
      ],
    },
    {
      title: "When to contact the platform",
      paragraphs: [
        "Reach out when you have a policy question, payout concern, verification issue, order dispute, or need help recovering catalog accuracy after changes.",
      ],
      note: "Seller support works best when you include the order number, product reference, or seller slug involved in the issue.",
    },
  ],
  supportTitle: "Ready to build your store?",
  supportBody:
    "If you are not live yet, use onboarding first. If you are already active, keep the seller dashboard and policy pages close for daily operations.",
  supportActions: [
    {
      label: "Become a Seller",
      to: "/seller-onboarding",
      description: "Start the application flow",
    },
    {
      label: "Seller Policies",
      to: "/seller-policies",
      description: "Marketplace operating standards",
    },
    { label: "Pricing & Fees", to: "/pricing-fees", description: "Commission and payout overview" },
  ],
};
