# Task Workflow API

A small backend service that demonstrates:

- Clean architecture (layers/modules)
- Correctness under edge cases
- Idempotency
- Concurrency-safe updates (optimistic locking)
- Event / Outbox pattern
- Tests that matter

This project is intentionally kept simple while showcasing production-grade backend design principles.

---

## 📌 Overview

**Task Workflow API** is a single service responsible for managing tasks within a multi-tenant and multi-workspace environment.

Each task:
- Belongs to a `tenant_id` and `workspace_id`
- Has a lifecycle (state machine)
- Can be assigned to an agent
- Produces audit events for every important action

---

## 🧱 Architecture

The codebase follows a **Clean Architecture–inspired structure**:

```
src/
├── application/
│ └── usecases/ # Business logic (use cases)
├── domain/
│ ├── taskStateMachine.ts # State machine rules
│ └── errors.ts # Domain errors
├── infrastructure/
│ ├── db/
│ │ ├── knex.ts # Database connection
│ │ ├── migrate.ts # Schema migration
│ │ └── repositories/ # Data access layer
│ └── http/
│ ├── routes.ts # HTTP routes
│ └── errorMapper.ts # Error → HTTP mapping
├── server.ts # Fastify app builder
└── index.ts # Application entry point
```

**Dependency direction:**

- Domain contains pure business rules
- Application orchestrates use cases
- Infrastructure adapts HTTP and database concerns

---

## 🔑 Core Domain

### Task

A task has the following properties:

- `task_id` (UUID)
- `tenant_id`
- `workspace_id`
- `title`
- `priority` (`LOW | MEDIUM | HIGH`)
- `state` (`NEW | IN_PROGRESS | DONE | CANCELLED`)
- `assignee_id` (nullable)
- `version` (optimistic lock)
- timestamps

---

### Roles

- **agent**
- **manager**

---

### State Machine

Allowed transitions:

NEW → IN_PROGRESS
NEW → CANCELLED
IN_PROGRESS → DONE
IN_PROGRESS → CANCELLED

---

## 🚀 How to Run

### 1️⃣ Prerequisites

- Node.js ≥ 18
- PostgreSQL
- npm

---

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Configure database

Edit database connection in:

```bash
src/infrastructure/db/knex.ts

export const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'task_workflow'
  }
})
```

### 4️⃣ Run database migration
```bash
npx ts-node src/infrastructure/db/migrate.ts
```

### 5️⃣ Start the server
```bash
npx ts-node src/index.ts
```
Server will run on:
```bash
http://localhost:3000
```

## 🚀 How to Test

```
npm test
```

Test coverage includes:

1. Idempotent task creation
1. Invalid state transition returns 409
1. Agent cannot complete an unassigned task
1. Optimistic locking version conflict
1. Outbox event created on state transition

## 📡 API Endpoints & Sample cURL

### 1️⃣ Create Task (Idempotent)

```
curl -X POST http://localhost:3000/v1/workspaces/w1/tasks \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: t1" \
  -H "Idempotency-Key: abc-123" \
  -d '{
    "title": "Follow up customer",
    "priority": "HIGH"
  }'
```

```
{
  "task_id": "uuid",
  "state": "NEW",
  "version": 1
}
```

### 2️⃣ Assign Task (Manager only)

```
curl -X POST http://localhost:3000/v1/workspaces/w1/tasks/{taskId}/assign \
  -H "Content-Type: application/json" \
  -H "X-Role: manager" \
  -H "If-Match-Version: 1" \
  -d '{
    "assignee_id": "u_123"
  }'
```

### 3️⃣ Transition Task State

```
curl -X POST http://localhost:3000/v1/workspaces/w1/tasks/{taskId}/transition \
  -H "Content-Type: application/json" \
  -H "X-Role: agent" \
  -H "X-User-Id: u_123" \
  -H "If-Match-Version: 2" \
  -d '{
    "to_state": "IN_PROGRESS"
  }'
```

### 4️⃣ Get Task + Audit Timeline

```
curl http://localhost:3000/v1/workspaces/w1/tasks/{taskId}
```
Response includes:
1. Task fields
1. Embedded timeline of the last 20 events

### 5️⃣ List Tasks (Filtering + Cursor Pagination)

```
curl "http://localhost:3000/v1/workspaces/w1/tasks?state=IN_PROGRESS&limit=10"
```

### 6️⃣ Get Outbox Events
```
curl "http://localhost:3000/v1/events?limit=50"
```

## 📝 Brief Notes (Design Decisions)

### State Machine & Authorization
State transitions are enforced in the domain/application layer, not in controllers.

Authorization rules:

- Agent

1. Can move NEW → IN_PROGRESS only if assigned
1. Can move IN_PROGRESS → DONE only if assigned

- Manager

1. Can cancel tasks in NEW or IN_PROGRESS

Invalid transitions always return 409 Conflict.

### 🔐 Idempotency

Idempotency is implemented using an idempotency_keys table.

- Requests with the same Idempotency-Key
- Return the same response
- Prevent duplicate task creation

The idempotency check and write happen in the same database transaction.

### Concurrency Safety (Optimistic Locking)

- Every task has a version field
- Clients must send If-Match-Version
- Updates succeed only if the version matches
- Version increments on every update
- Mismatches return 409 Conflict

This ensures safe concurrent updates without locking rows.

### 📦 Event / Outbox Pattern

Every important action creates an event:

- TaskCreated
- TaskAssigned
- TaskStateChanged

Events are written to the task_events table in the same transaction as the task update.

A simple endpoint (GET /v1/events) exposes the outbox to demonstrate the pattern, without introducing Kafka or other infrastructure.