# Lab 4 AI Usage Log & Reflection

**Repository:** [Ryugc/TokTickIT](https://github.com/Ryugc/TokTickIT)  
**Primary AI Collaborator:** Antigravity (Google DeepMind) / Gemini 3.6 Flash  
**Target Increment:** Lab 4 (Actions Taken Audit Logging & Metrics Dashboards)

---

## Key AI Prompts Log

| # | Development Phase | Target Area | Key AI Prompt | AI Output & Utilization |
|---|---|---|---|---|
| **1** | Scaffolding | Documentation | "Generate specification, API contract, UI spec, test matrix, and reviewer placeholders for Lab 4 covering Actions Taken and Dashboard metrics." | Created all 6 Markdown documentation files in `docs/lab-04/` following project standards. |
| **2** | Database Schema | Prisma Migration | "Expand TicketStatus enum with WAITING_FOR_REQUESTER, REOPENED, and CANCELLED. Add ActionTaken model with UUID PK, ticketId, performedById, description, result, followUp fields." | Updated `schema.prisma` with `ActionTaken` model and expanded `TicketStatus` enum. |
| **3** | Seed Data | Database Seeding | "Update prisma/seed.ts to idempotently seed tickets across all 8 statuses with 0, 1, and multiple Actions Taken records." | Refactored `seed.ts` to idempotently upsert tickets and actions taken across all 8 status states. |
| **4** | REST API | Actions Taken Endpoints | "Create Express routes for GET /api/tickets/:id/actions, POST /api/tickets/:id/actions, and PATCH /api/actions/:id with session attribution and follow-up note validation." | Implemented REST routes with role checks (Staff/Admin for create/edit) and validation logic. |
| **5** | REST API | Dashboard Metrics | "Create GET /api/dashboard/staff and GET /api/dashboard/requester endpoints returning operational metrics and top 5 recent tickets." | Implemented aggregation queries returning unassigned, assigned, and status counts along with recent activity streams. |
| **6** | Integration Testing | Vitest Integration | "Draft Vitest integration tests in actions-taken.api.test.ts, staff-dashboard.api.test.ts, and requester-dashboard.api.test.ts testing RBAC, validation, and metrics calculation." | Created clean Vitest integration test suites validating all AC-01 through AC-15 requirements. |

---

## Reflection

### Specification-Agent Reflection
Using an AI assistant during the specification phase ensured complete alignment across state machine rules, API parameter contracts, and acceptance criteria. The assistant identified edge cases such as validating `followUpNote` when `followUpRequired` is `true` and enforcing session-based `performedById` attribution.

### Coding-Agent Reflection
The AI assistant rapidly generated boilerplate Prisma schema additions, Express controllers, and test cases. Human oversight ensured foreign key data types matched existing primary keys (`Int` for `ticketId` and `performedById`), verified data isolation for requesters on metrics endpoints, and ensured backward compatibility with existing Labs 1-3 test suites.
