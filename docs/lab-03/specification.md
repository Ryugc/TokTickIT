# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Implement secure, role-based authentication (JWT with HTTP-Only cookies), an IT Staff ticket management queue with ticket lifecycle workflow and priority controls, tabbed public comments and staff-only internal notes, and Admin user account management for TokTickIT.

## 2. Stakeholder Request Interpretation
TokTickIT requires a production-ready authentication and access control infrastructure. The temporary Development Requester identity context from Lab 2 is replaced by secure email/password authentication backed by bcrypt hashing and JSON Web Tokens (JWT). Users belong to one of three roles: `REQUESTER`, `IT_STAFF`, or `ADMIN`.

First-time users and users undergoing administrative password resets must complete a mandatory password change flow (`mustChangePassword = true`) before accessing standard application features.

IT Staff require a global ticket queue with search, filtering, assignment, status workflow transitions, IT priority overrides, and a dedicated internal notes thread hidden from Requesters.

Admins require user account management tools to create users with temporary passwords, edit roles and status, reset credentials, and maintain system integrity through automated safeguards (blocking self-deactivation and self-demotion).

---

## 3. Scope

### Included
- User authentication via `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, and `POST /api/auth/change-password`.
- JWT session management stored in secure HTTP-Only cookies (`toktickit_session`).
- Mandatory first-login password change workflow enforcing complexity rules.
- Migration from `RequesterUser` to a unified `User` model supporting `REQUESTER`, `IT_STAFF`, and `ADMIN` roles.
- IT Staff Ticket Queue (`GET /api/staff/tickets`) supporting text search, category/priority/status filters, sorting, and pagination.
- Ticket lifecycle actions for IT Staff: Claim ticket, Reassign ticket, Update status adhering to state machine matrix, Initialize and override IT Priority (`itPriority`).
- Tabbed communication threads: Public Comments (visible to Requester, Staff, Admin) vs. Internal Notes (visible ONLY to Staff and Admin).
- Admin User Management (`/api/admin/users`): User directory listing, user creation with temporary passwords, profile editing, active/inactive status toggling, and password reset.
- Responsive Zen Green UI design system (`#006B3C` primary color), accessible forms, and security dialogs.

### Excluded
- Third-party OAuth / SSO integration (e.g., Google, Microsoft).
- WebSockets or real-time streaming notifications (standard HTTP polling/refresh is used).
- Automated SMTP email sending or notifications engine.
- Automated SLA tracking or SLA escalation engine.

---

## 4. Functional Requirements

- **FR-01 (Auth Login)**: Users shall authenticate using email and password. Upon successful validation, the system issues an HTTP-Only session cookie and returns user profile details including role and `mustChangePassword` flag.
- **FR-02 (Auth Password Change)**: Authenticated users shall change their password by submitting their current password and a compliant new password. Upon success, `mustChangePassword` is set to `false`.
- **FR-03 (Auth Session & Logout)**: The system shall validate active session context via `GET /api/auth/me` and support explicit logout via `POST /api/auth/logout` which clears the session cookie.
- **FR-04 (Staff Queue Listing)**: Users with `IT_STAFF` or `ADMIN` roles shall view all tickets in the system with multi-column sorting, text search, filtering by category, requested priority, IT priority, status, and assigned staff, with paginated output.
- **FR-05 (Staff Claiming & Assignment)**: IT Staff and Admins shall self-claim unassigned tickets (`assignedToId = currentUserId`) or assign/reassign tickets to any active `IT_STAFF` or `ADMIN` user.
- **FR-06 (IT Priority Management)**: IT Staff and Admins shall initialize and update the internal `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). If not set, `itPriority` defaults to `requestedPriority`.
- **FR-07 (Status Workflow Enforcement)**: System shall enforce status transitions according to the status state machine matrix: `NEW` -> `OPEN` / `IN_PROGRESS` / `CLOSED`; `OPEN` / `IN_PROGRESS` -> `RESOLVED` / `CLOSED`; `RESOLVED` -> `CLOSED` / `OPEN`; `CLOSED` -> `OPEN`.
- **FR-08 (Public Comments Thread)**: Ticket owners (Requesters), IT Staff, and Admins shall view and post public comments on a ticket.
- **FR-09 (Internal Notes Thread)**: IT Staff and Admins shall view and post internal notes on a ticket. Requesters are strictly forbidden from viewing or creating internal notes.
- **FR-10 (Admin User Directory)**: Admin users shall view a directory of all system users with search, role filtering (`REQUESTER`, `IT_STAFF`, `ADMIN`), department filtering, and active status filtering.
- **FR-11 (Admin User Provisioning)**: Admin users shall create new user accounts with name, email, department, role, and temporary password. New accounts default to `mustChangePassword = true`.
- **FR-12 (Admin User Editing & Password Reset)**: Admin users shall update existing user profiles (name, department, role, active status) and perform administrative password resets with mandatory password change flag.

---

## 5. Mandatory Business Rules

- **BR-01 (Password Complexity)**: Passwords must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (`!@#$%^&*()_+-=[]{}|;:,.<>?`).
- **BR-02 (Mandatory First-Login Password Change)**: If `mustChangePassword` is `true`, all API endpoints except `POST /api/auth/change-password`, `POST /api/auth/logout`, and `GET /api/auth/me` MUST return `403 Forbidden` with error code `PASSWORD_CHANGE_REQUIRED`.
- **BR-03 (Session Context & Security)**: JWT tokens must be stored in HTTP-Only, SameSite=Lax session cookies (`toktickit_session`) with an 8-hour expiration.
- **BR-04 (Role Access Control Matrix)**:
  - `REQUESTER`: Limited to `/api/tickets` (owned tickets), `/api/tickets/:id/comments`, `/api/auth/*`.
  - `IT_STAFF`: Access to `/api/staff/*`, all ticket details, public comments, internal notes, `/api/auth/*`.
  - `ADMIN`: Full system access including `/api/admin/*`, `/api/staff/*`, all ticket operations, comments, notes, and user management.
- **BR-05 (IT Priority Initialization)**: When a ticket is created, `itPriority` defaults to `requestedPriority`. IT Staff may override `itPriority` independently without changing `requestedPriority`.
- **BR-06 (Status Transition State Machine Matrix)**:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `CLOSED`
  - `OPEN` -> `IN_PROGRESS`, `RESOLVED`, `CLOSED`
  - `IN_PROGRESS` -> `RESOLVED`, `CLOSED`
  - `RESOLVED` -> `CLOSED`, `OPEN` (reopened)
  - `CLOSED` -> `OPEN` (reopened by Staff/Admin only)
  - Attempting an invalid transition MUST return `400 Bad Request` with message `"Invalid status transition from {current} to {target}"`.
- **BR-07 (Public Comment Visibility)**: Public comments are accessible to the ticket owner (Requester), assigned IT Staff, and Admins.
- **BR-08 (Internal Note Confidentiality)**: Internal notes are strictly confidential to IT Staff and Admins. Any request from a `REQUESTER` role to `/api/tickets/:id/notes` (GET or POST) MUST return `403 Forbidden`.
- **BR-09 (Self-Deactivation Guard)**: An Admin user cannot deactivate their own account (`isActive = false`). Requests to deactivate self MUST return `400 Bad Request`.
- **BR-10 (Self-Role Downgrade Guard)**: An Admin user cannot change their own role from `ADMIN` to `IT_STAFF` or `REQUESTER`. Requests to demote self MUST return `400 Bad Request`.
- **BR-11 (Minimum Active Admin Guard)**: System operations must not result in 0 active `ADMIN` users in the database.
- **BR-12 (Password Hashing Standard)**: All passwords must be hashed using bcrypt (salt rounds = 10). Plaintext passwords must never be stored or exposed in logs or API responses.
- **BR-13 (Staff Assignment Eligibility)**: Tickets can only be assigned to users with role `IT_STAFF` or `ADMIN` where `isActive = true`. Assigning to inactive users or `REQUESTER` role returns `400 Bad Request`.
- **BR-14 (Requester Ticket Isolation)**: Requesters can only access tickets where `requesterId === currentUser.id`. Unauthorized access returns `403 Forbidden`.
- **BR-15 (User Deactivation Data Integrity)**: Deactivating a user (`isActive = false`) retains all past ticket ownership, assignments, comments, and internal notes created by that user.

---

## 6. Data Schema Changes

### Unified `User` Model (Replacing `RequesterUser`)
```prisma
enum Role {
  REQUESTER
  IT_STAFF
  ADMIN
}

model User {
  id                 Int      @id @default(autoincrement())
  name               String
  email              String   @unique
  passwordHash       String
  role               Role     @default(REQUESTER)
  department         String
  isActive           Boolean  @default(true)
  mustChangePassword Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  requestedTickets   Ticket[]       @relation("TicketRequester")
  assignedTickets    Ticket[]       @relation("TicketAssignee")
  comments           Comment[]
  internalNotes      InternalNote[]

  @@map("users")
}
```

### `Comment` Model
```prisma
model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  ticketId  Int
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())

  @@map("comments")
}
```

### `InternalNote` Model
```prisma
model InternalNote {
  id        Int      @id @default(autoincrement())
  content   String
  ticketId  Int
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())

  @@map("internal_notes")
}
```

### `Ticket` Model Modifications
```prisma
model Ticket {
  id                Int            @id @default(autoincrement())
  ticketNumber      String         @unique
  summary           String
  description       String
  requestedPriority TicketPriority
  itPriority        TicketPriority?
  currentStatus     TicketStatus   @default(NEW)
  
  requesterId       Int
  requesterUser     User           @relation("TicketRequester", fields: [requesterId], references: [id])
  
  assignedToId      Int?
  assignedTo        User?          @relation("TicketAssignee", fields: [assignedToId], references: [id])
  
  categoryId        Int
  category          Category       @relation(fields: [categoryId], references: [id])
  
  relatedSystemId   Int
  relatedSystem     RelatedSystem  @relation(fields: [relatedSystemId], references: [id])
  
  attachments       Attachment[]
  comments          Comment[]
  internalNotes     InternalNote[]

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@map("tickets")
}
```

---

## 7. Acceptance Criteria

- **AC-01**: Given valid credentials, when submitting login, then user receives HTTP 200, secure session cookie, and user DTO; given invalid credentials, then HTTP 401 is returned.
- **AC-02**: Given a user with `mustChangePassword = true`, when attempting to call any non-auth password change API endpoint, then HTTP 403 `PASSWORD_CHANGE_REQUIRED` is returned.
- **AC-03**: Given a user changing password, when submitting valid current and compliant new password, then password is updated in database, `mustChangePassword` becomes `false`, and HTTP 200 is returned.
- **AC-04**: Given an authenticated user, when logging out, then session cookie is cleared and HTTP 200 is returned.
- **AC-05**: Given an IT Staff or Admin user, when accessing `/api/staff/tickets`, then all system tickets are returned with search, category/priority/status filters, sorting, and pagination.
- **AC-06**: Given an unassigned ticket, when an IT Staff user claims it, then `assignedToId` is set to staff user ID, status changes from `NEW` to `OPEN`, and HTTP 200 is returned.
- **AC-07**: Given a ticket, when an IT Staff user assigns it to an active staff user, then `assignedToId` updates to target user ID and HTTP 200 is returned.
- **AC-08**: Given a ticket in `OPEN` status, when updating status to `RESOLVED`, then current status updates; when attempting an invalid status transition (e.g. `CLOSED` to `RESOLVED` directly), then HTTP 400 is returned.
- **AC-09**: Given a ticket, when IT Staff updates `itPriority`, then internal priority updates independently without mutating `requestedPriority`.
- **AC-10**: Given a ticket owner, assigned staff, or admin, when posting a public comment, then comment is added to thread and returned with author details.
- **AC-11**: Given an IT Staff or Admin user, when accessing or posting internal notes, then operations succeed; given a Requester role, then HTTP 403 Forbidden is returned.
- **AC-12**: Given an Admin user, when fetching `/api/admin/users`, then all users are returned with filtering by role, department, and active status.
- **AC-13**: Given an Admin user, when posting a new user with name, email, department, role, and temp password, then user is created with `mustChangePassword = true` and HTTP 201 is returned.
- **AC-14**: Given an Admin user, when editing another user's profile, then profile updates; when attempting to deactivate self or demote self from `ADMIN`, then HTTP 400 is returned.
- **AC-15**: Given an Admin user, when triggering password reset for a target user with a new temporary password, then password hash is updated, `mustChangePassword` is set to `true`, and HTTP 200 is returned.

---

## 8. Definition of Done
- Database schema updated via Prisma migrations with seed data containing default Admin (`admin@toktickit.com`), Staff (`staff@toktickit.com`), and Requester accounts.
- All backend REST API endpoints implemented with strict input validation, authorization middleware, and error handling.
- All React frontend components implemented using Zen Green design system tokens and tabbed interface patterns.
- 100% automated test suite pass rate across unit, component, and E2E tests covering AC-01 through AC-15.
