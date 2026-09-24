# Lab 4 Sprint Engineering Specification: Actions Taken & Metrics Dashboards

## 1. Sprint Goal
Expand TokTickIT ticket management capabilities by introducing an **Actions Taken** audit log for IT Staff/Admins, expanding ticket status workflows (`WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED`), and delivering role-specific operational metrics dashboards for both IT Staff and Requesters.

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
- **FR-07 (Staff Operational Dashboard Metrics)**: IT Staff and Admins shall retrieve operational metrics: `unassignedCount`, `myAssignedCount`, `newCount`, `openCount`, `inProgressCount`, and `waitingForRequesterCount`.
- **FR-08 (Staff Recent Activity Stream)**: Staff Dashboard shall return the top 5 most recently updated tickets across the system.
- **FR-09 (Requester Personal Metrics)**: Authenticated Requesters shall retrieve personal metrics for owned tickets: `openCount`, `inProgressCount`, `resolvedCount`, `closedCount`.
- **FR-10 (Requester Recent Activity Stream)**: Requester Dashboard shall return top 5 most recently updated tickets owned by the active user.

---

## 5. Mandatory Business Rules (BR)

- **BR-01 (Action Creation RBAC)**: Only `IT_STAFF` and `ADMIN` roles can create or modify `ActionTaken` records (`403 Forbidden` for `REQUESTER`).
- **BR-02 (Follow-up Note Validation)**: If `followUpRequired` is `true`, `followUpNote` MUST be a non-empty string (`400 Bad Request` if missing or empty).
- **BR-03 (Session Attribution)**: `performedById` MUST be automatically derived from `req.user.id` during `ActionTaken` creation; client payload overrides are ignored.
- **BR-04 (Cascade Deletion)**: Deleting a `Ticket` record MUST cascade-delete all associated `ActionTaken` records.
- **BR-05 (Requester Isolation)**: Requesters attempting to view `GET /api/tickets/:id/actions` for a ticket they do not own MUST receive `403 Forbidden`.
- **BR-06 (Status Enum Integrity)**: Invalid status strings submitted to status update APIs MUST return `400 Bad Request`.
- **BR-07 (Status Transition Matrix)**:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`, `OPEN`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CLOSED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`, `OPEN`
  - `REOPENED` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`, `OPEN`
  - `CLOSED` -> `REOPENED`, `OPEN`
  - `CANCELLED` -> `REOPENED`, `OPEN`
- **BR-08 (Staff Dashboard Unassigned Logic)**: `unassignedCount` counts tickets where `assignedToId IS NULL` and status is NOT `CLOSED` and NOT `CANCELLED`.
- **BR-09 (Staff Dashboard Assigned Logic)**: `myAssignedCount` counts tickets where `assignedToId === activeUserId` and status is NOT `CLOSED` and NOT `CANCELLED`.
- **BR-10 (Staff Dashboard Status Breakdown)**: `newCount`, `openCount`, `inProgressCount`, and `waitingForRequesterCount` reflect system-wide ticket status totals.
- **BR-11 (Staff Dashboard Limit)**: `recentTickets` MUST return a maximum of 5 tickets ordered by `updatedAt DESC`.
- **BR-12 (Requester Dashboard Scope)**: Requester dashboard counters and recent tickets MUST strictly filter by `requesterId === activeUserId`.
- **BR-13 (Requester Dashboard Counts Logic)**: Returns `openCount`, `inProgressCount`, `resolvedCount`, and `closedCount` for active user tickets.
- **BR-14 (Requester Dashboard Limit)**: Requester `recentTickets` MUST return max 5 tickets owned by user ordered by `updatedAt DESC`.
- **BR-15 (Zen Green UI Guidelines)**: All Lab 4 UI dashboard components must adopt Zen Green palette tokens (`#006B3C` primary, crisp card borders, accessible WCAG contrast).

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

## 7. Migration Decisions & Schema Rationale
1. **UUID Primary Key for `ActionTaken`**: `ActionTaken` uses `@default(uuid())` string IDs to allow client-side key generation capabilities and unique audit tracking across distributed stores.
2. **Foreign Key Types**: `ticketId` (`Int`) and `performedById` (`Int`) reference `Ticket.id` (`Int`) and `User.id` (`Int`) respectively to satisfy PostgreSQL referential integrity.
3. **Enum Extension**: PostgreSQL enum `TicketStatus` is altered cleanly via Prisma migration to include `'WAITING_FOR_REQUESTER'`, `'REOPENED'`, and `'CANCELLED'`.
