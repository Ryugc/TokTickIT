# Peer Review Log — Lab 2 Sprint

## Reviewer Identity
- **Primary Reviewer:** MoeThaukKo3483 (Collaborator)
- **Author / Developer:** Ryugc (Owner)
- **Target Staging Branch:** `lab2-staging`
- **Release Branch:** `main`

---

## Pull Request Lifecycle & Review Summary

| PR # | Feature Branch | Title | Status | Link |
| :--- | :--- | :--- | :--- | :--- |
| **#21** | `feature/1-spec` | docs: add specification, api-spec, ui-spec, and tests matrix | Merged | [PR #21](https://github.com/Ryugc/toktickit/pull/21) |
| **#22** | `feature/2-dev-requester` | feat: implement Dev Requester selector context and seed data | Merged | [PR #22](https://github.com/Ryugc/toktickit/pull/22) |
| **#23** | `feature/3-create-ticket` | feat: implement Create Ticket view and initial attachment upload | Merged | [PR #23](https://github.com/Ryugc/toktickit/pull/23) |
| **#24** | `feature/4-my-tickets` | feat: implement My Tickets list, search, filters, and pagination | Merged | [PR #24](https://github.com/Ryugc/toktickit/pull/24) |
| **#25** | `feature/5-ticket-detail` | feat: implement ticket detail view, attachment download, soft removal, and E2E tests | Merged | [PR #25](https://github.com/Ryugc/toktickit/pull/25) |

---

## Detailed Peer Review Logs

### PR #21: Sprint Specification & Test Matrix (`feature/1-spec`)
* **Reviewer:** MoeThaukKo3483
* **Inline Comment 1 (`docs/lab-02/specification.md`):** 
  > "The business rules (BR-01 through BR-08) and scope boundaries are very detailed. very good on documenting that authentication is deferred to Lab 3 while keeping identity mockable"
* **Inline Comment 2 (`docs/lab-02/tests.md`):** 
  > "The planned test matrix cleanly maps every Acceptance Criterion (AC-01 to AC-12) to explicit server and client test paths. Very good layout and all are readable."
* **Developer Response:** 
  > "Thanks! Verified that all AC entries strictly map to unit, integration, and Playwright test file targets."
* **Decision:** **Approved & Merged** into `lab2-staging`.

---

### PR #22: Dev Requester Context & Seed Data (`feature/2-dev-requester`)
* **Reviewer:** MoeThaukKo3483
* **Inline Comment 1 (`server/prisma/seed.ts`):** 
  > "Idempotent seed setup very clean. Properly creates active Requesters and at least one inactive Requester to verify filtering behavior. Very good"
* **Developer Response:** 
  > "Verified that running `npx prisma db seed` repeatedly works safely without duplicating records."
* **Decision:** **Approved & Merged** into `lab2-staging`.

---

### PR #23: Create Ticket Screen & Attachments (`feature/3-create-ticket`)
* **Reviewer:** MoeThaukKo3483
* **Inline Comment 1 (`server/prisma/schema.prisma`):** 
  > "The updated Ticket and Attachment models are organized. very good setting default currentStatus to NEW and making clean foreign key relations with RequesterUser and Category."
* **Inline Comment 2 (`client/src/components/DevRequesterSelector.tsx`):** 
  > "Inline error messages under the inputs work perfectly, and the green button busy state prevents duplicate form submissions."
* **Developer Response:** 
  > "Thanks! Enforced field-level red error messaging and double-submit protection on all form inputs."
* **Decision:** **Approved & Merged** into `lab2-staging`.

---

### PR #24: My Tickets List, Search, Filters, & Pagination (`feature/4-my-tickets`)
* **Reviewer:** MoeThaukKo3483
* **Inline Comment 1 (`server/src/app.ts`):** 
  > "Clean query parameter handling for search, categoryId, requestedPriority, and currentStatus. Case-insensitive filtering on both summary and ticketNumber works great, and requiring X-Requester-Id strictly guarantees requester data isolation. very good"
* **Developer Response:** 
  > "Appreciate the feedback! Verified requester data isolation and case-insensitive search queries across server API tests."
* **Decision:** **Approved & Merged** into `lab2-staging`.

---

### PR #25: Ticket Detail View & Soft Attachment Removal (`feature/5-ticket-detail`)
* **Reviewer:** MoeThaukKo3483
* **Inline Comment 1 (`client/src/components/AttachmentSection.tsx`):** 
  > "The soft removal modal correctly blocks submission until a non empty reason is typed. Soft removed items cleanly switch to disabled metadata styling displaying the removal reason. very good"
* **Inline Comment 2 (`e2e/lab-02/requester-ticket-flow.spec.ts`):** 
  > "The Playwright spec cleanly walks through the full user journey, selecting identity, creating a ticket, navigating to detail view, uploading attachments, and executing soft removal. it look good to me"
* **Developer Response:** 
  > "Thank you! Verified 410 Gone download blocking for removed attachments and ran full Playwright E2E suites successfully."
* **Decision:** **Approved & Merged** into `lab2-staging`.