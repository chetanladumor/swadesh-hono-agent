# Swadesh AI — Enterprise Multi-Agent Customer Support Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-ef4444.svg)](https://turborepo.dev/)
[![Hono.dev](https://img.shields.io/badge/Backend-Hono.dev-orange.svg)](https://hono.dev/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-336791.svg)](https://www.postgresql.org/)

An enterprise-grade, fullstack AI customer support system powered by a **hierarchical multi-agent architecture**. A central **Master Router Agent** classifies incoming customer inquiries and delegates them to specialized domain sub-agents (**Order Agent**, **Billing Agent**, **Support Agent**), each equipped with live database-backed tools, context-aware memory, multi-tenant session isolation, and real-time reasoning visualization.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client["React 18 + Vite Frontend Client<br/>(Hono RPC Client + Live Reasoning Timeline)"]
    
    subgraph "Hono.dev API Layer (Backend)"
        AuthMid["Auth Middleware<br/>(X-User-Id / Bearer Token)"]
        RateMid["Rate Limiter Middleware<br/>(100 req/min, 429 Burst Protection)"]
        ErrMid["Centralized Error Middleware<br/>(ApiError / HTTP Exception Handler)"]
        
        ChatCtrl["Chat Controller & Service"]
        AgentCtrl["Agent Directory Controller"]
        HealthCtrl["Health Controller"]
    end
    
    subgraph "Multi-Agent Orchestration Engine"
        Router["Master Router Agent<br/>(Intent Classification & Context Compaction)"]
        
        OrderAgent["Order Agent<br/>(Status, Tracking, RMA Returns, Cancellations)"]
        BillingAgent["Billing Agent<br/>(Invoices, Refunds, Subscriptions, Receipts)"]
        SupportAgent["Support Agent<br/>(Knowledge Base FAQs, Hardware Troubleshooting)"]
        FallbackAgent["Fallback Agent<br/>(General Inquiries & Graceful Recovery)"]
    end
    
    subgraph "AI Engine (Dual Mode)"
        LiveLLM["Live AI Engine<br/>(Google Gemini / OpenAI via Vercel AI SDK)"]
        LocalEngine["Local Deterministic Engine<br/>(Offline / Zero-Config Reviewer Fallback)"]
    end
    
    subgraph "PostgreSQL Database (Prisma ORM)"
        DB_Users[("Users Table")]
        DB_Conversations[("Conversations & Messages")]
        DB_Orders[("Orders & Order Items")]
        DB_Invoices[("Invoices & Refund Records")]
        DB_KB[("Knowledge Base Articles")]
    end

    Client -->|HTTP / JSON| AuthMid
    AuthMid --> RateMid
    RateMid --> ChatCtrl & AgentCtrl & HealthCtrl
    ChatCtrl --> Router
    
    Router --> OrderAgent
    Router --> BillingAgent
    Router --> SupportAgent
    Router --> FallbackAgent
    
    OrderAgent & BillingAgent & SupportAgent --> LiveLLM
    OrderAgent & BillingAgent & SupportAgent --> LocalEngine
    
    OrderAgent --> DB_Orders
    BillingAgent --> DB_Invoices
    SupportAgent --> DB_KB
    ChatCtrl --> DB_Conversations & DB_Users
```

---

## 🌟 Key Features

### 1. Hierarchical Multi-Agent Orchestration
- **Master Router Agent**: Analyzes customer queries, parses entities (e.g. `ORDER-1001`, `INV-2024-001`), compacts multi-turn conversational context, and autonomously routes tasks to the appropriate specialized sub-agent.
- **Order Agent**: Inspects purchase history, provides real-time carrier tracking (FedEx, UPS, DHL), executes order cancellations, and manages formal **Return Merchandise Authorization (RMA)** workflows with return labels and policy enforcement.
- **Billing Agent**: Audits transaction ledgers, itemized invoice breakdowns, refund statuses, payment methods (Apple Pay, Visa, Amex), and recurring subscription terms.
- **Support Agent**: Performs semantic knowledge base lookups for return policies, warranty coverage, and device troubleshooting guides (e.g. Bluetooth connection resets).
- **Fallback Recovery**: Gracefully handles ambiguous inputs and cross-domain questions without breaking user experience.

### 2. Multi-Agent Reasoning Chain & Tool Tracing
- Every response includes an expandable **Multi-Agent Reasoning Chain** with timestamped steps:
  1. `Analyzing`: Initial customer sentiment, intent detection, and entity extraction.
  2. `Routing`: Delegation decision with confidence score and classification rationale.
  3. `Tool Execution`: Live database query parameters, execution duration, and returned payloads.
  4. `Generating`: Final conversational synthesis grounded in verified database facts.

### 3. Dual-Mode AI Architecture
- **Live AI Mode**: Connects to Google Gemini (`gemini-3-flash-preview` / `gemini-1.5-flash`) or OpenAI (`gpt-4o-mini`) to generate fluent, context-aware, and natural conversational responses.
- **Offline / Deterministic Mode**: If API keys are not provided, the system falls back to a deterministic local rule engine so all database queries and agent features work out-of-the-box with zero configuration.

### 4. Multi-Tenant Customer Switching & Session Isolation
- Includes pre-seeded customer accounts (**ChetanKumar Ladumor**, **Sarah Jenkins**, **Michael Chang**), each with distinct orders, invoices, and private support threads.
- UI features an interactive **Active Customer Switcher** in the sidebar.
- Backend `authMiddleware` strictly isolates customer data, returning `403 Forbidden` if cross-tenant data access is attempted.

### 5. Production Reliability & Middleware Architecture
- **Controller-Service-Repository Pattern**: Clean separation of HTTP routing, business logic orchestration, and database access.
- **Rate Limiting Middleware**: 100 requests per minute with sliding-window protection and standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `HTTP 429` responses.
- **Centralized Error Handling**: Standardized `ApiError` responses with status codes, error names, and detailed error logs.
- **Durable Workflow Engine**: Inspired by stateful workflow design (`INITIATED` $\rightarrow$ `ROUTING` $\rightarrow$ `TOOL_EXECUTION` $\rightarrow$ `COMPLETED`).

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Monorepo** | [Turborepo](https://turborepo.dev/) + npm Workspaces | Fast incremental builds, shared TypeScript packages |
| **Backend** | [Hono.dev](https://hono.dev/) (Node.js runtime) | High-performance, lightweight web framework |
| **Frontend** | React 18 + Vite + TailwindCSS + Lucide Icons | Responsive UI with real-time reasoning timeline |
| **Database** | PostgreSQL 16 (Docker Compose) | Relational storage for users, orders, and tickets |
| **ORM** | [Prisma ORM 6](https://www.prisma.io/) | Type-safe database queries and migrations |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai/) & Google Generative AI | Multi-agent reasoning and tool-calling framework |
| **Type Sharing** | `@swadesh/shared` | End-to-end type safety between frontend and backend |

---

## 📂 Project Structure

```text
swadesh-hono-agent/
├── apps/
│   ├── backend/                      # Hono.dev REST & Multi-Agent Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Relational database schema
│   │   │   └── seed.ts               # Multi-customer database seed script
│   │   └── src/
│   │       ├── agents/               # Multi-Agent implementations
│   │       │   ├── router.agent.ts   # Master Intent Classifier
│   │       │   ├── order.agent.ts    # Order & Logistics Agent
│   │       │   ├── billing.agent.ts  # Invoices & Refunds Agent
│   │       │   ├── support.agent.ts  # KB & Troubleshooting Agent
│   │       │   ├── context.manager.ts# Token Compaction & Entity Memory
│   │       │   └── llm.service.ts    # Dual-Mode AI Provider
│   │       ├── controllers/          # Chat, Agent, Health controllers
│   │       ├── middlewares/          # Auth, RateLimiter, ErrorHandler
│   │       ├── routes/               # API route definitions
│   │       ├── services/             # ChatService, AgentService
│   │       ├── tools/                # PostgreSQL Database Tools
│   │       ├── workflows/            # Durable stateful workflow engine
│   │       └── app.ts                # Hono application entrypoint
│   │
│   └── frontend/                     # React 18 + Vite Single Page App
│       └── src/
│           ├── api/client.ts         # Type-safe API client
│           ├── components/           # ChatArea, Sidebar, ReasoningSteps, Modals
│           └── App.tsx               # Main application state & user switcher
│
├── packages/
│   └── shared/                       # Shared TypeScript types, schemas & DTOs
│
├── scripts/
│   ├── test-api-suite.ts             # Automated 11-point API integration test suite
│   └── test-rate-limiter.ts          # Rate limiter 429 burst verification
│
├── docker-compose.yml                # PostgreSQL container (Port 5433)
├── turbo.json                        # Turborepo pipeline configuration
├── package.json                      # Workspace root package.json
└── .env                              # Environment variables configuration
```

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Node.js** (v18.0 or higher)
- **Docker & Docker Compose** (for PostgreSQL database)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/chetanladumor/swadesh-hono-agent.git
cd swadesh-hono-agent
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `.env` settings:
```env
# Database Connection (PostgreSQL on host port 5433)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/swadesh_support_db?schema=public"

# Server Port
PORT=3001
CORS_ORIGIN="http://localhost:5174"

# AI Provider Configuration (Optional - Google AI Studio key or OpenAI key)
GOOGLE_GENERATIVE_AI_API_KEY=""
AI_MODEL="gemini-3-flash-preview"
```

### 3. Start PostgreSQL Database
```bash
docker compose up -d
```

### 4. Push Database Schema & Seed Data
```bash
npm run db:push --workspace=@swadesh/backend
npm run db:seed --workspace=@swadesh/backend
```

### 5. Launch Development Servers
```bash
# Start both backend and frontend concurrently via Turborepo
npm run dev
```

- **Frontend Application**: [http://localhost:5174](http://localhost:5174)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Running Automated Tests

The repository includes a test suite covering all API endpoints, multi-agent classification, multi-tenant session isolation, and rate limiter burst behavior:

```bash
npm test
```

### Test Suite Coverage:
- `GET /api/health` — System status, database health, active agent registry.
- `GET /api/agents` — Multi-agent directory listing.
- `GET /api/agents/:type/capabilities` — Tool and capability introspection.
- `GET /api/agents/INVALID_TYPE/capabilities` — 404 Error handling validation.
- `POST /api/chat/messages` (Order queries) — Intent classification and tool execution.
- `POST /api/chat/messages` (Billing queries) — Invoice auditing and refund workflows.
- `POST /api/chat/messages` (Support queries) — Knowledge base search and FAQs.
- `GET /api/chat/conversations` — User conversation listing with multi-tenant isolation.
- `GET /api/chat/conversations/:id` — Complete message and tool trace retrieval.
- `DELETE /api/chat/conversations/:id` — Session deletion and cleanup verification.
- `Rate Limiting Middleware` — Burst validation and HTTP 429 response enforcement.

---

## 📡 REST API Reference

### Health & Agent Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check, database status, and active agent listing |
| `GET` | `/api/agents` | List all available multi-agents and their descriptions |
| `GET` | `/api/agents/:type/capabilities` | Inspect tools and domain capabilities for a specific agent |
| `GET` | `/api/users` | List pre-seeded customer accounts for session testing |

### Chat & Conversation Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat/messages` | Send message, trigger multi-agent reasoning, and persist response |
| `GET` | `/api/chat/conversations` | List all conversations for the authenticated customer |
| `GET` | `/api/chat/conversations/:id` | Get full message history, reasoning traces, and tool calls |
| `DELETE`| `/api/chat/conversations/:id` | Permanently delete a conversation thread |

---

## 🤖 Multi-Agent Tool Capabilities

| Agent | Responsibilities | Live Database Tools |
| :--- | :--- | :--- |
| **Router Agent** | Master orchestrator, intent classification, entity extraction, context compaction. | Context Compactor, Sub-Agent Dispatcher |
| **Order Agent** | Order status, tracking, address updates, cancellations, and RMA returns. | `listUserOrders`<br/>`fetchOrderDetails`<br/>`checkDeliveryStatus`<br/>`initiateReturn`<br/>`cancelOrder`<br/>`modifyShippingAddress` |
| **Billing Agent** | Invoices, payment records, refund audits, and subscription terms. | `listUserInvoices`<br/>`getInvoiceDetails`<br/>`checkRefundStatus`<br/>`requestRefund`<br/>`getSubscriptionDetails` |
| **Support Agent** | Knowledge base policy queries, warranty terms, and hardware troubleshooting. | `queryKnowledgeBase`<br/>`queryConversationHistory`<br/>`getUserProfile` |


