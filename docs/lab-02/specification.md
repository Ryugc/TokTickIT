# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a responsive, Requester-facing IT support ticketing MVP for TokTickIT using a temporary Development Requester identity context. Requesters can create tickets with validated attachments, inspect owned tickets with search/filter/pagination, and manage attachments using soft removal rules.

## 2. Stakeholder Request Interpretation
The IT department requires an end-user ticketing interface. Since full authentication is deferred to Lab 3, Lab 2 utilizes a Development Requester selector to establish session identity. Requesters must be able to log a problem, categorize it, attach supporting files, view their owned ticket history, and safely soft-remove file attachments without exposing data to other Requesters.

## 3. Scope

### Included
- Development Requester selection modal/screen and context switcher.
- Create Ticket form with real-time validation and file attachment uploads.
- My Tickets paginated list view with search, filtering, sorting, and empty/no-results states.
- Requester Ticket Detail view for owned tickets.
- Attachment lifecycle management: upload, metadata display, file download, and soft removal with mandatory reason logging.
- Zen Green UI styling, responsive design across Desktop, Tablet, and Mobile viewports.

### Excluded
- User authentication, password hashing, JWT sessions, or real RBAC (deferred to Lab 3).
- IT Staff workflow (ticket assignment, queue management, status changes beyond initial state).
- Ticket collaboration features (Public Comments, Internal Notes, Actions Taken).
- Admin management of users, categories, or reference systems.

---

## 4. Functional Requirements
- **FR-01**: The system shall provide a Development Requester selection screen listing only active Requesters from PostgreSQL.
- **FR-02**: The system shall generate a unique, read-only Ticket Number (`TKT-YYYY-XXXXXX`) on the backend upon ticket submission.
- **FR-03**: Requesters shall submit tickets with summary, description, category, related system, requested priority, and optional attachments.
- **FR-04**: The system shall list only tickets belonging to the currently selected Development Requester.
- **FR-05**: Requesters shall filter ticket lists by Category and Priority, search by Summary/Number, sort by date/status, and page through results.
- **FR-06**: Requesters shall open detail views for owned tickets and view read-only ticket metadata.
- **FR-07**: Requesters shall upload permitted attachments (JPG, PNG, WEBP, PDF up to 5 MB each, max 5 active per ticket).
- **FR-08**: Requesters shall soft-remove an attachment by providing a mandatory removal reason. Soft-removed attachments remain visible as metadata but cannot be downloaded.

---

## 5. Business Rules
- **BR-01**: Official Ticket Numbers are backend-generated and immutable.
- **BR-02**: Newly created tickets default to `Current Status: New`.
- **BR-03**: The Development Requester selector is a testing identity tool and does NOT constitute secure authentication.
- **BR-04**: Direct access attempts to view or modify tickets belonging to another Requester shall be rejected with HTTP 403 Forbidden.
- **BR-05**: Permitted attachment file types are strictly `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. File size must not exceed 5,242,880 bytes (5 MB).
- **BR-06**: A ticket can have a maximum of 5 active (non-removed) attachments at any time.
- **BR-07**: Attachment deletion must perform a soft removal (`isRemoved = true`). The record retains removal metadata and reason, and file download endpoints must block access to soft-removed files.
- **BR-08**: Inactive Requesters (`isActive = false`) must be hidden from the Development Requester selection interface.

---

## 6. UI Specification Summary
- **Palette**: Zen Green Theme (#006B3C primary, #0B7A46 active/hover, #EAF6EF pale container).
- **Form Controls**: Labels above inputs with red asterisks for required fields. Clear distinction between editable white inputs and read-only gray-green inputs.
- **Responsive Views**: Desktop (≥992px) multi-column layout; Tablet (768–991px) two-column layout; Mobile (<768px) stacked card layout without horizontal scrolling.

---

## 7. Data Changes
- **RequesterUser**: `id`, `name`, `email`, `department`, `isActive`, `createdAt`.
- **Category**: `id`, `name` (unique), `createdAt`.
- **RelatedSystem**: `id`, `name` (unique), `createdAt`.
- **Ticket**: `id`, `ticketNumber` (unique), `summary`, `description`, `requestedPriority` (enum), `currentStatus` (enum default `NEW`), `requesterId` (FK), `categoryId` (FK), `relatedSystemId` (FK), `createdAt`, `updatedAt`.
- **Attachment**: `id`, `fileName`, `fileType`, `fileSize`, `storagePath`, `isRemoved` (boolean default `false`), `removalReason` (nullable string), `ticketId` (FK), `createdAt`.

---

## 8. API Contract Summary
- `GET /api/requesters` — Fetch active Development Requesters.
- `POST /api/tickets` — Create a new ticket for the active Requester.
- `GET /api/tickets` — Search, filter, and paginate tickets for the active Requester.
- `GET /api/tickets/:id` — Retrieve owned ticket details.
- `POST /api/tickets/:id/attachments` — Upload supporting evidence attachment.
- `DELETE /api/attachments/:id` — Soft-remove an attachment with mandatory reason payload.
- `GET /api/attachments/:id/download` — Download active attachment file.

---

## 9. Acceptance Criteria
- **AC-01**: Given valid ticket fields, when submitted by the active Requester, then a HTTP 201 response is returned containing the generated `ticketNumber`.
- **AC-02**: Given no Development Requester context selected, when navigating to `/tickets`, then the user is redirected to the Requester Selection modal.
- **AC-03**: Given Requester A is active, when requesting tickets owned by Requester B via API or direct route, then a 403 Forbidden status is returned.
- **AC-04**: Given an attachment over 5 MB or invalid file type (e.g., .exe), when uploaded, then client validation halts request and backend returns 400 Bad Request.
- **AC-05**: Given an active attachment on an owned ticket, when soft-removed with a reason, then `isRemoved` becomes true, the reason is logged, and download attempts return 410 Gone / 404 Not Found.

---

## 10. Definition of Done
- All backend routes, schemas, and UI components implemented according to specification.
- 100% automated test pass rate for unit, API integration, and component tests.
- Database seeded with 4 categories, ≥6 related systems, ≥4 active requesters, and ≥1 inactive requester.
- Peer review completed in `reviewer.md` and feature branch merged into `lab2-staging` via PR.

---

## 11. Assumptions and Decisions
- Attachment storage during Lab 2 utilizes local server disk storage (`server/uploads/`) with hashed filenames to avoid collisions.
- Pagination defaults to 10 records per page.