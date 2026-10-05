# Lab 4 Sprint Engineering Specification: Actions Taken, Ticket Workflow & Dashboards

## 1. Sprint Goal
Expand TokTickIT ticket management capabilities by introducing an **Actions Taken** audit log for IT Staff/Admins, expanding ticket status workflows (`WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED`), enforcing the ticket **Resolution Gate**, and delivering role-specific operational metrics dashboards for both IT Staff and Requesters.

---

## 2. Stakeholder Request Interpretation
As TokTickIT scales, IT Staff require structured logging of diagnostic and resolution steps taken on tickets ("Actions Taken") beyond simple public comments or internal notes. Actions Taken record exact procedures performed, results obtained, follow-up flags/notes, and attachment references.

Additionally, ticket lifecycles require higher granularity. Tickets can be placed in `WAITING_FOR_REQUESTER` when awaiting user response, `REOPENED` when issues recur, or `CANCELLED` when requests are voided.

Finally, both IT Staff and Requesters require high-visibility dashboards:
1. **IT Staff / Admin Operational Dashboard**: High-level view of unassigned tickets, personal assigned load, status breakdown, and recent ticket activity.
2. **Requester Personal Dashboard**: Concise view of total active open, in-progress, resolved, and closed tickets submitted by the user.

---

## 3. Scope

### Included
- **Schema & Database Updates**:
  - Expansion of `TicketStatus` Enum: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `REOPENED`, `CLOSED`, `CANCELLED`.
  - Addition of `ActionTaken` model with UUID PK, foreign keys to `Ticket` (cascade delete) and `User` (performedBy), description, result, follow-up flag, follow-up note, attachment notes, and timestamps.
  - Seeding across all 8 status states and varied ActionTaken entry counts (0, 1, multiple).
- **Backend API Endpoints**:
  - `GET /api/tickets/:id/actions`: Retrieve Actions Taken for a ticket (Requesters limited to owned tickets; Staff/Admin full access).
  - `POST /api/tickets/:id/actions`: Log a new Action Taken entry (Staff/Admin only; automated user session attribution).
  - `PATCH /api/actions/:id`: Update an existing Action Taken entry (Staff/Admin only).
  - `GET /api/dashboard/staff`: Staff operational metrics (unassigned count, assigned count, status breakdown, top 5 recent tickets).
  - `GET /api/dashboard/requester`: Requester personal metrics (owned ticket status counts, top 5 recent tickets).
- **Security & Authorization**:
  - Role-based access control (RBAC) preventing Requesters from creating/modifying Actions Taken or accessing Staff Dashboard.
  - Strict validation enforcing `followUpNote` when `followUpRequired` is `true`.
  - Backend Resolution Gate enforcement blocking transition to `RESOLVED` or `CLOSED` without an Action Taken entry.

### Excluded
- Real-time WebSockets push for dashboard counters (polling/fetch on load is used).
- Automated SLA timer triggers or background cron job auto-closing.

---

## 4. Functional Requirements (FR)

- **FR-01 (Actions Log Retrieval)**: The system shall return all `ActionTaken` entries associated with a ticket, sorted chronologically, accessible to authorized IT Staff/Admins and the ticket's Requester owner.
- **FR-02 (Action Item Logging)**: IT Staff and Admins shall log action entries specifying `description`, `result`, `followUpRequired`, `followUpNote` (if follow-up required), and `attachmentNotes`.
- **FR-03 (Action Item Editing)**: IT Staff and Admins shall update existing `ActionTaken` entries.
- **FR-04 (Requester Action Read Access)**: Ticket owners (Requesters) shall view Actions Taken on their own tickets in read-only mode.
- **FR-05 (Expanded Ticket Status Enum)**: The system shall support 8 ticket statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `REOPENED`, `CLOSED`, `CANCELLED`.
- **FR-06 (Status State Machine Enforcement)**: System shall enforce status transitions adhering to the expanded status transition matrix.
- **FR-07 (Resolution Gate Verification)**: The system shall verify at least one `ActionTaken` entry exists before permitting status transition to `RESOLVED` or `CLOSED`.
- **FR-08 (Staff Operational Dashboard Metrics)**: IT Staff and Admins shall retrieve operational metrics: `unassignedCount`, `myAssignedCount`, `newCount`, `openCount`, `inProgressCount`, and `waitingForRequesterCount`.
- **FR-09 (Staff Recent Activity Stream)**: Staff Dashboard shall return the top 5 most recently updated tickets across the system.
- **FR-10 (Requester Personal Metrics)**: Authenticated Requesters shall retrieve personal metrics for owned tickets: `openCount`, `inProgressCount`, `resolvedCount`, `closedCount`.
- **FR-11 (Requester Recent Activity Stream)**: Requester Dashboard shall return top 5 most recently updated tickets owned by the active user.

---

## 5. Mandatory Business Rules (BR)

- **BR-01 (Action Creation RBAC)**: Only `IT_STAFF` and `ADMIN` roles can create or modify `ActionTaken` records (`403 Forbidden` for `REQUESTER`).
- **BR-02 (Follow-up Note Validation)**: If `followUpRequired` is `true`, `followUpNote` MUST be a non-empty string (`400 Bad Request` if missing or empty).
- **BR-03 (Session Attribution)**: `performedById` MUST be automatically derived from `req.user.id` during `ActionTaken` creation; client payload overrides are ignored.
- **BR-04 (Cascade Deletion)**: Deleting a `Ticket` record MUST cascade-delete all associated `ActionTaken` records.
- **BR-05 (Requester Isolation)**: Requesters attempting to view `GET /api/tickets/:id/actions` for a ticket they do not own MUST receive `403 Forbidden`.
- **BR-06 (Status Enum Integrity)**: Invalid status strings submitted to status update APIs MUST return `400 Bad Request`.
- **BR-07 (Status Transition Matrix)**: Permitted transitions enforced strictly on frontend and backend:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`, `OPEN`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CLOSED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`, `OPEN`
  - `REOPENED` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`, `OPEN`
  - `CLOSED` -> `REOPENED`, `OPEN`
  - `CANCELLED` -> `REOPENED`, `OPEN`
- **BR-08 (Resolution Gate Rule)**: A ticket CANNOT be updated to `RESOLVED` or `CLOSED` unless at least ONE `ActionTaken` record exists for that ticket. Backend MUST return `400 Bad Request` if attempted without an action entry.
- **BR-09 (Staff Dashboard Unassigned Logic)**: `unassignedCount` counts tickets where `assignedToId IS NULL` and status is NOT `CLOSED` and NOT `CANCELLED`.
- **BR-10 (Staff Dashboard Assigned Logic)**: `myAssignedCount` counts tickets where `assignedToId === activeUserId` and status is NOT `CLOSED` and NOT `CANCELLED`.
- **BR-11 (Staff Dashboard Status Breakdown)**: `newCount`, `openCount`, `inProgressCount`, and `waitingForRequesterCount` reflect system-wide ticket status totals.
- **BR-12 (Staff Dashboard Limit)**: `recentTickets` MUST return a maximum of 5 tickets ordered by `updatedAt DESC`.
- **BR-13 (Requester Dashboard Scope)**: Requester dashboard counters and recent tickets MUST strictly filter by `requesterId === activeUserId`.
- **BR-14 (Requester Dashboard Counts Logic)**: Returns `openCount`, `inProgressCount`, `resolvedCount`, and `closedCount` for active user tickets.
- **BR-15 (Requester Dashboard Limit)**: Requester `recentTickets` MUST return max 5 tickets owned by user ordered by `updatedAt DESC`.
- **BR-16 (Zen Green UI Guidelines)**: All Lab 4 UI dashboard components must adopt Zen Green palette tokens (`#006B3C` primary, crisp card borders, accessible WCAG contrast).

---

## 6. Ticket Status State Machine Matrix

| Current Status | Allowed Target Statuses |
| :--- | :--- |
| `NEW` | `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED` |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED` |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`, `OPEN` |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CLOSED`, `CANCELLED` |
| `RESOLVED` | `CLOSED`, `REOPENED`, `OPEN` |
| `REOPENED` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`, `OPEN` |
| `CLOSED` | `REOPENED`, `OPEN` |
| `CANCELLED` | `REOPENED`, `OPEN` |

---

## 7. Acceptance Criteria (AC)

- **AC-01**: Given an authorized IT Staff user and valid data, when an Action Taken entry is logged, then it is saved under the target ticket with `performedById` set to the logged-in user.
- **AC-02**: Given `followUpRequired` is checked, when the user attempts submission without a `followUpNote`, then validation prevents submission and presents a clear error message.
- **AC-03**: Given a ticket with zero Action Taken entries, when an IT Staff member attempts to transition status to `RESOLVED` or `CLOSED`, then the system blocks the update with a `400 Bad Request` Resolution Gate error.
- **AC-04**: Given an authenticated Requester, when accessing the Requester Dashboard, then returned metrics and recent tickets strictly belong to that user.
- **AC-05**: Given an authenticated IT Staff member, when accessing the Staff Dashboard, then system-wide unassigned counts, assigned counts, and status breakdowns match live database queries.
- **AC-06**: Given an authenticated Requester, when viewing owned ticket details, then existing Actions Taken are visible in read-only mode, and creation controls are completely hidden.

---

## 8. Migration Decisions & Schema Rationale

1. **UUID Primary Key for `ActionTaken`**: `ActionTaken` uses `@default(uuid())` string IDs to allow client-side key generation capabilities and unique audit tracking across distributed stores.
2. **Foreign Key Types**: `ticketId` (`Int`) and `performedById` (`Int`) reference `Ticket.id` (`Int`) and `User.id` (`Int`) respectively to satisfy PostgreSQL referential integrity.
3. **Enum Extension**: PostgreSQL enum `TicketStatus` is altered cleanly via Prisma migration to include `'WAITING_FOR_REQUESTER'`, `'REOPENED'`, and `'CANCELLED'`.

---

## 9. Product Definition of Done (DoD)

- [x] Prisma migration applied cleanly and idempotently seeded.
- [x] All 8 ticket statuses implemented and enforced via state machine.
- [x] Resolution Gate enforced on backend and frontend.
- [x] Staff and Requester operational dashboards functional with Zen Green styling.
- [x] 100% test pass rate across unit, API, UI, authorization, and E2E test suites on `main`.
- [x] Accessibility audit passed with zero keyboard locks or clipping bugs.
