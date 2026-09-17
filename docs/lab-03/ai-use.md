# Lab 3 AI Usage Log & Reflection

**Repository:** [Ryugc/TokTickIT](https://github.com/Ryugc/TokTickIT)  
**Primary AI Collaborator:** Gemini 1.5 Pro / Claude 3.5 Sonnet  
**Target Increment:** Lab 3 (Sprint 3 Integration & RBAC Infrastructure)

---

## Key AI Prompts Log

| # | Development Phase | Target Area | Key AI Prompt | AI Output & Utilization |
|---|---|---|---|---|
| **1** | Specification | Contract & Schema | "Help draft a unified User model in Prisma replacing RequesterUser, supporting roles (REQUESTER, IT_STAFF, ADMIN) and fields for mandatory password change and account activity." | Generated Prisma schema with relational links to tickets, comments, and internal notes. |
| **2** | Auth & Security | Middleware & Bcrypt | "Write Express authentication middleware enforcing JWT HttpOnly cookies, session check via /api/auth/me, and blocking endpoints with 403 PASSWORD_CHANGE_REQUIRED if mustChangePassword is true." | Provided `authMiddleware` and `requirePasswordChangeCheck` middleware logic. |
| **3** | Business Logic | State Machine | "Create a TypeScript function that validates status transitions based on a state matrix (NEW -> OPEN/IN_PROGRESS/CLOSED, RESOLVED -> CLOSED/OPEN, etc.) returning 400 for illegal jumps." | Produced status transition validator utilized across staff ticket operations endpoints. |
| **4** | IT Staff Queue | Search & Filters | "Write Express backend query handlers for /api/staff/tickets supporting pagination, text search on summary, and multi-field filtering (category, priority, status, assigned staff)." | Generated Prisma query filters with RBAC guards restricting endpoint access to IT_STAFF and ADMIN. |
| **5** | Admin Management | Safety Guards | "Draft validation guards for admin user editing to prevent self-deactivation, self-demotion from ADMIN, and keeping at least 1 active admin in the database." | Provided safety checks returning HTTP 400 when an admin attempts self-demotion or self-deactivation. |
| **6** | UI & Components | Zen Green Frontend | "Create a React tabbed interface for ticket details separating Public Comments from Staff-Only Internal Notes, adhering to Zen Green `#006B3C` theme tokens." | Generated accessible React component rendering amber warning callouts for confidential internal notes. |
| **7** | Testing & Traceability| Vitest & E2E | "Draft integration test cases in Supertest and Playwright E2E covering acceptance criteria AC-01 through AC-15, including authorization failure tests." | Produced test scaffolding mapped directly to the traceability matrix in `docs/lab-03/tests.md`. |
| **8** | Git & Workflow | Repository Sync | "Resolve Git rejected push errors during branch merge when main is ahead of lab3-staging without losing feature commit history." | Provided step-by-step commands to pull, merge feature branches with `--no-ff`, and sync staging with main. |

---

## My Reflection

### Specification-Agent Reflection
Using an AI agent during the specification phase significantly accelerated the definition of business rules and edge-case detection. The agent was particularly effective at formulating complete acceptance criteria (AC-01-AC-15). It caught potential issues early, such as enforcing the zero-admin state guard and preventing infinite redirect loops during mandatory first-login password changes.

### Coding-Agent Reflection
As a coding assistant, the AI excelled at generating boilerplate Prisma schema relations, Express route handlers, and React component UI structures. However, human oversight remained essential for verifying security contexts—such as ensuring HTTP-Only cookie flags were set correctly, confirming internal notes were completely stripped from `REQUESTER` API responses, and managing non-fast-forward Git branch merges without clobbering feature histories.
