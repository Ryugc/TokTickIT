# Lab 4 Test Plan & Acceptance Traceability Matrix

## 1. Overview
This document outlines the testing strategy, acceptance criteria (AC-01 through AC-15), and test file mappings for Lab 4 features.

---

## 2. Acceptance Criteria & Traceability Matrix

| AC ID | Description | Primary Test File | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-01** | Database schema expands `TicketStatus` Enum to include `WAITING_FOR_REQUESTER`, `REOPENED`, and `CANCELLED`. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-02** | `ActionTaken` model added with UUID PK, cascade delete, and relations to `Ticket` and `User`. | `actions-taken.api.test.ts` | Prisma Model Integration |
| **AC-03** | Database seed script idempotently populates tickets across all 8 statuses with 0, 1, and multiple Actions Taken. | `actions-taken.api.test.ts` / Seed runner | Seed Execution Script |
| **AC-04** | `GET /api/tickets/:id/actions` returns all logged action items for Staff and Admins. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-05** | `GET /api/tickets/:id/actions` allows Requesters to view actions ONLY for owned tickets; returns `403` for non-owned. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-06** | `POST /api/tickets/:id/actions` allows Staff/Admins to create action entries with valid fields. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-07** | `POST /api/tickets/:id/actions` blocks Requester role attempts with `403 Forbidden`. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-08** | `POST /api/tickets/:id/actions` validates mandatory fields and requires `followUpNote` when `followUpRequired` is `true`. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-09** | `POST /api/tickets/:id/actions` automatically attributes `performedById` from the active user's session token. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-10** | `PATCH /api/actions/:id` allows Staff/Admins to update action fields with proper validation. | `actions-taken.api.test.ts` | Vitest API Integration |
| **AC-11** | `GET /api/dashboard/staff` accurately calculates `unassignedCount`, `myAssignedCount`, and status counters. | `staff-dashboard.api.test.ts` | Vitest API Integration |
| **AC-12** | `GET /api/dashboard/staff` blocks Requester role with `403 Forbidden`. | `staff-dashboard.api.test.ts` | Vitest API Integration |
| **AC-13** | `GET /api/dashboard/staff` returns top 5 recently updated tickets sorted by `updatedAt DESC`. | `staff-dashboard.api.test.ts` | Vitest API Integration |
| **AC-14** | `GET /api/dashboard/requester` calculates personal ticket counts (`openCount`, `inProgressCount`, `resolvedCount`, `closedCount`) isolated to active user. | `requester-dashboard.api.test.ts` | Vitest API Integration |
| **AC-15** | `GET /api/dashboard/requester` returns top 5 recently updated tickets owned by active user sorted by `updatedAt DESC`. | `requester-dashboard.api.test.ts` | Vitest API Integration |

---

## 3. Test Suites Structure

### 3.1 Backend Integration Test Files (`server/tests/lab-04/`)
- `actions-taken.api.test.ts`: Test action entry creation, reading, updating, field validation, and RBAC authorization.
- `staff-dashboard.api.test.ts`: Test staff operational metrics calculation, recent tickets ordering, and staff role restriction.
- `requester-dashboard.api.test.ts`: Test data isolation for personal metrics and recent tickets stream.
