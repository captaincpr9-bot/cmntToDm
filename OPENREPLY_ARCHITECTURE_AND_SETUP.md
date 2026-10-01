# OpenReply — Complete Codebase Architecture & Zernio Setup Guide

> **Open-Source B2B Instagram Comment-to-DM & Story Reply Automation Platform**  
> Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM (PostgreSQL), BullMQ (Redis), and the Google Stitch Dark Design System.

---

## Table of Contents

1. [High-Level Architecture & End-to-End Workflow](#1-high-level-architecture--end-to-end-workflow)
2. [Project Directory & File Structure](#2-project-directory--file-structure)
3. [Deep Dive: Frontend Pages & Screens](#3-deep-dive-frontend-pages--screens)
4. [Deep Dive: Core Components & Design System](#4-deep-dive-core-components--design-system)
5. [Deep Dive: Backend API Routes](#5-deep-dive-backend-api-routes)
6. [Deep Dive: Automation Engine & Redis Queue Workers](#6-deep-dive-automation-engine--redis-queue-workers)
7. [Deep Dive: Database Schema & Data Models](#7-deep-dive-database-schema--data-models)
8. [Important: Zernio Setup & How It Works](#8-important-zernio-setup--how-it-works)
9. [Direct Meta App vs. Zernio Comparison](#9-direct-meta-app-vs-zernio-comparison)
10. [Environment Variables & Production Deployment](#10-environment-variables--production-deployment)
11. [Development Mode & Local Mock Fallback Strategy](#11-development-mode--local-mock-fallback-strategy)

---

## 1. High-Level Architecture & End-to-End Workflow

OpenReply automates Instagram lead generation by turning post comments, reel reactions, and direct messages into high-converting outbound DM funnels with tracked shortlinks.

### The Automated Event Lifecycle:

```
[ Instagram User ]
        │  Comments "FIGMA" on a Reel / Post or sends a DM
        ▼
[ Meta Instagram Graph API / Zernio Webhook ]
        │  Dispatches signed JSON webhook payload
        ▼
[ OpenReply Webhook Route ] (/api/webhook or /api/zernio/webhook/[id])
        │  1. Verifies HMAC SHA-256 signature / Meta challenge
        │  2. Logs raw event to `WebhookEvent` table
        │  3. Normalizes payload (comment text, commenter ID, media ID)
        ▼
[ BullMQ Redis Queue ] (`dm-jobs`)
        │  Enqueues background job with retry & backoff
        ▼
[ DM Queue Worker ] (`lib/queue/dm-worker.ts`)
        │  1. Deduplication check: Has user received DM within cooldown?
        │  2. Automation Matcher: Evaluates active campaigns & regex keywords
        │  3. Follower Gate Check: (Optional) Verifies user follows profile
        │  4. Public Comment Reply: (Optional) Posts randomized public response
        │  5. Dispatches Private DM via Meta Graph API or Zernio Client
        │  6. Generates Tracked Shortlink: `/r/[slug]`
        │  7. Schedules Follow-up: (Optional) After N minutes
        ▼
[ Real-Time Telemetry & Database ]
        │  Persists to `DmLog`, updates CTR stats, streams to `/inbox` and `/logs`
        ▼
[ End-User receives Instagram Direct Message ]
```

---

## 2. Project Directory & File Structure

Here is how the OpenReply codebase is organized:

```
openreply/
├── app/                                 # Next.js 16 App Router
│   ├── (dashboard)/                     # Authenticated Dashboard Layout & Screens
│   │   ├── layout.tsx                   # Dashboard shell, sidebar & topbar wrapper
│   │   ├── dashboard/page.tsx           # Step 2: Dashboard Overview Screen
│   │   ├── campaigns/                   # Step 3: Campaigns List & Builder
│   │   │   ├── page.tsx                 # Campaigns list table & metrics
│   │   │   ├── new/page.tsx             # Step 4: Campaign Builder (New)
│   │   │   └── [id]/edit/page.tsx       # Campaign Builder (Edit)
│   │   ├── inbox/page.tsx               # Step 5: 3-Pane DM Inbox & Live Conversations
│   │   ├── overview/page.tsx            # Step 6: Analytics & Performance Screen
│   │   ├── logs/page.tsx                # Step 7: DM Logs & Delivery Audit Screen
│   │   ├── settings/page.tsx            # Step 8: Settings & Account Management Screen
│   │   └── diagnostics/page.tsx         # Step 9: Production Diagnostics & Health Screen
│   ├── api/                             # Backend API Endpoints
│   │   ├── admin/diagnostics/route.ts   # Infrastructure & BullMQ diagnostics
│   │   ├── automations/route.ts         # Campaign CRUD & analytics rollup
│   │   ├── dashboard/stats/route.ts     # Aggregated dashboard metrics & charts
│   │   ├── instagram/                   # Instagram Graph API handlers
│   │   │   ├── accounts/route.ts        # Connected Instagram account profiles
│   │   │   ├── conversations/route.ts   # DM Inbox conversations & messages
│   │   │   ├── overview/route.ts        # Instagram media insights & metrics
│   │   │   └── posts/route.ts           # Media picker posts & reels
│   │   ├── logs/route.ts                # Paginated transactional delivery audit logs
│   │   ├── webhook/route.ts             # Direct Meta Graph API webhook endpoint
│   │   ├── workspace/members/route.ts   # Team members, roles & invitations
│   │   └── zernio/                      # Zernio integration API endpoints
│   │       ├── accounts/route.ts        # Zernio Instagram account selection
│   │       ├── connect/route.ts         # Zernio OAuth connection flow
│   │       ├── settings/route.ts        # Zernio API key & profile settings
│   │       └── webhook/[id]/route.ts    # Zernio inbound webhook callback
│   ├── globals.css                      # Stitch dark design system & tokens
│   ├── layout.tsx                       # Root HTML/Body layout with i18n provider
│   └── page.tsx                         # High-converting marketing landing page
├── components/                          # Reusable UI Components
│   ├── account-select.tsx               # Instagram account picker dropdown
│   ├── campaign-builder.tsx             # Interactive campaign builder form
│   ├── campaign-preview.tsx             # Sticky iPhone 17 Pro live preview
│   ├── dashboard-shell.tsx              # Responsive container with mobile navigation
│   ├── follower-chart.tsx               # Account follower growth trend line
│   ├── icons.tsx                        # Custom SVG icons (zero package bloat)
│   ├── instagram-connect-notice.tsx     # OAuth callback notice banner
│   ├── keyword-input.tsx                # Tag-based keyword trigger editor
│   ├── language-switcher.tsx            # English / Traditional Chinese switcher
│   ├── post-picker.tsx                  # Instagram Reel & Post visual selector
│   ├── sidebar.tsx                      # Upgraded Stitch sidebar with live worker card
│   ├── stat-card.tsx                    # Key performance metric tile
│   ├── status-badge.tsx                 # Glowing delivery status pill
│   ├── top-bar.tsx                      # Top bar with account switcher & search
│   └── zernio-connection.tsx            # Zernio integration settings component
├── lib/                                 # Business Logic, Integrations & Helpers
│   ├── auth.ts                          # NextAuth / session & workspace resolution
│   ├── campaigns/                       # Campaign link generator & synchronization
│   ├── db/client.ts                     # Prisma PostgreSQL database client
│   ├── instagram/                       # Instagram Graph API messaging & content
│   │   ├── context.ts                   # Token encryption & access context
│   │   ├── read-analytics.ts            # Media insights & follower count scraper
│   │   ├── read-content.ts              # Post & Reel pagination
│   │   ├── read-inbox.ts                # DM threads & webhook subscriber
│   │   └── send-messages.ts             # Private DM & comment reply sender
│   ├── queue/                           # BullMQ Redis Queue & Background Workers
│   │   ├── client.ts                    # Redis connection & queue factory
│   │   ├── dm-worker.ts                 # Core 47KB DM processing engine
│   │   └── process-webhook.ts           # Webhook payload parser & job dispatcher
│   ├── tracking/                        # Click tracking & shortlink resolution
│   ├── workspace-access.ts              # RBAC (OWNER, ADMIN, MEMBER permissions)
│   └── zernio/                          # Zernio Integration Core
│       ├── client.ts                    # HTTP client for https://zernio.com/api/v1
│       ├── manage-remote.ts             # Profile, account & webhook registration
│       ├── normalize-event.ts           # Translates Zernio events to OpenReply schema
│       └── route-handler.ts             # Zernio webhook request validator
└── prisma/
    └── schema.prisma                    # Complete PostgreSQL database schema
```

---

## 3. Deep Dive: Frontend Pages & Screens

Each screen in `app/(dashboard)` is designed according to the **Google Stitch Dark Theme**:
- **Backgrounds:** Deep dark surfaces (`#0e0e11`, `#141417`, `#18181d`, `#27272a`).
- **Signature Gradient:** Instagram Sunset (`linear-gradient(135deg, #833ab4 0%, #e1306c 50%, #f77737 100%)`).
- **Typography:** `Inter` for interface elements, `JetBrains Mono` for telemetry, metrics, and tokens.

### 1. Dashboard Overview ([`app/(dashboard)/dashboard/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/dashboard/page.tsx))
- **Live Worker Status**: Pulsing neon badge showing `Instagram Graph Engine v21.0 • @sarah.designs`.
- **Primary KPI Grid**: 4 cards displaying DMs Sent Today (`1,429`), 30-Day Conversion Rate (`34.2%`), Total Audience Contacts (`3,892`), and Active Automation Flows (`8 Flows`).
- **Interactive Daily Volume Chart**: 7-day bar chart with hover tooltips and day-by-day conversion stats.
- **Top Trigger Keywords**: Ranked pill chips (`LINK` 842, `PRICE` 419, `DEMO` 168) with CTR percentages.
- **Recent Delivery Activity Feed**: Real-time table of recent dispatches with status badges.

### 2. Campaigns List ([`app/(dashboard)/campaigns/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/campaigns/page.tsx))
- **Summary Pill Counters**: `All Campaigns (11)`, `Active (8)`, `Draft (2)`, `Paused (1)`.
- **Search & Multi-Filters**: Instant search by campaign name or keyword, account switcher, and active status filter.
- **High-Density Table**: Shows thumbnail preview, post link, trigger keywords, status badge, DMs sent, link clicks, CTR %, and direct edit actions.

### 3. Campaign Builder ([`components/campaign-builder.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/campaign-builder.tsx))
- **Visual Trigger Setup**: Select between *Specific Post/Reel*, *Next Upcoming Reel*, *Any Post/Reel*, or *Direct Message Keyword*.
- **Post Picker**: Grid selector displaying recent Instagram media with play counts, likes, and comment counts.
- **Keyword Input**: Tag editor supporting whole-word matching, multiple comma-separated keywords, and match-any-word rules.
- **DM Funnel Controls**:
  - Main DM response with `{username}` personalization.
  - Link button label & tracked destination URL (`/r/[slug]`).
  - **Follower-Gate Toggle**: Verifies that the commenter follows your profile before sending the link.
  - **Opening DM**: Sends an introductory button before revealing the link.
  - **Public Comment Reply**: Randomly selects from multiple public reply templates (e.g. *"Check your DMs! 📩"*).
  - **Follow-up Message**: Schedules an automatic follow-up DM after N minutes.
- **Live iPhone 17 Pro Sticky Preview** ([`components/campaign-preview.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/campaign-preview.tsx)): Live interactive smartphone mockup with 3 synchronized tabs: **Post Feed**, **Public Comments**, and **Private DM Inbox**.

### 4. DM Inbox & Live Conversations ([`app/(dashboard)/inbox/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/inbox/page.tsx))
- **3-Pane Split Layout**:
  1. *Left Pane*: Channel filter pills (`All Channels`, `Comments`, `Story Replies`, `Direct DMs`) and search input.
  2. *Center Conversation List*: Conversation cards with avatar, unread indicator, trigger context badge, and active sunset gradient stripe.
  3. *Right Chat Canvas*: Thread message history, bot interaction cards, smart suggestion quick-reply chips, and live composer.
- **Take Over Chat Toggle**: Allows a human agent to pause AI/automation and reply directly to the customer.
- **CRM Intelligence Ribbon**: 4-card metadata panel showing Customer Stage, Matched Automation, Verified Link Taps, and Follow Status.

### 5. Analytics & Performance ([`app/(dashboard)/overview/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/overview/page.tsx))
- **Top Metrics**: Total DMs Sent (`142,850` / `+18.4%`), Click-Through Rate (`34.2%`), Follower Attribution (`+3,892 new follows`), Automated Revenue Pipeline (`$18,420`).
- **Interactive SVG Timeline**: Dual-curve area visualization with sunset fill for DMs and emerald fill for link clicks. Features an interactive milestone marker on **Oct 24 (Viral Reel Drop)** with active conversion tooltip.
- **Cohort Benchmarks**: Ranked horizontal bar charts comparing campaign CTRs (*Client Pricing Guide* 48.0%, *Figma System* 42.1%, *Notion OS* 38.6%).
- **Funnel & Trigger Sources**: Stacked inbound breakdown (Reels 68%, Stories 22%, DMs 10%) and 5-step conversion funnel.
- **Recent Post Breakdowns Table**: Per-post views, reach, likes, comments, saved, and shares.

### 6. DM Delivery Audit Logs ([`app/(dashboard)/logs/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/logs/page.tsx))
- **KPI Metrics Strip**: Total Processed (`148,200`), Delivered Successfully (`142,850`), Failed/Blocked (`240`), Avg Dispatch Latency (`38ms`).
- **Status Filter Pills**: `All Events`, `Sent`, `Failed`, `Dedup Skipped`, `Rate Limited`.
- **Search Bar**: Query by commenter username, comment text, campaign, or error message.
- **Interactive Inspect Modal**: Opens complete raw event JSON with 1-click clipboard copy and HTTP status breakdown.

### 7. Settings & Account Management ([`app/(dashboard)/settings/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/settings/page.tsx))
- **4 Tab Panels**:
  1. *Instagram Accounts*: Connected profiles with verified badges, token expiration countdown, and live webhook test action.
  2. *Team & Access*: Active members table (`OWNER`, `ADMIN`, `MEMBER`), pending invite management, and invite modal.
  3. *Webhooks & Graph API*: Callback URL copy, verify token reveal/copy, subscribed field badges, and live webhook ping test.
  4. *Workspace & System*: Monthly DM throughput counters, dedup window settings, language switcher, and danger zone log purging.

### 8. Diagnostics & Health Telemetry ([`app/(dashboard)/diagnostics/page.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/app/(dashboard)/diagnostics/page.tsx))
- **Queue Depth Strip**: 5 stat tiles for Worker Node Health, Waiting Queue (`0`), Active Queue (`1`), Delayed Queue (`2`), Failed Queue (`0`).
- **Subsystem Verification**: Meta Graph API v21.0, Webhook Ingestion Engine, Redis BullMQ Broker, and PostgreSQL Database.
- **Live Synthetic Pipeline Test**: Simulates end-to-end webhook ingest ➔ regex match ➔ DM dispatch in 38ms with visual confirmation.
- **Worker Alerts & Operational Event Timeline**: Real-time event log with severity badges (`SUCCESS`, `INFO`, `WARN`).

---

## 4. Deep Dive: Core Components & Design System

All components live in `components/` and are built for high performance and zero external icon package bloat:

- **[`components/icons.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/icons.tsx)**: Self-contained native SVG icon library containing `GridIcon`, `BoltIcon`, `ChatIcon`, `AnalyticsIcon`, `LogsIcon`, `SettingsIcon`, `DiagnosticsIcon`, `InstagramIcon`, `SendIcon`, `AdsClickIcon`, `UserPlusIcon`, `DollarIcon`, `DownloadIcon`, `FilterIcon`, `RefreshIcon`, `TuneIcon`, `InsightsIcon`, `CodeIcon`, `CopyIcon`, `CheckIcon`, `ShieldIcon`, `KeyIcon`, and `TrashIcon`.
- **[`components/status-badge.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/status-badge.tsx)**: Renders glowing status indicators for `SENT` (emerald), `FAILED` (rose), `PENDING` (amber), `SKIPPED_DEDUP` (zinc), `SKIPPED_RATE_LIMIT` (amber), and `SKIPPED_NO_MATCH` (zinc).
- **[`components/stat-card.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/stat-card.tsx)**: Reusable KPI card with top gradient highlight stripe, trend indicator, and monospaced number formatting.
- **[`components/account-select.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/account-select.tsx)**: Styled dark dropdown for selecting or filtering connected Instagram accounts.
- **[`components/sidebar.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/sidebar.tsx)**: Fixed desktop and responsive sliding mobile navigation with active gradient route highlights, live webhook status pill, and worker latency indicator.
- **[`components/top-bar.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/top-bar.tsx)**: Top app bar with workspace selector, global keyboard shortcut search (`⌘K`), DM counter, notification badge, and profile dropdown.

---

## 5. Deep Dive: Backend API Routes

All server routes live in `app/api/` and follow Next.js 16 route handler standards (`NextRequest`, `NextResponse`):

| Route Path | Method | Description |
|---|---|---|
| `/api/automations` | `GET`, `POST` | Fetches campaigns with aggregated CTRs or creates a new automation |
| `/api/automations/[id]` | `GET`, `PUT`, `DELETE` | Retrieves, updates, or deletes a specific campaign flow |
| `/api/dashboard/stats` | `GET` | Computes aggregated dashboard metrics, 7-day daily volume, and keyword counts |
| `/api/instagram/accounts` | `GET` | Returns all connected Instagram profiles for the active workspace |
| `/api/instagram/posts` | `GET` | Fetches recent reels and feed posts for media picker |
| `/api/instagram/conversations` | `GET` | Lists customer DM inbox conversation threads with unread counts |
| `/api/instagram/conversations/[id]` | `GET`, `POST` | Fetches thread messages or sends an outbound manual chat message |
| `/api/instagram/overview` | `GET` | Fetches media-level impressions, reach, likes, comments, and follower history |
| `/api/logs` | `GET` | Returns paginated transactional delivery logs with status and search filters |
| `/api/workspace/members` | `GET`, `POST`, `DELETE` | Manages team members, invites new collaborators, or revokes pending tokens |
| `/api/admin/diagnostics` | `GET` | Reports Redis BullMQ queue depths, worker heartbeats, and error logs |
| `/api/webhook` | `GET`, `POST` | Meta Graph API webhook challenge validator (`GET`) and event receiver (`POST`) |
| `/api/zernio/settings` | `GET`, `POST`, `PUT`, `DELETE` | Manages encrypted Zernio API key, profile selection, and remote webhook registration |
| `/api/zernio/accounts` | `POST` | Connects a selected Zernio Instagram profile into OpenReply |
| `/api/zernio/webhook/[id]` | `POST` | Receives and normalizes inbound events dispatched from Zernio |
| `/r/[slug]` | `GET` | Public tracked shortlink redirector that logs verified clicks to `LinkClick` |

---

## 6. Deep Dive: Automation Engine & Redis Queue Workers

The core queue worker logic is implemented in [`lib/queue/dm-worker.ts`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/lib/queue/dm-worker.ts) and runs as an asynchronous BullMQ worker on Redis.

### Key Worker Safeguards & Features:

1. **Burst Rate Limit Protection**:
   - Meta limits Instagram messaging to **200 messages per minute per account**.
   - The queue worker maintains a token bucket in Redis. If the threshold is approached, jobs are moved to `delayed` status with an exponential backoff (typically 8–15 seconds) rather than failing.
2. **Deduplication Cooldown**:
   - By default, a 24-hour deduplication window (`SKIPPED_DEDUP`) prevents an automated message from spamming the same Instagram user multiple times if they leave several comments.
3. **Keyword Matching Algorithms**:
   - Supports exact whole-word matching (`wholeWordMatch: true`), case-insensitive regex parsing, and multi-keyword arrays (`keywords: ["FIGMA", "DESIGN"]`).
4. **Follower Gate Verification**:
   - If `requireFollow: true` is enabled, the worker checks Meta's `user.follows_business` permission. If false, it dispatches a follow-prompt button instead of the resource link. Once followed, the opening button unlocks the link.
5. **Shortlink Generation & Click Attribution**:
   - Outbound URLs are automatically wrapped in a unique tracked slug (`/r/[slug]`). When tapped, OpenReply logs the timestamp, user agent, and referrer to `LinkClick`, allowing precise calculation of Campaign CTR.

---

## 7. Deep Dive: Database Schema & Data Models

Defined in [`prisma/schema.prisma`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/prisma/schema.prisma) using PostgreSQL:

### Core Tables:

- **`Workspace`**: Represents an organization or agency client. Contains relation to `User` (owner), connected `InstagramAccount` rows, and `Automation` campaigns. Tracks `dmsSentThisPeriod`.
- **`WorkspaceMember`**: Role-based access control linking `User` and `Workspace` with roles: `OWNER`, `ADMIN`, `MEMBER`.
- **`InstagramAccount`**: Connected Instagram professional account. Stores `username`, `instagramId`, encrypted `accessToken`, `tokenExpiresAt`, `webhookSubscribed`, and `provider` (`META` or `ZERNIO`).
- **`Automation`**: The campaign configuration. Stores trigger rules (`postId`, `matchAnyPost`, `keywords`, `matchAnyWord`, `dmTriggerEnabled`), message templates (`dmMessage`, `openingDmMessage`, `publicReplyMessages`), and settings (`requireFollow`, `followUpDelayMinutes`, `isActive`).
- **`DmLog`**: Every delivery event. Contains `commenterId`, `commenterName`, `commentText`, `status` (`SENT`, `FAILED`, `SKIPPED_DEDUP`, `SKIPPED_RATE_LIMIT`, `SKIPPED_PLAN_LIMIT`, `SKIPPED_NO_MATCH`), `errorMessage`, and execution timestamp.
- **`TrackedLink` & `LinkClick`**: Stores original destination URLs, generated shortlink slugs, and logged click events for conversion analytics.
- **`ZernioConnection`**: Stores the encrypted Zernio API key, selected `profileId`, remote `webhookId`, and `webhookSecret` for a workspace.
- **`OperationalEvent`**: Infrastructure audit log for token refreshes, worker alerts, and webhook status updates.

---

## 8. Important: Zernio Setup & How It Works

### What is Zernio?
**[Zernio](https://zernio.com)** is an official OpenReply partner and third-party API gateway that eliminates the need to create your own Meta Developer App, configure Facebook Login products, or go through Meta's tedious App Review process. 

When using Zernio, your campaigns, database, queues, and logic **remain 100% self-hosted inside OpenReply**, but Meta authentication and webhook ingestion are proxied securely through Zernio.

---

### How Zernio Works Internally

```
1. Admin enters Zernio API Key in OpenReply Settings
             │
             ▼
2. OpenReply encrypts API key and stores in `ZernioConnection`
             │
             ▼
3. OpenReply calls `https://zernio.com/api/v1/profiles` to fetch agency profiles
             │
             ▼
4. OpenReply registers Webhook on Zernio:
   URL: `https://your-domain.com/api/zernio/webhook/{workspaceId}`
   Events: `['comment.received', 'message.received', 'message.read']`
   Secret: Automatically generated HMAC SHA-256 secret
             │
             ▼
5. User selects Instagram Account from Zernio profile
             │
             ▼
6. Inbound Webhook arrives at `/api/zernio/webhook/{workspaceId}`:
   - Validates `x-zernio-signature` header using `webhookSecret`
   - Normalizes event to OpenReply format via `lib/zernio/normalize-event.ts`
   - Enqueues job in BullMQ Redis queue
             │
             ▼
7. Outbound DMs are dispatched via `zernioRequest({ path: '/messages', method: 'POST' })`
```

---

### Step-by-Step Zernio Setup Guide

#### Step 1: Obtain a Zernio API Key
1. Sign up at **[zernio.com/signup](https://zernio.com/signup)**.
2. In your Zernio dashboard, navigate to **API Keys**.
3. Generate a new API key with **Read & Write** permissions and **Inbox Access** enabled.
4. Copy your secret API key.

#### Step 2: Configure Zernio in OpenReply
1. Open your OpenReply dashboard and navigate to **Settings** (`/settings`).
2. Select the **Instagram Accounts** tab.
3. Locate the **Zernio Connection** section ([`components/zernio-connection.tsx`](file:///c:/Users/lenovo/Desktop/project/openreply%20ig/openreply/components/zernio-connection.tsx)).
4. Paste your Zernio API Key into the input field and click **Save API Key**.
5. OpenReply will securely encrypt and save the key to the database.

#### Step 3: Select Profile & Auto-Configure Webhook
1. Once the API key is verified, OpenReply fetches your available Zernio profiles.
2. Select your desired profile from the dropdown.
3. Click **Save profile and configure webhook**.
4. OpenReply automatically makes a `PUT /webhooks/settings` request to Zernio, registering your workspace callback URL (`/api/zernio/webhook/{workspaceId}`) with an HMAC verification secret.

#### Step 4: Link Your Instagram Account
1. Under the configured profile, your available Instagram accounts will appear.
2. Click **Use in OpenReply** next to your Instagram handle (e.g. `@sarah.designs`).
3. OpenReply registers this account in the `InstagramAccount` table with `provider: "ZERNIO"`.
4. Your account is now fully live and ready to receive comment triggers and send DMs!

---

## 9. Direct Meta App vs. Zernio Comparison

| Feature | Direct Meta App (`META`) | Zernio Integration (`ZERNIO`) |
|---|---|---|
| **Cost** | Free (Meta developer account) | Requires Zernio API subscription |
| **Setup Complexity** | High (Requires Meta App Review, Business Verification, Privacy Policy URLs, Webhook subscription tokens) | Low (Takes ~2 minutes; zero Meta App configuration required) |
| **Meta App Review** | Mandatory for `instagram_manage_messages` and `instagram_manage_comments` permissions | None required (Uses Zernio's pre-approved Meta app) |
| **Token Refresh** | Must be renewed every 60 days via OAuth refresh flow | Managed automatically by Zernio |
| **Webhook Endpoint** | `/api/webhook` | `/api/zernio/webhook/[workspaceId]` |
| **DM Delivery API** | `https://graph.instagram.com/v21.0/` | `https://zernio.com/api/v1/messages` |
| **Data Privacy** | Direct connection to Meta | Processed via Zernio proxy |
| **Best For** | Self-hosted enterprises with Meta verified developer accounts | Agencies, creators, and freelancers who want immediate setup without Meta review |

---

## 10. Environment Variables & Production Deployment

Create a `.env` file in the root directory with the following variables:

```env
# Application URLs
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-a-strong-random-secret-key-32-chars"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# PostgreSQL Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/openreply?schema=public"

# Redis (for BullMQ queues & rate limiting)
REDIS_URL="redis://localhost:6379"

# Direct Meta Graph API (Optional if using Zernio)
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"
META_WEBHOOK_VERIFY_TOKEN="your-custom-webhook-verify-token"

# Encryption Key (Used to encrypt Instagram access tokens & Zernio API keys)
ENCRYPTION_KEY="32-character-secret-encryption-key"

# Email Delivery (For team member invitation links)
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@your-domain.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="OpenReply <noreply@your-domain.com>"
```

### Production Deployment Commands:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client & Run Migrations
npx prisma generate
npx prisma migrate deploy

# 3. Build Next.js Production Bundle
npm run build

# 4. Start Next.js Web Server
npm run start

# 5. Start Background BullMQ Worker (Run via PM2 or systemd)
npm run worker
```

---

## 11. Development Mode & Local Mock Fallback Strategy

OpenReply is equipped with a **Zero-Dependency Development Strategy**:

### How It Works:
- When running locally in development mode (`process.env.NODE_ENV === "development"`), all API routes check whether a PostgreSQL or Redis session exists.
- If Docker or local databases are not running, all routes automatically return realistic, high-fidelity mock payloads matching the Google Stitch specifications.
- This allows developers to immediately preview, test, interact with, and verify the entire dashboard UI on `http://localhost:3000` without having to provision Docker containers, PostgreSQL databases, or Meta developer apps first.
- When deployed to production (`NODE_ENV === "production"`), the real database and queue workers take over automatically.
