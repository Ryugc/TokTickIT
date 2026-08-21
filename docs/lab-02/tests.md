# Lab 2 Test Plan and Results

## 1. Test Strategy
The test strategy for Lab 2 combines unit tests for internal utilities, integration API tests using Supertest, component UI tests using Vitest and React Testing Library, and E2E tests using Playwright. Every Acceptance Criterion (AC) defined in `specification.md` must trace directly to at least one automated test.

---

## 2. Planned Tests

| Test ID | AC | Type | Scenario | Expected Outcome | File Location | Status |
| :-: | :-: | :-: | :--- | :--- | :--- | :-: |
| **API-01** | AC-01 | API | Create ticket with valid data | 201 Created; returns generated `ticketNumber` | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-02** | AC-02 | API | Fetch tickets without `X-Requester-Id` | 400 Bad Request; missing identity header | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-03** | AC-03 | API | Access ticket owned by another Requester | 403 Forbidden; cross-requester blocked | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| **API-04** | AC-04 | API | Upload file > 5 MB or invalid extension | 400 Bad Request; upload rejected | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-05** | AC-05 | API | Soft-remove attachment with reason | 200 OK; `isRemoved = true` logged | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-06** | AC-05 | API | Download soft-removed attachment | 410 Gone / 404 Not Found; download blocked | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **UI-01** | AC-02 | UI | Render Dev Requester Selector when unselected | Displays active Requester dropdown modal | `client/src/lab-02 tests/CreateTicket.test.tsx` | Pass |
| **UI-02** | AC-01 | UI | Submit ticket form without required summary | Displays field-level inline error in dark red | `client/src/lab-02 tests/CreateTicket.test.tsx` | Pass |
| **UI-03** | AC-01 | UI | Submit ticket with active loading state | Submit button shows spinner & disabled state | `client/src/lab-02 tests/CreateTicket.test.tsx` | Pass |
| **UI-04** | AC-03 | UI | Filter ticket list by category & search term | Table updates with matching items only | `client/src/lab-02 tests/MyTickets.test.tsx` | Pass |
| **UI-05** | AC-05 | UI | Open soft removal modal and verify reason field | Soft removal requires non-empty reason text | `client/src/lab-02 tests/AttachmentSection.test.tsx` | Pass |
| **E2E-01** | AC-01 | E2E | Full flow: Select Requester -> Create Ticket -> View in My Tickets | Ticket created and found in list | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Covered By Test IDs |
| :--- | :--- |
| **AC-01** (Valid Creation & Ticket Number) | `API-01`, `UI-02`, `UI-03`, `E2E-01` |
| **AC-02** (Identity Context Requirement) | `API-02`, `UI-01` |
| **AC-03** (Ownership Isolation) | `API-03`, `UI-04` |
| **AC-04** (Attachment Validation Limits) | `API-04` |
| **AC-05** (Soft Removal & Download Blocking) | `API-05`, `API-06`, `UI-05` |

---

## 4. Test Commands

Run the following commands to execute test suites locally:

```powershell
# Backend API Tests
npm --prefix server test tests/lab-02/

# Frontend UI Tests
npm --prefix client test src/lab-02\ tests/

# End-to-End Tests
npx playwright test e2e/lab-02/