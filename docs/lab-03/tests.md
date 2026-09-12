# Lab 3 Test Plan & Traceability Matrix

This document outlines the test strategy, test suites, and 1-to-1 traceability matrix mapping Acceptance Criteria AC-01 through AC-15 directly to planned test files.

---

## 1. Test Strategy Overview

The testing architecture for Lab 3 consists of three complementary testing layers:

1. **Server Unit & Integration Tests (Vitest / Supertest)**:
   - Target Directory: `server/tests/lab-03/`
   - Validates authentication middleware, JWT cookie issuance, password complexity rules, status state machine transitions, RBAC enforcement, public comments vs. internal notes API authorization, and admin user management safeguards.

2. **Client Component Tests (React Testing Library / Vitest)**:
   - Target Directory: `client/src/lab-03-tests/`
   - Validates UI components, Login form state, mandatory password change checklist rendering, Staff Queue table filtering/sorting, tabbed comment/note interface role hiding, and Admin user modals/safety dialogs.

3. **End-to-End E2E Tests (Playwright)**:
   - Target Directory: `e2e/lab-03/`
   - Validates full user flows across browser sessions: login, mandatory first-login password change flow, IT Staff claiming/assigning/workflow execution, public comment vs. internal note visibility across Requester vs. Staff sessions, and Admin user provisioning/editing.

---

## 2. AC Traceability Matrix

| AC ID | Acceptance Criteria Summary | Server Test File | Client Test File | E2E Test File |
| :--- | :--- | :--- | :--- | :--- |
| **AC-01** | User authentication returns valid JWT cookie and user DTO for correct credentials; 401 for invalid credentials. | `server/tests/lab-03/auth.test.ts` | `client/src/lab-03-tests/Login.test.tsx` | `e2e/lab-03/auth-password-flow.spec.ts` |
| **AC-02** | Mandatory password change flag (`mustChangePassword = true`) blocks access to non-auth endpoints with 403. | `server/tests/lab-03/auth.test.ts` | `client/src/lab-03-tests/Login.test.tsx` | `e2e/lab-03/auth-password-flow.spec.ts` |
| **AC-03** | Password change updates password hash, sets `mustChangePassword = false`, and unlocks application access. | `server/tests/lab-03/auth.test.ts` | `client/src/lab-03-tests/Login.test.tsx` | `e2e/lab-03/auth-password-flow.spec.ts` |
| **AC-04** | Logout invalidates session, clears HTTP-Only session cookie, and redirects user to login. | `server/tests/lab-03/auth.test.ts` | `client/src/lab-03-tests/Login.test.tsx` | `e2e/lab-03/auth-password-flow.spec.ts` |
| **AC-05** | Staff Queue returns all tickets with search, category, priority, status filters, sorting, and pagination. | `server/tests/lab-03/staff-queue.test.ts` | `client/src/lab-03-tests/StaffQueue.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-06** | IT Staff can claim unassigned ticket (`assignedToId = currentUserId`), auto-updating `NEW` to `OPEN`. | `server/tests/lab-03/staff-queue.test.ts` | `client/src/lab-03-tests/StaffQueue.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-07** | IT Staff can assign/reassign ticket to any active IT Staff or Admin user. | `server/tests/lab-03/staff-queue.test.ts` | `client/src/lab-03-tests/StaffQueue.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-08** | Ticket status updates follow state machine matrix; invalid transitions return 400 Bad Request. | `server/tests/lab-03/staff-queue.test.ts` | `client/src/lab-03-tests/StaffQueue.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-09** | Staff can initialize and update `itPriority` independently of `requestedPriority`. | `server/tests/lab-03/staff-queue.test.ts` | `client/src/lab-03-tests/StaffQueue.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-10** | Requesters, Staff, and Admins can post and view Public Comments on authorized tickets. | `server/tests/lab-03/comments-notes.test.ts` | `client/src/lab-03-tests/TicketDetailTabs.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-11** | Staff and Admins can view/post Internal Notes; Requesters receive 403 Forbidden. | `server/tests/lab-03/comments-notes.test.ts` | `client/src/lab-03-tests/TicketDetailTabs.test.tsx` | `e2e/lab-03/staff-workflow.spec.ts` |
| **AC-12** | Admin user directory displays all users with role, department, and active status filters. | `server/tests/lab-03/admin-users.test.ts` | `client/src/lab-03-tests/AdminUserMgmt.test.tsx` | `e2e/lab-03/admin-user-mgmt.spec.ts` |
| **AC-13** | Admin can create new user with temporary password and default `mustChangePassword = true`. | `server/tests/lab-03/admin-users.test.ts` | `client/src/lab-03-tests/AdminUserMgmt.test.tsx` | `e2e/lab-03/admin-user-mgmt.spec.ts` |
| **AC-14** | Admin can update user profile; self-deactivation and self-role demotion return 400 Bad Request. | `server/tests/lab-03/admin-users.test.ts` | `client/src/lab-03-tests/AdminUserMgmt.test.tsx` | `e2e/lab-03/admin-user-mgmt.spec.ts` |
| **AC-15** | Admin can trigger password reset for a user, setting new temp password and `mustChangePassword = true`. | `server/tests/lab-03/admin-users.test.ts` | `client/src/lab-03-tests/AdminUserMgmt.test.tsx` | `e2e/lab-03/admin-user-mgmt.spec.ts` |

---

## 3. Test Suite Breakdown

### Server Test Suites (`server/tests/lab-03/`)
- `auth.test.ts`: Login validation, password complexity regex enforcement, JWT cookie header verification, mandatory password change middleware rejection.
- `staff-queue.test.ts`: Queue query builder, status transition matrix validator, ticket assignment constraints, priority mutation.
- `comments-notes.test.ts`: Public comment creation, ticket ownership checks, internal note RBAC middleware guards (blocking Requester role).
- `admin-users.test.ts`: User provisioning, duplicate email handling, self-deactivation error assertions, self-demotion error assertions.

### Client Component Test Suites (`client/src/lab-03-tests/`)
- `Login.test.tsx`: Form rendering, invalid credential error state, mandatory password change checklist reactive rendering.
- `StaffQueue.test.tsx`: Queue table rendering, filter selection handlers, claim ticket button handler, priority badge colors.
- `TicketDetailTabs.test.tsx`: Tab switching, Public Comments vs Internal Notes rendering, hiding Internal Notes tab when user role is `REQUESTER`.
- `AdminUserMgmt.test.tsx`: Directory filtering, user modal submission, alert dialog triggering on self-deactivation attempt.

### E2E Test Suites (`e2e/lab-03/`)
- `auth-password-flow.spec.ts`: Full browser test logging in with temporary password, completing mandatory password change, verifying cookie and redirect.
- `staff-workflow.spec.ts`: Staff user logging in, browsing queue, claiming ticket, updating status to `IN_PROGRESS`, adding internal note, verifying requester sees public comment but not internal note.
- `admin-user-mgmt.spec.ts`: Admin logging in, creating new user, attempting self-deactivation (verifying block message), resetting user password.
