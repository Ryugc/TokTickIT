# Lab 2 — AI Use and Reflection

**Agent / Tool Used:** GCP Antigravity Coding Agent  
**LLM Used:** Gemini 3.5 Flash

---

## 📋 Selected Key Prompts & Task Logs

| # | Task / Issue | Prompt Summary | Result & Reflection |
| :-: | :--- | :--- | :--- |
| **1** | **Lab 2 Setup & Specifications** | Prompted agent to read lab guidelines and assist in drafting `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` templates. | **Success:** Established complete engineering contract and test traceability matrix prior to coding. |
| **2** | **Issue 2: Dev Requester Context** | Asked agent to implement `RequesterUser` schema, seed 4 active and 1 inactive requesters, create `GET /api/requesters` endpoint, build the UI selector modal with context state, and write automated tests. | **Success:** Generated Prisma models, seed data, API routes, and React context modal cleanly. All backend and UI component tests passed. |

---

## 📝 Detailed Prompt Logs

### Prompt #2: Issue 2 — Development Requester Context & Identity Selector
> **Prompt:**  
> *"Please implement Issue #2: Development Requester Context & Identity Selector according to docs/lab-02/specification.md, api-spec.md, and ui-spec.md.

Requirements:
1. Database & Schema (server/prisma/schema.prisma):
   - Add RequesterUser model with fields: id (Int @id @default(autoincrement())), name (String), email (String @unique), department (String), isActive (Boolean @default(true)), createdAt (DateTime @default(now())).
   - Add relations to Ticket model if needed.

2. Database Seed (server/prisma/seed.ts):
   - Update the seed script using upsert to seed at least 4 ACTIVE Requesters (e.g., Jennifer Anderson, Sarah Johnson, David Lee, Michael Brown) and at least 1 INACTIVE Requester (e.g., Inactive Test User).

3. Backend API (server/src/routes or index.ts):
   - Create GET /api/requesters endpoint returning only active requesters (isActive: true) ordered by name.
   - Write automated Supertest tests in server/tests/lab-02/requesters.api.test.ts verifying GET /api/requesters returns 200 OK and filters out inactive users.

4. Frontend Context & UI (client/src/):
   - Create a DevRequesterContext (or local storage state) to store the currently selected Requester ID and profile object.
   - Create a Development Requester Selector modal/screen matching Zen Green styling (docs/lab-02/ui-spec.md).
   - Display active requesters in a dropdown, a "Continue" button, and explanatory text stating this is a testing context and not secure login.
   - Display the selected Requester's name in the header/app shell with a "Change Requester" button.
   - Write Vitest tests in client/src/lab-02 tests/DevRequesterSelector.test.tsx verifying rendering, dropdown selection, and state updates.

Please run the database migration/seed and verify all tests pass before completing."*
>
> **Reflection:**  
> The agent generated the Prisma schema, database seed script, Express route, and React selector component in one pass. Having the specification and API contract clearly defined beforehand prevented the agent from inventing unnecessary authentication fields like passwords or JWT tokens.

| **3** | **Issue 3: Create Ticket & Attachment API** | Asked agent to implement `POST /api/tickets` with backend ticket number generation, file upload route for JPG/PNG/WEBP/PDF <= 5MB, Zen Green Create Ticket UI, and Supertest/Vitest coverage. | **Success:** Ticket creation and file attachment handling implemented cleanly. All validation and API test cases passed. |