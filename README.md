# TokTickIT 🎫

An IT Service Desk platform built for Software Engineering Lab 3 (Sprint 3), featuring full Role-Based Access Control (RBAC), session-based authentication, an IT Staff triage queue with state-machine ticket transitions, and Administrator user management with critical safety invariants.

---

## 📚 Lab 03 Documentation Links

- [Specification & Business Rules](docs/lab-03/specification.md)
- [API Specification & Endpoints](docs/lab-03/api-spec.md)
- [Test Strategy & Traceability Matrix](docs/lab-03/tests.md)
- [UI Specification & Design Tokens](docs/lab-03/ui-spec.md)
- [AI Usage Log](docs/lab-03/ai-use.md)
- [Peer Reviewer Log](docs/lab-03/reviewer.md)

---

## 🔐 Key Lab 03 Features

* **Session Authentication & Security:** Password hashing via bcrypt, session persistence, and enforced password change workflows for temporary credentials.
* **Role-Based Access Control (RBAC):** Strict route security and UI isolation across three roles (`REQUESTER`, `IT_STAFF`, `ADMIN`).
* **IT Staff Ticket Queue & Triage:** Dedicated triage dashboard with search, priority/status filtering, staff assignment, and separate public comments vs internal notes.
* **Workflow State Machine:** Enforced ticket status lifecycle transitions (`OPEN` -> `IN_PROGRESS` -> `RESOLVED` / `CLOSED`).
* **Admin User Management & Safety Invariants:** User provisioning and role updates guarded against self-deactivation, self-demotion, and zero-admin states.

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, Zen Green Theme (`#006B3C`)
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL, Bcrypt
- **Authentication:** Cookie/Session Auth Middleware
- **Testing:** React Testing Library, Vitest, Supertest, Playwright (E2E)

---

## 🚀 How to Run

### 1. Database Setup & Migrations
Ensure PostgreSQL is running, set up `server/.env`, and initialize the database:

```bash
cd server
npm install
npx prisma migrate dev
npx prisma db seed
