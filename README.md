# MobiGrade Portal

> B2B seller & admin management platform for a zero-waste mobile refurbishment marketplace — connecting verified sellers, B2B retailers, and administrators through a structured catalog, KYC, order, and payout pipeline.

---

## System Architecture

```mermaid
graph TB
    subgraph Client["Browser / Client"]
        UI[Next.js 19 React UI]
        CSR[Client Components]
    end

    subgraph Vercel["Vercel Edge Network"]
        MW[Middleware — Auth Guard\nsrc/middleware.ts]
        NS[Next.js 16 Server]
        API[API Routes]
        SA[Server Actions]
        CRON[Cron Job\n/api/cron/cleanup\n3AM UTC daily]
    end

    subgraph Data["Data Layer"]
        PRM[Prisma ORM v7]
        NEON[(Neon PostgreSQL\nServerless)]
    end

    subgraph External["External Services"]
        CDN[Cloudinary\nImage CDN]
        EMAIL[Resend\nTransactional Email]
        PAY[Razorpay\nPayment Gateway]
        SENTRY[Sentry\nError Tracking]
        VA[Vercel Analytics\n+ Speed Insights]
    end

    UI -->|"every request"| MW
    MW -->|JWT validated| NS
    NS --> SA
    NS --> API
    SA --> PRM
    API --> PRM
    PRM --> NEON
    API -->|"signed upload params"| CDN
    SA -->|"KYC / product images"| CDN
    SA -->|"password reset / KYC notifications"| EMAIL
    API -->|"payment.captured webhook"| PAY
    NS --> SENTRY
    UI --> VA
    CRON --> PRM
```

---

## User Roles & Access Map

```mermaid
graph LR
    subgraph Roles
        S[SELLER\nRefurbishment shop\nSpare parts vendor]
        A[ADMIN\nMobiGrade staff]
        R[RETAILER\nRepair shop\nB2B buyer]
    end

    subgraph SellerZone["Seller Zone  /dashboard/*"]
        SD[Dashboard — KPIs\nlistings · earnings]
        CAT[Catalog — CSV & manual upload]
        SP[Spare Parts inventory]
        KYC[KYC Submission]
        PROF[Profile & Avatar]
    end

    subgraph AdminZone["Admin Zone  /admin/*"]
        AD[Admin Dashboard — platform KPIs]
        PR[Product Review queue]
        KR[KYC Review queue]
        INV[Inventory management]
        SL[Sellers list]
        RL[Retailers list]
        ORD[Order management]
        RET[Returns & Refunds]
    end

    S -->|"requires KYC_APPROVED"| CAT
    S --> SD
    S --> SP
    S --> KYC
    S --> PROF
    A --> AD
    A --> PR
    A --> KR
    A --> INV
    A --> SL
    A --> RL
    A --> ORD
    A --> RET
    R -->|"via buyer API"| ORD
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    actor U as User
    participant MW as Middleware
    participant NA as NextAuth v5
    participant DB as Neon DB
    participant JWT as JWT Cookie

    U->>NA: POST /login {email, password}
    NA->>DB: prisma.user.findUnique(email)
    DB-->>NA: User record
    NA->>NA: bcrypt.compare(password, hash)
    alt Valid credentials
        NA->>JWT: Sign JWT {id, role, mobile, verificationStatus}
        JWT-->>U: Set httpOnly cookie
        U->>MW: Next request
        MW->>JWT: Decode & validate
        JWT-->>MW: Session payload
        alt ADMIN
            MW-->>U: Route to /admin/dashboard
        else SELLER
            MW-->>U: Route to /dashboard
        end
    else Invalid
        NA-->>U: 401 — redirect /login
    end
```

---

## KYC Verification Flow

```mermaid
stateDiagram-v2
    [*] --> KYC_PENDING : Seller signs up
    KYC_PENDING --> KYC_SUBMITTED : submitKycAction()\nUploads Aadhaar + PAN → Cloudinary
    KYC_SUBMITTED --> KYC_UNDER_REVIEW : Admin opens review
    KYC_UNDER_REVIEW --> KYC_APPROVED : approveKycAction()\nUnlocks full catalog access
    KYC_UNDER_REVIEW --> KYC_REJECTED : rejectKycAction(reason)\nNotification sent via Resend
    KYC_UNDER_REVIEW --> EDIT_REQUESTED : requestKycEditAction()\nSeller asked to resubmit
    EDIT_REQUESTED --> EDIT_UNLOCKED : approveKycEditAction()\nAdmin unlocks form
    EDIT_UNLOCKED --> KYC_SUBMITTED : Seller resubmits docs
    KYC_REJECTED --> KYC_SUBMITTED : Seller resubmits
    KYC_APPROVED --> [*]
```

---

## Product Catalog Pipeline

```mermaid
flowchart TD
    A([Seller]) -->|CSV Upload| B[PapaParse — client parse]
    A -->|Manual Entry| C[Category form]
    B --> D{Zod row validation}
    D -->|Valid rows| E[CatalogProductDraft\nstatus: PENDING_REVIEW]
    D -->|Invalid rows| F[CatalogProductDraft\nstatus: DRAFT\nstored with rowErrors]
    C --> E
    E --> G([Admin — Product Review])
    G -->|Approve| H[SellerProduct\nstatus: ACTIVE]
    G -->|Reject| I[Draft: REJECTED\nNotification → Seller]
    G -->|Request Changes| J[Draft: NEEDS_CHANGES\nNotification → Seller]
    J --> E
    H --> K([Admin — Enrich])
    K -->|Fill title, desc,\nspecs, price, images| L[LiveProduct\nstatus: DRAFT]
    L -->|publishProductAction| M[LiveProduct\nstatus: PUBLISHED]
    M -->|unpublishProductAction| N[LiveProduct\nstatus: ARCHIVED]
```

---

## Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PAYMENT_PENDING : Retailer places order\nplaceOrderAction()
    PAYMENT_PENDING --> PAYMENT_CAPTURED : Razorpay webhook\npayment.captured
    PAYMENT_PENDING --> PAYMENT_FAILED : Payment failed
    PAYMENT_CAPTURED --> CONFIRMED : Admin confirms\nadminConfirmOrderAction()
    CONFIRMED --> PROCESSING : Auto-transition
    PROCESSING --> SHIPPED : Seller ships\nshipOrderAction(trackingNum)
    SHIPPED --> OUT_FOR_DELIVERY : Courier update
    OUT_FOR_DELIVERY --> DELIVERED : markDeliveredAction()
    DELIVERED --> COMPLETED : T+7 days auto-clear
    DELIVERED --> RETURN_IN_PROGRESS : Retailer requests return
    RETURN_IN_PROGRESS --> COMPLETED : Return resolved
    PAYMENT_PENDING --> CANCELLED : Buyer/Admin cancels
    CONFIRMED --> CANCELLED : Admin cancels
    PROCESSING --> CANCELLED : Seller/Admin cancels
    CANCELLED --> [*]
    COMPLETED --> [*]
```

---

## Return & Refund Flow

```mermaid
sequenceDiagram
    actor R as Retailer
    actor A as Admin
    participant DB as Database
    participant PAY as Payment/Refund

    R->>DB: requestReturnAction(orderId, items, reason)
    DB->>DB: Create ReturnRequest + ReturnItems\nOrder → RETURN_IN_PROGRESS
    A->>DB: reviewReturnAction(returnId, "approve")
    DB->>DB: ReturnRequest → APPROVED\nSchedule pickup
    A->>DB: closeReturnWithRefundAction(returnId, amount)
    DB->>PAY: Create Refund record
    PAY-->>DB: Refund → COMPLETED
    DB->>DB: SellerEarning → REVERSED\nOrder → COMPLETED
    DB-->>R: Notification — refund processed
```

---

## Earnings & Payout Pipeline

```mermaid
flowchart LR
    OI[OrderItem\nunitPrice × qty] -->|on order confirm| SE[SellerEarning\nstatus: ON_HOLD\ngross · commission · net]
    SE -->|T+7 after delivery| SE2[SellerEarning\nstatus: CLEARED]
    SE2 -->|Admin initiates payout| SP[SellerPayout\nstatus: PENDING]
    SP -->|Bank transfer + UTR| SP2[SellerPayout\nstatus: COMPLETED]
    SP2 -->|Mark settled| SE3[SellerEarning\nstatus: PAID]
```

---

## Data Model Overview

```mermaid
erDiagram
    User ||--o| SellerProfile : has
    User ||--o| RetailerProfile : has
    SellerProfile ||--o| KycSubmission : submits
    SellerProfile ||--o{ CatalogUploadBatch : uploads
    SellerProfile ||--o{ CatalogProductDraft : drafts
    SellerProfile ||--o{ SellerProduct : owns
    SellerProfile ||--o{ SellerEarning : earns
    SellerProfile ||--o{ SellerPayout : receives

    CatalogProductDraft ||--o| SellerProduct : approved_into
    SellerProduct ||--o| LiveProduct : enriched_into

    RetailerProfile ||--o{ Order : places
    RetailerProfile ||--o{ RetailerAddress : has
    Order ||--o{ OrderItem : contains
    Order ||--|| Payment : has
    Order ||--o{ OrderStatusHistory : tracks
    Order ||--o{ ReturnRequest : generates

    ReturnRequest ||--o{ ReturnItem : contains
    ReturnRequest ||--o{ ReturnStatusHistory : tracks
    ReturnRequest ||--o| Refund : triggers

    OrderItem ||--|| SellerEarning : generates
    SellerEarning }o--|| SellerPayout : batched_in

    User ||--o{ Notification : receives
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 · React 19 |
| Auth | NextAuth v5 (beta) · bcryptjs · JWT |
| Database | Neon PostgreSQL (serverless) · Prisma ORM 7 |
| File Storage | Cloudinary (KYC docs, product images, avatars) |
| Email | Resend (password reset, KYC & order notifications) |
| Payments | Razorpay (webhook-driven, HMAC verified) |
| Validation | Zod 4 · PapaParse (CSV) |
| UI | Tailwind CSS 4 · Framer Motion · Lucide · Sonner |
| Charts | Chart.js + react-chartjs-2 |
| Observability | Sentry · Vercel Analytics · Speed Insights |
| Deployment | Vercel (Edge + Serverless Functions + Cron) |

---

## Key Security Measures

- **JWT strategy** — httpOnly signed cookies, no server-side session store
- **Role-based middleware** — every request gate-checked before reaching pages or API routes
- **KYC gating** — catalog access blocked until `verificationStatus === KYC_APPROVED`
- **Webhook HMAC** — Razorpay payloads verified with `RAZORPAY_WEBHOOK_SECRET`
- **Signed uploads** — Cloudinary uploads require a server-generated signature; credentials never exposed to the browser
- **Content Security Policy** — strict CSP headers on all routes (see `next.config.ts`)
- **Resource ownership** — every server action validates the requesting user owns the resource

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # login · signup · forgot/reset password
│   ├── (seller)/        # dashboard · catalog · spare-parts · kyc · profile
│   ├── (admin)/         # dashboard · product-review · kyc-review · sellers · inventory
│   └── api/             # auth · orders · payments · kyc · cron · health
├── actions/             # server actions — auth · kyc · catalog · orders · admin
├── auth.config.ts       # edge-compatible NextAuth config (no Node.js imports)
├── auth.ts              # full NextAuth config — Credentials provider + Prisma
├── middleware.ts        # auth guard + role-based routing
├── components/          # shared UI components
├── lib/
│   ├── prisma.ts        # Prisma singleton — PrismaNeon adapter
│   ├── order-machine.ts # order state machine
│   ├── return-machine.ts# return state machine
│   └── validations/     # Zod schemas
└── types/               # global TypeScript types

prisma/
└── schema.prisma        # 20+ models — Users · KYC · Catalog · Orders · Earnings
```

---

## Deployment

Hosted on **Vercel** with GitHub integration (`PRO-GRAM-MER/mobigrade-portal`, `master` branch).

**Environment variables required:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | Canonical app URL |
| `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET` | Image management |
| `CLOUDINARY_FOLDER` | Upload folder prefix |
| `RESEND_API_KEY` | Transactional email |
| `RAZORPAY_WEBHOOK_SECRET` | Payment webhook verification |
| `CRON_SECRET` | Cron job authentication |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error tracking |
