// PM University — content definitions
// Each article has steps (shown as a walkthrough), tour steps (live Shepherd.js overlays), and FAQs.

export interface TourStep {
  target: string;       // CSS selector for the live element
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  route?: string;       // navigate here before showing this step
}

export interface ArticleStep {
  title: string;
  description: string;
  image?: string;       // optional screenshot path under /images/university/
  callouts?: {          // SVG overlay callouts drawn on top of the image
    type: 'arrow' | 'circle' | 'badge';
    x: number;          // % from left
    y: number;          // % from top
    label: string;
    color?: string;
  }[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface UniversityArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  readTime: number;     // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: ArticleStep[];
  tourSteps: TourStep[];
  faqs: FAQ[];
  relatedSlugs?: string[];
  proRequired?: boolean;
}

export interface UniversityCategory {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;        // tailwind gradient classes
  articleSlugs: string[];
}

// ─── ARTICLES ────────────────────────────────────────────────────────────────

export const UNIVERSITY_ARTICLES: UniversityArticle[] = [
  // ── 1. ADD YOUR FIRST PROPERTY ──────────────────────────────────────────────
  {
    slug: 'add-first-property',
    title: 'Adding Your First Property',
    description: 'Learn how to create a property, add units, set rent amounts, and upload photos — step by step.',
    category: 'getting-started',
    emoji: '🏠',
    readTime: 5,
    difficulty: 'beginner',
    steps: [
      {
        title: 'Go to Properties',
        description: 'In the left sidebar, click "Properties" under the Properties group. This is your central hub for every building you manage.',
      },
      {
        title: 'Click "Add Property"',
        description: 'Hit the green "Add Property" button in the top-right corner. This opens the property creation form.',
      },
      {
        title: 'Fill in the property details',
        description: 'Enter the property name, full address, and property type (single-family, multi-unit, commercial). The address is used for tenant-facing pages and legal documents.',
      },
      {
        title: 'Add units',
        description: 'Click "Add Unit" for each rentable space. Give each unit a number or name (e.g. "Unit 1A"), set the monthly rent, and optionally add a security deposit amount.',
      },
      {
        title: 'Upload photos',
        description: 'Add at least one photo — properties with photos get significantly more tenant applications. Drag and drop images or click to browse.',
      },
      {
        title: 'Save and publish',
        description: 'Click "Save Property". Your property is now live on your tenant-facing listing page and visible to applicants.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/dashboard/properties"]',
        title: 'Properties',
        content: 'This is where all your properties live. Click here to manage buildings and units.',
        placement: 'right',
        route: '/admin/dashboard/properties',
      },
      {
        target: '[data-tour="add-property"]',
        title: 'Add a Property',
        content: 'Click this button to create your first property. You can add multiple units, set rent prices, and upload photos.',
        placement: 'bottom',
        route: '/admin/dashboard/properties',
      },
    ],
    faqs: [
      {
        question: 'How many properties can I add?',
        answer: 'The Starter plan supports up to 24 units across all properties. Pro supports up to 150 units, and Enterprise is unlimited.',
      },
      {
        question: 'Can I import properties from another platform?',
        answer: 'Yes — go to Properties > Bulk Import to upload a CSV or Excel file with your existing property data.',
      },
      {
        question: 'Can I edit a property after saving it?',
        answer: 'Absolutely. Click any property card to open it, then click the Edit button. Changes save immediately.',
      },
    ],
    relatedSlugs: ['invite-tenant-qr', 'setup-stripe-connect', 'create-lease'],
  },

  // ── 2. STRIPE CONNECT ───────────────────────────────────────────────────────
  {
    slug: 'setup-stripe-connect',
    title: 'Setting Up Stripe Connect (Get Paid)',
    description: 'Connect your bank account so tenant rent payments deposit directly into your account. This is required before you can collect rent.',
    category: 'getting-started',
    emoji: '💳',
    readTime: 6,
    difficulty: 'beginner',
    steps: [
      {
        title: 'Go to Payouts',
        description: 'Click "Payouts" in the left sidebar under Financials. This is where you connect your bank and manage withdrawals.',
      },
      {
        title: 'Click "Connect with Stripe"',
        description: 'Hit the "Connect with Stripe" button. You will be redirected to Stripe\'s secure onboarding flow — this is the same system used by Lyft, Shopify, and thousands of other platforms.',
      },
      {
        title: 'Enter your business details',
        description: 'Stripe will ask for your legal name (or business name), address, date of birth, and the last 4 digits of your SSN for identity verification. This is required by US financial regulations.',
      },
      {
        title: 'Add your bank account',
        description: 'Enter your routing number and account number, or log in with your bank directly. This is where rent payments will be deposited.',
      },
      {
        title: 'Complete verification',
        description: 'Stripe may ask you to upload a photo ID. This usually takes under 2 minutes. Once approved, your account status will show "Active".',
      },
      {
        title: 'You\'re connected',
        description: 'Once connected, rent payments from tenants will automatically route to your bank account. You can initiate payouts manually or set up automatic transfers.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/payouts"]',
        title: 'Payouts',
        content: 'Connect your bank here to start receiving rent payments. Without this step, tenants cannot pay you through the platform.',
        placement: 'right',
        route: '/admin/payouts',
      },
    ],
    faqs: [
      {
        question: 'Is Stripe safe?',
        answer: 'Yes. Stripe is a PCI-DSS Level 1 certified payment processor — the highest level of security certification. They process billions of dollars for companies like Amazon and Google.',
      },
      {
        question: 'How long does verification take?',
        answer: 'Most accounts are verified instantly. In some cases Stripe may request additional documents, which can take 1-2 business days.',
      },
      {
        question: 'When do funds hit my bank account?',
        answer: 'By default, payouts are sent 2 business days after a tenant payment clears. You can initiate manual payouts from the Payouts page at any time.',
      },
      {
        question: 'What fees does Stripe charge?',
        answer: 'ACH bank transfers are 0.8% (capped at $5). Credit/debit card payments are 2.9% + 30¢. These fees are typically passed to the tenant or absorbed by you — configurable in Settings.',
      },
      {
        question: 'Can I use a personal bank account?',
        answer: 'Yes, personal accounts work fine for individual landlords. If you operate as an LLC or corporation, use your business account.',
      },
    ],
    relatedSlugs: ['collect-rent', 'add-first-property'],
  },

  // ── 3. INVITE TENANT VIA QR CODE ────────────────────────────────────────────
  {
    slug: 'invite-tenant-qr',
    title: 'Inviting Tenants with QR Codes',
    description: 'The fastest way to get a tenant into the portal — generate a QR code they scan with their phone to create an account and link to their unit instantly.',
    category: 'tenants',
    emoji: '📱',
    readTime: 4,
    difficulty: 'beginner',
    steps: [
      {
        title: 'Open the property and find the unit',
        description: 'Go to Properties, click your property, then click the specific unit you want to invite a tenant to.',
      },
      {
        title: 'Click "Invite Tenant"',
        description: 'Inside the unit detail view, click the "Invite Tenant" button. You\'ll see two options: email invite or QR code.',
      },
      {
        title: 'Select "QR Code"',
        description: 'Choose the QR Code option. A unique QR code is generated for that specific unit — it pre-fills the unit assignment when the tenant signs up.',
      },
      {
        title: 'Print or display the QR code',
        description: 'Download the QR code as a PNG and print it, or display it on your phone/tablet. Hand it to the tenant in person, tape it to the unit door, or include it in a move-in packet.',
      },
      {
        title: 'Tenant scans and signs up',
        description: 'The tenant scans the code with their phone camera. It opens a signup page pre-linked to your property and unit. They create an account and are immediately connected to you.',
      },
      {
        title: 'Confirm the tenant',
        description: 'You\'ll get a notification when they sign up. Go to Tenants to confirm and activate their account. They can now pay rent, submit maintenance requests, and message you.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/tenants"]',
        title: 'Tenants',
        content: 'All your tenants appear here. You can view their payment history, contact info, lease status, and more.',
        placement: 'right',
        route: '/admin/tenants',
      },
    ],
    faqs: [
      {
        question: 'Does the QR code expire?',
        answer: 'QR codes are valid for 30 days by default. You can regenerate a new one at any time from the unit detail page.',
      },
      {
        question: 'What if the tenant doesn\'t have a smartphone?',
        answer: 'Use the email invite option instead — enter their email address and they\'ll receive a link to sign up.',
      },
      {
        question: 'Can I invite multiple tenants to the same unit?',
        answer: 'Yes — for roommate situations, each tenant gets their own account. The primary tenant is designated as the lease holder.',
      },
    ],
    relatedSlugs: ['tenant-cards', 'create-lease', 'add-first-property'],
  },

  // ── 4. TENANT CARDS ─────────────────────────────────────────────────────────
  {
    slug: 'tenant-cards',
    title: 'Understanding Tenant Cards',
    description: 'Tenant cards are your at-a-glance view of every renter. Learn what each section means and how to take action from them.',
    category: 'tenants',
    emoji: '👤',
    readTime: 5,
    difficulty: 'beginner',
    steps: [
      {
        title: 'Find the Tenants section',
        description: 'Click "Tenants" in the sidebar. You\'ll see a card for every active tenant across all your properties.',
      },
      {
        title: 'The status badge',
        description: 'The colored badge in the top-right of each card shows the tenant\'s current status: Green = Active, Yellow = Late on rent, Red = Overdue/Eviction pending, Gray = Inactive.',
      },
      {
        title: 'Rent payment indicator',
        description: 'The rent section shows whether this month\'s rent has been paid, is pending, or is overdue. A green checkmark means paid. A clock icon means payment is processing. A red X means unpaid.',
      },
      {
        title: 'Quick actions',
        description: 'Each card has a "..." menu with quick actions: Send Message, View Lease, Record Cash Payment, Issue Notice, and Start Eviction Process.',
      },
      {
        title: 'Click the card to open the full profile',
        description: 'Clicking anywhere on the card opens the full tenant profile — payment history, documents, maintenance requests, lease details, and communication log all in one place.',
      },
      {
        title: 'The lease expiry warning',
        description: 'If a lease is expiring within 60 days, a yellow banner appears on the card. Click it to renew the lease or start the move-out process.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/tenants"]',
        title: 'Tenant Cards',
        content: 'Each card here represents one of your tenants. The color-coded badges tell you their payment status at a glance.',
        placement: 'right',
        route: '/admin/tenants',
      },
    ],
    faqs: [
      {
        question: 'How do I record a cash payment?',
        answer: 'Open the tenant card "..." menu and select "Record Cash Payment". Enter the amount and date. This logs the payment in the system without going through Stripe.',
      },
      {
        question: 'Can I filter tenants by property?',
        answer: 'Yes — use the filter dropdown at the top of the Tenants page to show only tenants from a specific property.',
      },
      {
        question: 'How do I remove a tenant who has moved out?',
        answer: 'Open the tenant profile, scroll to the bottom, and click "End Tenancy". This archives the tenant and marks the unit as vacant.',
      },
    ],
    relatedSlugs: ['invite-tenant-qr', 'eviction-process', 'collect-rent'],
  },

  // ── 5. EVICTION PROCESS ─────────────────────────────────────────────────────
  {
    slug: 'eviction-process',
    title: 'The Eviction Process',
    description: 'Where to find the eviction button, what it does, and how to document the process properly to protect yourself legally.',
    category: 'tenants',
    emoji: '⚖️',
    readTime: 7,
    difficulty: 'intermediate',
    steps: [
      {
        title: 'When to start an eviction',
        description: 'Only start the eviction process after you\'ve attempted to resolve the issue directly. Common reasons: non-payment of rent (most common), lease violations, property damage, or illegal activity.',
      },
      {
        title: 'Find the Evictions section',
        description: 'Click "Evictions" in the sidebar under Operations. This is separate from the Tenants section — it\'s a dedicated workflow for managing the legal process.',
      },
      {
        title: 'The eviction button on a tenant card',
        description: 'You can also start from a tenant card: open the tenant\'s profile, scroll to the Actions section, and click "Start Eviction Process". This pre-fills the tenant\'s information.',
      },
      {
        title: 'Select the eviction reason',
        description: 'Choose the legal reason: Non-Payment of Rent, Lease Violation, End of Lease Term, or Other. This determines which notice template is generated.',
      },
      {
        title: 'Generate the notice',
        description: 'The system generates the appropriate legal notice (3-Day Pay or Quit, 30-Day Notice, etc.) pre-filled with the tenant\'s name, unit, and amount owed. Download it as a PDF.',
      },
      {
        title: 'Serve the notice and document it',
        description: 'Serve the notice according to your state\'s laws (in-person, certified mail, or posting on door). Upload proof of service back into the system — this creates a legal paper trail.',
      },
      {
        title: 'Track the timeline',
        description: 'The eviction tracker shows the current stage, days elapsed, and next required action. If the tenant doesn\'t comply, the system reminds you when to file with the court.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/evictions"]',
        title: 'Evictions',
        content: 'Manage the full eviction workflow here — from initial notice to court filing. Everything is documented and timestamped.',
        placement: 'right',
        route: '/admin/evictions',
      },
    ],
    faqs: [
      {
        question: 'Does the platform file with the court for me?',
        answer: 'No — the platform generates the legal documents and tracks the process, but you are responsible for filing with your local court. We recommend consulting a local attorney for your first eviction.',
      },
      {
        question: 'What\'s the difference between a 3-day and 30-day notice?',
        answer: 'A 3-Day Notice is for non-payment of rent — the tenant has 3 days to pay or vacate. A 30-Day Notice is for lease violations or end of tenancy — the tenant has 30 days to correct the issue or leave. Requirements vary by state.',
      },
      {
        question: 'Can I cancel an eviction if the tenant pays?',
        answer: 'Yes — open the eviction record and click "Resolve Eviction". Select the reason (tenant paid, issue resolved) and the eviction is closed. The tenant\'s account returns to active status.',
      },
    ],
    relatedSlugs: ['tenant-cards', 'create-lease', 'legal-documents'],
  },

  // ── 6. COLLECT RENT ─────────────────────────────────────────────────────────
  {
    slug: 'collect-rent',
    title: 'Collecting Rent & Late Fees',
    description: 'Set up automatic rent collection, configure late fees, and understand how the payment flow works from tenant to your bank.',
    category: 'financials',
    emoji: '💰',
    readTime: 6,
    difficulty: 'beginner',
    steps: [
      {
        title: 'How rent collection works',
        description: 'Tenants pay through their portal using ACH bank transfer or credit/debit card. Payments are processed by Stripe and deposited into your connected bank account.',
      },
      {
        title: 'Set the rent due date',
        description: 'Go to Settings > Fees. Set the day of the month rent is due (typically the 1st). This applies to all units unless overridden at the unit level.',
      },
      {
        title: 'Enable automatic rent reminders',
        description: 'Turn on "Automatic Rent Reminders" in Settings > Fees (Pro plan). Tenants receive email and SMS reminders 7 days, 3 days, and 1 day before rent is due.',
      },
      {
        title: 'Configure late fees',
        description: 'Set a grace period (e.g., 5 days after the due date) and a late fee amount — either a flat dollar amount or a percentage of rent. Enable "Auto-Apply" to charge it automatically.',
      },
      {
        title: 'View rent status in the Revenue section',
        description: 'Go to Financials > Rents to see a rent roll — every unit, whether it\'s paid, pending, or overdue, and the exact amounts.',
      },
      {
        title: 'Record cash payments',
        description: 'If a tenant pays cash or check, go to their tenant card, click "..." and select "Record Cash Payment". This keeps your records accurate even for offline payments.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/revenue"]',
        title: 'Rent Roll',
        content: 'See every unit\'s payment status here — paid, pending, overdue. Filter by property or date range.',
        placement: 'right',
        route: '/admin/revenue',
      },
      {
        target: 'a[href="/admin/payouts"]',
        title: 'Payouts',
        content: 'Once rent is collected, initiate a payout here to transfer funds to your bank account.',
        placement: 'right',
        route: '/admin/payouts',
      },
    ],
    faqs: [
      {
        question: 'What if a tenant\'s payment fails?',
        answer: 'Failed payments are flagged immediately. The tenant receives an automatic notification to update their payment method. You\'ll also see a red alert on their tenant card.',
      },
      {
        question: 'Can tenants set up autopay?',
        answer: 'Yes — tenants can enable autopay from their portal. Their rent is charged automatically on the due date each month.',
      },
      {
        question: 'How do I handle partial payments?',
        answer: 'Go to the tenant\'s profile and click "Record Partial Payment". Enter the amount received. The remaining balance is tracked and shown on their card.',
      },
    ],
    relatedSlugs: ['setup-stripe-connect', 'investor-reports', 'tenant-cards'],
  },

  // ── 7. INVESTOR REPORTS ─────────────────────────────────────────────────────
  {
    slug: 'investor-reports',
    title: 'Downloading Investor Reports',
    description: 'Generate professional PDF reports for your investors, lenders, or accountant — showing income, expenses, occupancy, and portfolio performance.',
    category: 'financials',
    emoji: '📊',
    readTime: 4,
    difficulty: 'intermediate',
    steps: [
      {
        title: 'Go to Analytics',
        description: 'Click "Analytics" under Financials in the sidebar. This is where all financial reporting lives.',
      },
      {
        title: 'Select the report type',
        description: 'Choose from: Rent Roll (all units and payment status), Income Statement (revenue vs expenses), Occupancy Report (vacancy rates), or Portfolio Summary (everything in one page).',
      },
      {
        title: 'Set the date range',
        description: 'Use the date picker to select the period you want to report on — monthly, quarterly, or custom range. Year-to-date is a common choice for investors.',
      },
      {
        title: 'Filter by property (optional)',
        description: 'If you want a report for a specific property rather than your whole portfolio, use the property filter dropdown.',
      },
      {
        title: 'Click "Download PDF"',
        description: 'Hit the Download PDF button. The report is generated with your branding (logo and colors from your Branding settings) and downloads to your computer.',
      },
      {
        title: 'Share with investors or accountant',
        description: 'The PDF is formatted for professional sharing. It includes your company name, the reporting period, and a summary page followed by detailed breakdowns.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/analytics"]',
        title: 'Analytics & Reports',
        content: 'Generate investor-ready PDF reports here. Income statements, rent rolls, occupancy reports — all with your branding.',
        placement: 'right',
        route: '/admin/analytics',
      },
    ],
    faqs: [
      {
        question: 'Can I export to Excel instead of PDF?',
        answer: 'Yes — most reports have a "Export CSV" option next to the PDF button. Open the CSV in Excel or Google Sheets for custom analysis.',
      },
      {
        question: 'Does the report include my logo?',
        answer: 'Yes, if you\'ve uploaded a logo in Branding settings. The report header will show your company name and logo.',
      },
      {
        question: 'Is Analytics a Pro feature?',
        answer: 'Yes — advanced analytics and PDF reports require a Pro or Enterprise plan. The basic Rents view is available on all plans.',
      },
    ],
    relatedSlugs: ['collect-rent', 'setup-stripe-connect', 'branding-setup'],
    proRequired: true,
  },

  // ── 8. BRANDING SETUP ───────────────────────────────────────────────────────
  {
    slug: 'branding-setup',
    title: 'Setting Up Your Branding & Custom URL',
    description: 'Upload your logo, set your brand colors, and claim your custom subdomain so tenants see your brand — not ours.',
    category: 'getting-started',
    emoji: '🎨',
    readTime: 5,
    difficulty: 'beginner',
    steps: [
      {
        title: 'Go to Branding',
        description: 'Click "Branding" in the sidebar under Settings. This controls everything tenants see when they interact with your portal.',
      },
      {
        title: 'Upload your logo',
        description: 'Click the logo upload area and select your logo file (PNG or SVG recommended, at least 200x200px). Your logo appears on the tenant portal, emails, and PDF documents.',
      },
      {
        title: 'Set your brand colors',
        description: 'Pick a primary color that matches your brand. This color is used for buttons, links, and accents throughout the tenant-facing experience.',
      },
      {
        title: 'Claim your subdomain',
        description: 'Enter a subdomain name (e.g., "sunsetproperties" becomes sunsetproperties.propertyflow.com). This is the URL you share with prospective tenants to view your listings and apply.',
      },
      {
        title: 'Add a custom domain (optional)',
        description: 'If you have your own domain (e.g., sunsetproperties.com), you can point it to your portal. Go to the Custom Domain section and follow the DNS setup instructions.',
      },
      {
        title: 'Preview your portal',
        description: 'Click "Preview Portal" to see exactly what tenants see when they visit your URL. Check that your logo, colors, and property listings look correct.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/branding"]',
        title: 'Branding',
        content: 'Customize your tenant portal here — logo, colors, and your own URL. Tenants will see your brand, not ours.',
        placement: 'right',
        route: '/admin/branding',
      },
      {
        target: '[data-tour="logo-upload"]',
        title: 'Upload Your Logo',
        content: 'Your logo appears on the tenant portal, all emails, and PDF documents like leases and invoices.',
        placement: 'right',
        route: '/admin/branding',
      },
      {
        target: '[data-tour="subdomain"]',
        title: 'Your Custom URL',
        content: 'This becomes your tenant-facing URL. Share it on social media, business cards, or anywhere you advertise.',
        placement: 'right',
        route: '/admin/branding',
      },
    ],
    faqs: [
      {
        question: 'What size should my logo be?',
        answer: 'We recommend a square or horizontal logo at least 400px wide, in PNG format with a transparent background. This looks best across all contexts.',
      },
      {
        question: 'Can I change my subdomain later?',
        answer: 'Yes, but be aware that any links you\'ve shared with the old subdomain will stop working. Update your marketing materials after changing it.',
      },
      {
        question: 'Do I need a custom domain?',
        answer: 'No — the free subdomain (yourname.propertyflow.com) works perfectly. A custom domain is optional and gives a more professional appearance.',
      },
    ],
    relatedSlugs: ['add-first-property', 'invite-tenant-qr'],
  },

  // ── 9. CREATE A LEASE ───────────────────────────────────────────────────────
  {
    slug: 'create-lease',
    title: 'Creating & Sending a Lease',
    description: 'Generate a legally-formatted lease agreement, customize the terms, get it e-signed, and store it automatically.',
    category: 'leases',
    emoji: '📝',
    readTime: 6,
    difficulty: 'intermediate',
    steps: [
      {
        title: 'Go to Legal Documents',
        description: 'Click "Documents" in the sidebar. This is where lease templates and signed agreements are stored.',
      },
      {
        title: 'Create or select a lease template',
        description: 'Click "New Lease". You can start from a blank template or use one of the pre-built state-specific templates. Select your state to get the right legal language.',
      },
      {
        title: 'Fill in the lease details',
        description: 'The form auto-fills from your property and tenant data: address, unit number, tenant name, rent amount, and lease dates. Review and adjust any terms.',
      },
      {
        title: 'Add custom clauses',
        description: 'Scroll to the "Additional Terms" section to add pet policies, parking rules, utility responsibilities, or any other custom clauses specific to this tenancy.',
      },
      {
        title: 'Send for e-signature',
        description: 'Click "Send for Signature". The tenant receives an email with a link to review and sign the lease digitally. You\'ll be notified when they sign.',
      },
      {
        title: 'Countersign and store',
        description: 'Once the tenant signs, you\'ll receive a notification to countersign. After both parties sign, the fully executed lease is stored automatically in Documents.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/leases"]',
        title: 'Leases',
        content: 'All your lease agreements live here — active, expired, and pending signature. Click any lease to view or download it.',
        placement: 'right',
        route: '/admin/leases',
      },
    ],
    faqs: [
      {
        question: 'Are the lease templates legally valid?',
        answer: 'The templates are drafted to comply with general landlord-tenant law, but laws vary by state and city. We strongly recommend having a local attorney review your lease template before first use.',
      },
      {
        question: 'What if the tenant refuses to sign digitally?',
        answer: 'Download the lease as a PDF, have them sign a physical copy, then upload the signed PDF back into the Documents section.',
      },
      {
        question: 'Can I renew a lease?',
        answer: 'Yes — open the existing lease and click "Renew Lease". It pre-fills a new lease with updated dates and optionally a new rent amount.',
      },
    ],
    relatedSlugs: ['invite-tenant-qr', 'eviction-process', 'legal-documents'],
  },

  // ── 10. MAINTENANCE REQUESTS ────────────────────────────────────────────────
  {
    slug: 'maintenance-requests',
    title: 'Managing Maintenance Requests',
    description: 'How tenants submit requests, how you assign them to contractors, and how to track them from open to closed.',
    category: 'operations',
    emoji: '🔧',
    readTime: 5,
    difficulty: 'beginner',
    steps: [
      {
        title: 'How tenants submit requests',
        description: 'Tenants log into their portal and click "Submit Maintenance Request". They describe the issue, select a category (plumbing, electrical, HVAC, etc.), and can attach photos.',
      },
      {
        title: 'You get notified immediately',
        description: 'You receive an email and in-app notification the moment a request is submitted. Go to Maintenance in the sidebar to see all open requests.',
      },
      {
        title: 'Review and prioritize',
        description: 'Each request shows the unit, description, photos, and submission date. Set the priority: Low, Medium, High, or Emergency. Emergency requests are flagged in red.',
      },
      {
        title: 'Assign to a contractor',
        description: 'Click "Assign Contractor" to select from your saved contractors or browse the Contractor Marketplace. The contractor receives a work order with all the details.',
      },
      {
        title: 'Track the work order',
        description: 'Go to Contractor Work to see the status of assigned work orders. Contractors update the status as they work: Scheduled, In Progress, Completed.',
      },
      {
        title: 'Close the request',
        description: 'Once the work is done, mark the maintenance request as Resolved. The tenant receives a notification and can rate the repair. The request is archived.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/maintenance"]',
        title: 'Maintenance',
        content: 'All tenant maintenance requests appear here. Assign them to contractors, track progress, and close them when done.',
        placement: 'right',
        route: '/admin/maintenance',
      },
      {
        target: 'a[href="/admin/contractors"]',
        title: 'Contractor Work',
        content: 'See all work orders assigned to contractors. Track status, view invoices, and pay contractors directly from here.',
        placement: 'right',
        route: '/admin/contractors',
      },
    ],
    faqs: [
      {
        question: 'Can I submit a maintenance request on behalf of a tenant?',
        answer: 'Yes — go to Maintenance and click "New Request". Select the property and unit, then fill in the details. This is useful for issues you notice during inspections.',
      },
      {
        question: 'What\'s the difference between Maintenance and Contractor Work?',
        answer: 'Maintenance is the tenant-facing request. Contractor Work is the work order sent to the contractor. One maintenance request can generate one or more work orders.',
      },
      {
        question: 'Can tenants see the status of their request?',
        answer: 'Yes — tenants can see the current status in their portal: Submitted, In Review, Scheduled, In Progress, or Resolved.',
      },
    ],
    relatedSlugs: ['contractor-marketplace', 'tenant-cards'],
  },

  // ── 11. CONTRACTOR MARKETPLACE ──────────────────────────────────────────────
  {
    slug: 'contractor-marketplace',
    title: 'Using the Contractor Marketplace',
    description: 'Find vetted contractors, send work orders, track jobs, and pay — all without leaving the platform.',
    category: 'operations',
    emoji: '🏗️',
    readTime: 5,
    difficulty: 'intermediate',
    steps: [
      {
        title: 'Go to Contractor Work',
        description: 'Click "Contractor Work" in the sidebar under Operations. This shows all your active and past work orders.',
      },
      {
        title: 'Browse the marketplace',
        description: 'Click "Find Contractors" to browse the marketplace. Filter by trade (plumbing, electrical, HVAC, landscaping, etc.), location, and rating.',
      },
      {
        title: 'Review contractor profiles',
        description: 'Each contractor profile shows their license status, insurance verification, ratings from other landlords, completed jobs, and hourly rate or flat-fee pricing.',
      },
      {
        title: 'Send a work order',
        description: 'Click "Send Work Order" on a contractor\'s profile. Describe the job, attach photos, set a budget, and choose a preferred date. The contractor receives it instantly.',
      },
      {
        title: 'Contractor accepts and schedules',
        description: 'The contractor reviews the work order and either accepts (with a scheduled date) or sends a counter-offer. You\'ll be notified either way.',
      },
      {
        title: 'Pay the contractor',
        description: 'Once the job is marked complete, you can pay the contractor directly through the platform. Payments are processed via Stripe and the contractor receives funds in their account.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/contractors"]',
        title: 'Contractor Marketplace',
        content: 'Find, hire, and pay contractors here. All contractors are vetted with verified licenses and insurance.',
        placement: 'right',
        route: '/admin/contractors',
      },
    ],
    faqs: [
      {
        question: 'Are contractors background checked?',
        answer: 'Contractors on the marketplace have verified licenses and insurance. Background check status is shown on their profile. Always verify credentials for your specific state requirements.',
      },
      {
        question: 'Can I add my own contractor who isn\'t on the marketplace?',
        answer: 'Yes — go to Contractor Work and click "Add Private Contractor". Enter their details and you can send them work orders and track jobs the same way.',
      },
      {
        question: 'What if I\'m not happy with the work?',
        answer: 'Open the work order and click "Dispute". Describe the issue and attach photos. Our support team mediates disputes between landlords and contractors.',
      },
    ],
    relatedSlugs: ['maintenance-requests', 'add-first-property'],
  },

  // ── 12. TEAM MANAGEMENT ─────────────────────────────────────────────────────
  {
    slug: 'team-management',
    title: 'Adding Team Members & Setting Permissions',
    description: 'Invite property managers, assistants, or maintenance staff and control exactly what they can see and do.',
    category: 'settings',
    emoji: '👥',
    readTime: 5,
    difficulty: 'intermediate',
    steps: [
      {
        title: 'Go to Team > Directory',
        description: 'Click "Team" in the sidebar, then "Directory". This shows all your current team members and their roles.',
      },
      {
        title: 'Click "Invite Team Member"',
        description: 'Enter their email address and select their role. They\'ll receive an invitation email with a link to create their account.',
      },
      {
        title: 'Assign a role',
        description: 'Roles control what they can access: Property Manager (full access to properties and tenants), Maintenance Coordinator (maintenance and contractors only), Accountant (financials only, read-only), or Custom.',
      },
      {
        title: 'Restrict to specific properties',
        description: 'If you manage multiple properties and want a team member to only see certain ones, use the "Property Access" setting to restrict their view.',
      },
      {
        title: 'Team member accepts the invite',
        description: 'They click the link in their email, create a password, and land directly in the dashboard with their assigned permissions already applied.',
      },
      {
        title: 'Manage and remove members',
        description: 'From the Directory, you can change roles, update property access, or remove a team member at any time. Removed members lose access immediately.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/team/directory"]',
        title: 'Team Directory',
        content: 'Invite and manage your team here. Control exactly what each person can see and do.',
        placement: 'right',
        route: '/admin/team/directory',
      },
    ],
    faqs: [
      {
        question: 'Can team members see financial information?',
        answer: 'Only if you assign them the Accountant role or a custom role with financial access. Property Manager and Maintenance roles do not have financial access by default.',
      },
      {
        question: 'How many team members can I add?',
        answer: 'Pro plan supports up to 6 team members. Enterprise is unlimited.',
      },
      {
        question: 'Can a team member invite other team members?',
        answer: 'No — only the account owner (you) can invite and manage team members.',
      },
    ],
    relatedSlugs: ['branding-setup', 'maintenance-requests'],
    proRequired: true,
  },

  // ── 13. MESSAGES ────────────────────────────────────────────────────────────
  {
    slug: 'messaging-tenants',
    title: 'Messaging Tenants',
    description: 'Send individual messages, bulk announcements, and automated notices — and keep a full communication log.',
    category: 'operations',
    emoji: '💬',
    readTime: 4,
    difficulty: 'beginner',
    steps: [
      {
        title: 'Go to Messages',
        description: 'Click "Messages" in the sidebar under Operations. This is your inbox for all tenant communications.',
      },
      {
        title: 'Send a message to one tenant',
        description: 'Click "New Message", search for the tenant by name or unit, type your message, and hit Send. They receive it in their portal and via email.',
      },
      {
        title: 'Send a bulk announcement',
        description: 'Click "Bulk Message" to send the same message to all tenants in a property, or your entire portfolio. Useful for maintenance notices, policy updates, or holiday messages.',
      },
      {
        title: 'Attach files',
        description: 'You can attach PDFs, images, or documents to any message. Useful for sending updated rules, inspection reports, or move-in checklists.',
      },
      {
        title: 'View the communication log',
        description: 'Every message is logged with a timestamp. Open any tenant\'s profile to see the full history of all communications — useful for legal documentation.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/messages"]',
        title: 'Messages',
        content: 'Your tenant inbox. Send individual messages or bulk announcements. Every message is logged automatically.',
        placement: 'right',
        route: '/admin/messages',
      },
    ],
    faqs: [
      {
        question: 'Do tenants get email notifications for messages?',
        answer: 'Yes — tenants receive an email notification for every message. They can reply from their portal or directly via email.',
      },
      {
        question: 'Can I schedule a message to send later?',
        answer: 'Scheduled messages are on the roadmap. For now, messages send immediately.',
      },
    ],
    relatedSlugs: ['tenant-cards', 'eviction-process'],
  },

  // ── 14. SUBSCRIPTION & UPGRADES ─────────────────────────────────────────────
  {
    slug: 'subscription-plans',
    title: 'Understanding Subscription Plans',
    description: 'What each plan includes, how to upgrade or downgrade, and what happens when you hit your unit limit.',
    category: 'settings',
    emoji: '⭐',
    readTime: 4,
    difficulty: 'beginner',
    steps: [
      {
        title: 'The three plans',
        description: 'Starter ($39/mo): up to 24 units, basic features. Pro ($99/mo): up to 150 units, automatic reminders, late fees, analytics, team management. Enterprise ($199/mo): unlimited units, all features.',
      },
      {
        title: 'Go to Settings > Subscription',
        description: 'Click "Settings" in the sidebar, then the "Subscription" tab. You\'ll see your current plan, usage, and available upgrades.',
      },
      {
        title: 'Upgrading your plan',
        description: 'Click "Upgrade" on any higher-tier plan card. You\'ll be taken to a Stripe checkout page. The upgrade takes effect immediately and you\'re charged a prorated amount for the remainder of the billing period.',
      },
      {
        title: 'Downgrading your plan',
        description: 'Click "Downgrade" on a lower-tier plan. The downgrade takes effect at the end of your current billing period — you keep your current features until then.',
      },
      {
        title: 'Canceling your subscription',
        description: 'Click "Cancel Subscription" on the subscription page. Your access continues until the end of the billing period. After that, your account moves to a read-only state.',
      },
      {
        title: 'What happens at the unit limit',
        description: 'When you reach your unit limit, you\'ll see a warning banner. You can still manage existing units but cannot add new ones until you upgrade or remove units.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/settings"]',
        title: 'Settings',
        content: 'Manage your subscription, fees, profile, and preferences here.',
        placement: 'right',
        route: '/admin/settings',
      },
    ],
    faqs: [
      {
        question: 'Is there a free trial?',
        answer: 'Yes — every plan includes a 14-day free trial. Your card is collected at checkout but you aren\'t charged until day 15. Cancel anytime during the trial with zero charge.',
      },
      {
        question: 'Can I get a refund?',
        answer: 'We offer a 7-day refund on new subscriptions. Contact support within 7 days of your first charge.',
      },
      {
        question: 'Do you offer annual billing?',
        answer: 'Annual billing with a 20% discount is available. Contact support to switch to annual billing.',
      },
    ],
    relatedSlugs: ['branding-setup', 'team-management'],
  },
  // ── 11. ACCOUNTING 101 ─────────────────────────────────────────────────────
  {
    slug: 'accounting-101',
    title: 'Accounting 101 for Property Managers',
    description: 'Plain-English guide to the reports in the Accounting hub — what they show, when to look at them, and which one to open first.',
    category: 'financials',
    emoji: '📊',
    readTime: 8,
    difficulty: 'beginner',
    steps: [
      {
        title: 'What is "double-entry accounting" and do I need to care?',
        description: 'Property Flow uses a double-entry general ledger. Every rent payment, expense, and transfer posts as two equal entries (a debit and a credit) into "accounts" like Cash, Rent Income, Repairs, etc. You don\'t have to think about debits and credits to use the system — just know that behind the scenes, the books always balance. That\'s how the reports can be trusted.',
      },
      {
        title: 'The five reports, in the order you\'ll use them',
        description: '(1) Rent Roll — your per-unit rent status as of any date. Use this to answer "what\'s owed on each unit?" (2) Trial Balance — every account with its balance, total debits = total credits. Use this to spot errors. (3) P&L (Profit & Loss) — income minus expenses over a date range. Use this for "did I make money?" (4) Balance Sheet — what you own, what you owe, what you\'ve kept. Use this for "what\'s my net worth?" (5) Reconciliation — match bank deposits and withdrawals to your books. Use this monthly.',
      },
      {
        title: 'Why your bank balance and your books can disagree',
        description: 'They\'ll always disagree at first. The bank only knows about money that actually moved; your books know about rent that\'s owed but not yet paid, late fees that haven\'t hit the account, expenses you logged but haven\'t paid yet, etc. Reconciliation is the process of explaining every bank transaction in terms of your books. Do it monthly and the gap closes fast.',
      },
      {
        title: 'Owner statements vs. owner payouts',
        description: 'A statement is a one-page summary showing an owner\'s share of income and expenses for the month. It is informational — it tells them what they would receive if you distributed today. A payout is when you actually transfer money to their bank account. Property Flow generates statements automatically every month; payouts are a separate step (Phase 3 Slice 2 — coming soon).',
      },
      {
        title: 'Chart of Accounts — the categories behind the numbers',
        description: 'Every dollar is sorted into an "account" — like folders in a filing cabinet. The default chart has things like 4000-Rental Income, 5000-Repairs, 5100-Property Taxes, 6000-Bank Fees, etc. You can rename or add to it on Enterprise. For most landlords, the defaults cover everything.',
      },
      {
        title: 'When in doubt, open the Trial Balance',
        description: 'If a number in P&L or Balance Sheet looks wrong, the Trial Balance is the source of truth. It shows every account\'s debit and credit balance. If debits = credits at the bottom, the books are in balance. If they don\'t, something got posted wrong — open a support ticket and we\'ll help find it.',
      },
    ],
    tourSteps: [
      {
        target: 'a[href="/admin/accounting"]',
        title: 'Accounting Hub',
        content: 'This is the starting point. Pick a report from here.',
        placement: 'right',
        route: '/admin/accounting',
      },
      {
        target: 'a[href="/admin/accounting/rent-roll"]',
        title: 'Rent Roll',
        content: 'Per-unit status. "What\'s owed on Unit 3B as of June 30?"',
        placement: 'right',
        route: '/admin/accounting/rent-roll',
      },
      {
        target: 'a[href="/admin/accounting/trial-balance"]',
        title: 'Trial Balance',
        content: 'Every account, every balance. Source of truth.',
        placement: 'right',
        route: '/admin/accounting/trial-balance',
      },
    ],
    faqs: [
      {
        question: 'I don\'t know what "accrual" vs "cash" basis means. Which one is Property Flow using?',
        answer: 'Property Flow uses accrual basis by default. Accrual means: record income when it\'s earned (rent due date) and expenses when they happen (invoice date), not when the cash moves. This is the standard landlords use for taxes and for showing an investor. If you want a cash-basis view, the Bank Reconciliation report + your bank statement give you that on a transaction-by-transaction basis.',
      },
      {
        question: 'Can I connect QuickBooks?',
        answer: 'QuickBooks two-way sync is on the roadmap. Today, you can export a CSV of any report by clicking the download icon in the top-right of the report — the column layout matches what most bookkeepers expect.',
      },
      {
        question: 'Why does my P&L show income I haven\'t received yet?',
        answer: 'That\'s accrual basis working correctly. The P&L records income on the day it\'s due (per the lease), not the day it hits your bank. Your Bank Reconciliation report is the cash view — it shows what actually moved through your account.',
      },
      {
        question: 'What\'s the difference between a Journal Entry and a Transaction?',
        answer: 'A Journal Entry is the bookkeeping record (a debit + a credit). A "transaction" is a real-world event (a rent payment, an expense). Property Flow creates Journal Entries automatically when real-world events happen — you almost never need to enter a Journal Entry by hand.',
      },
      {
        question: 'I see a "View Rent Roll" button on the Rents page. What\'s the difference?',
        answer: 'The Rents page is operational: "did I collect rent this month?" — it\'s a log of payments and pending charges. Rent Roll is a financial report: "what does each unit\'s rent ledger look like as of a specific date?" Use Rents for day-to-day tracking; use Rent Roll for month-end, owner statements, and tax prep.',
      },
    ],
    relatedSlugs: ['collect-rent', 'investor-reports'],
  },
];

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const UNIVERSITY_CATEGORIES: UniversityCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Everything you need to go from zero to collecting rent in under an hour.',
    emoji: '🚀',
    color: 'from-emerald-500 to-teal-600',
    articleSlugs: ['add-first-property', 'setup-stripe-connect', 'branding-setup', 'subscription-plans'],
  },
  {
    id: 'tenants',
    title: 'Tenants',
    description: 'Invite tenants, understand their cards, manage leases, and handle difficult situations.',
    emoji: '👤',
    color: 'from-blue-500 to-indigo-600',
    articleSlugs: ['invite-tenant-qr', 'tenant-cards', 'eviction-process', 'create-lease'],
  },
  {
    id: 'financials',
    title: 'Financials',
    description: 'Collect rent, set up late fees, run reports, and share investor-ready documents.',
    emoji: '💰',
    color: 'from-violet-500 to-purple-600',
    articleSlugs: ['collect-rent', 'investor-reports', 'accounting-101'],
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Maintenance requests, contractors, messaging, and day-to-day property management.',
    emoji: '⚙️',
    color: 'from-orange-500 to-amber-600',
    articleSlugs: ['maintenance-requests', 'contractor-marketplace', 'messaging-tenants'],
  },
  {
    id: 'leases',
    title: 'Leases & Documents',
    description: 'Create leases, get e-signatures, and manage all your legal documents.',
    emoji: '📝',
    color: 'from-rose-500 to-pink-600',
    articleSlugs: ['create-lease'],
  },
  {
    id: 'settings',
    title: 'Settings & Team',
    description: 'Configure your account, manage team members, and customize your workspace.',
    emoji: '⚙️',
    color: 'from-slate-500 to-slate-700',
    articleSlugs: ['team-management', 'subscription-plans'],
  },
];

// Helper: get article by slug
export function getArticle(slug: string): UniversityArticle | undefined {
  return UNIVERSITY_ARTICLES.find((a) => a.slug === slug);
}

// Helper: get category by id
export function getCategory(id: string): UniversityCategory | undefined {
  return UNIVERSITY_CATEGORIES.find((c) => c.id === id);
}

// Helper: get all articles for a category
export function getCategoryArticles(categoryId: string): UniversityArticle[] {
  const cat = getCategory(categoryId);
  if (!cat) return [];
  return cat.articleSlugs.map((s) => getArticle(s)).filter(Boolean) as UniversityArticle[];
}

// Helper: search articles
export function searchArticles(query: string): UniversityArticle[] {
  const q = query.toLowerCase();
  return UNIVERSITY_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.steps.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) ||
      a.faqs.some((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
  );
}
