# Lab 2 — AI Use and Reflection

**Agent / Tool Used:** GCP Antigravity Coding Agent  
**LLM Used:** Gemini 3.5 Flash  

---

## 📋 Selected Key Prompts & Task Logs

| # | Task / Issue | Prompt Summary | Result & Reflection |
| :-: | :--- | :--- | :--- |
| **1** | **Lab 2 Setup & Specifications** | Prompted agent to read lab guidelines and assist in drafting `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` templates. | **Success:** Established complete engineering contract and test traceability matrix prior to coding. |
| **2** | **Issue 2: Dev Requester Context** | Asked agent to implement `RequesterUser` schema, seed 4 active and 1 inactive requesters, create `GET /api/requesters` endpoint, build the UI selector modal with context state, and write automated tests. | **Success:** Generated Prisma models, seed data, API routes, and React context modal cleanly. All backend and UI component tests passed. |
| **3** | **Issue 3: Create Ticket & Attachment API** | Prompted agent to implement `POST /api/tickets` with backend ticket number generation (`TKT-2026-XXXXXX`), file upload handling (JPG/PNG/WEBP/PDF <= 5MB), Zen Green Create Ticket UI, and Supertest/Vitest coverage. | **Success:** Ticket creation and file attachment handling implemented cleanly. All validation and API test cases passed. |
| **4** | **Issue 4: My Tickets List & Querying** | Prompted agent to implement `GET /api/tickets` with search, filtering (category, priority, status), pagination metadata, and requester data isolation (`X-Requester-Id`), along with desktop table and mobile card views. | **Success:** Search and filter queries executed cleanly with 100% requester isolation. Responsive switching between desktop table and mobile cards worked smoothly. |
| **5** | **Issue 5: Ticket Detail & Soft Removal** | Asked agent to implement read-only Ticket Detail view (`#F0F4F2` backgrounds), soft attachment removal with required reason modal, `410 Gone` download blocking, and `403 Forbidden` ownership protection. | **Success:** Enforced strict soft-removal rules and ownership checks. Removed files retain metadata while blocking downloads. |
| **6** | **Playwright E2E & Responsive Testing** | Prompted agent to write full end-to-end Playwright specs verifying the entire workflow across desktop, tablet, and mobile viewports. | **Success:** Automated full end-to-end user journey from identity selection to ticket creation, listing, detail inspection, and soft removal. |

---

## 📝 Detailed Prompt Logs

### Prompt #1: Setup & Engineering Contract (Spec DD)
> **Prompt:**  
> *"Please review the Lab 2 lab sheet requirements and help generate the initial markdown documentation under docs/lab-02/ (specification.md, api-spec.md, ui-spec.md, tests.md). Define explicit business rules (BR-01 through BR-08), functional requirements, acceptance criteria (AC-01 through AC-12), and the test traceability matrix before writing any application code."*
>
> **Reflection:**  
> Establishing the engineering contract upfront provided strict constraints for subsequent coding prompts. This ensured the AI agent strictly respected scope boundaries (e.g., deferring real authentication to Lab 3).

### Prompt #2: Issue 2 — Development Requester Context & Identity Selector
> **Prompt:**  
> *"Please implement Issue #2: Development Requester Context & Identity Selector according to docs/lab-02/specification.md, api-spec.md, and ui-spec.md.
> 
> Requirements:
> 1. Database & Schema (`server/prisma/schema.prisma`): Add `RequesterUser` model with `isActive` flag.
> 2. Database Seed (`server/prisma/seed.ts`): Seed 4 active requesters and 1 inactive requester safely using upserts.
> 3. Backend API: `GET /api/requesters` returning active users ordered by name.
> 4. Frontend Context & UI: `DevRequesterContext` for local storage state, identity selection modal using Zen Green styling (`#006B3C`), clear testing banner, and app header identity badge with "Change Requester" action."*
>
> **Reflection:**  
> Having the specification and API contract clearly defined beforehand prevented the agent from inventing unnecessary authentication fields like passwords or JWT tokens.

### Prompt #3: Issue 3 — Create Ticket View & Attachment Upload
> **Prompt:**  
> *"Please implement Issue #3: Create Ticket Screen and Attachment Upload per docs/lab-02/specification.md and api-spec.md.
> 
> Requirements:
> 1. API: `POST /api/tickets` validating required fields (summary, description, category, priority, requesterId). Generate official `TKT-2026-XXXXXX` format IDs.
> 2. Attachments: Express Multer middleware accepting JPG, PNG, WEBP, and PDF under 5MB (max 5 active per ticket).
> 3. UI Component: `CreateTicket.tsx` with Zen Green layout, inline field validation error messages, drop-down options populated from `/api/categories` and `/api/related-systems`, and submission confirmation."*
>
> **Reflection:**  
> The agent generated correct validation rules for both client forms and server endpoints. Explicitly specifying error message placement kept validation feedback near the affected form fields rather than as a top-level alert.

### Prompt #4: Issue 4 — My Tickets List, Search, Filters, & Pagination
> **Prompt:**  
> *"Please implement Issue #4: My Tickets Screen per docs/lab-02/specification.md and ui-spec.md.
> 
> Requirements:
> 1. API: `GET /api/tickets` supporting `search`, `categoryId`, `requestedPriority`, `currentStatus`, `page`, and `limit`. Require `X-Requester-Id` header to guarantee requester data isolation.
> 2. UI: `MyTickets.tsx` with search input, filter dropdowns, clear filters action, desktop data table, responsive mobile card view (<768px), pagination controls, and distinct empty vs. no-results states."*
>
> **Reflection:**  
> Specifying requester data isolation (`X-Requester-Id`) in the prompt ensured the agent implemented backend database filtering rather than relying on insecure client-side filtering.

### Prompt #5: Issue 5 — Ticket Detail View & Soft Attachment Removal
> **Prompt:**  
> *"Please implement Issue #5: Requester Ticket Detail & Soft Attachment Removal per docs/lab-02/specification.md.
> 
> Requirements:
> 1. UI: `TicketDetail.tsx` rendering read-only ticket information with `#F0F4F2` input backgrounds and badge indicators for priority and status.
> 2. Soft Removal: `DELETE /api/attachments/:id` setting `isRemoved = true` and saving `removalReason`. Require modal reason input before submission.
> 3. Security: `GET /api/attachments/:id/download` returning `410 Gone` for soft-removed files and `403 Forbidden` for non-owned tickets."*
>
> **Reflection:**  
> The AI agent correctly implemented both the database soft-removal flag (`isRemoved`) and the `410 Gone` HTTP status code for download blocking, adhering to the exact spec requirements.

### Prompt #6: End-to-End Playwright Testing Suite
> **Prompt:**  
> *"Please create `e2e/lab-02/requester-ticket-flow.spec.ts` using Playwright to test the complete user lifecycle: selecting identity, creating a ticket with an attachment, viewing the ticket in My Tickets, navigating to detail view, and executing soft attachment removal across desktop, tablet, and mobile viewports."*
>
> **Reflection:**  
> Writing Playwright E2E tests provided automated visual and functional verification, confirming that all components integrated smoothly across screen sizes without layout clipping or horizontal overflow.

---

## 💡 My Reflection on AI Collaboration

Working with the GCP Antigravity Coding Agent (Gemini 3.5 Flash) demonstrated the power of **Spec-Driven Development (Spec DD)** and **Test-Driven Development (TDD)**. In earlier unconstrained attempts, AI agents tended to over-engineer solutions—such as prematurely adding full JWT authentication or IT Staff workflows that were explicitly out of scope for Lab 2[cite: 1].

By requiring the AI to first assist in drafting `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`, we established strict architectural guardrails[cite: 1]. When prompted with modular, issue-specific tasks tied directly to Acceptance Criteria, the agent produced clean, maintainable code on the first pass[cite: 1]. 

Key takeaways from this sprint:
1. **Clear Contracts Prevent Scope Creep:** Writing explicit business rules (`BR-01` to `BR-08`) kept the AI agent focused solely on Requester MVP features[cite: 1].
2. **Automated Verification builds Confidence:** Coupling AI-generated code with rigorous Supertest API specs, RTL component tests, and Playwright E2E tests ensured that edge cases—such as `403 Forbidden` data isolation and `410 Gone` soft-removal download blocking—were fully validated[cite: 1].
3. **Human Oversight is Critical:** While the AI agent was exceptionally fast at boilerplate and component scaffolding, human review was essential for verifying UI aesthetics (Zen Green palette compliance), database seeding idempotency, and clean Git staging workflows[cite: 1].
