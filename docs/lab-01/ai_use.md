Plan Lab 1 Implementation

Please help me set up the initial project scaffolding for "TokTickIT", a full-stack web application vertical slice.Requirements:1. Create a `docs/lab-01/ai_use.md` file with a structured template to log AI prompts, responses, and manual code adjustments.2. Initialize a standard client/server folder structure:- `/client`: React (Vite) application setup.- `/server`: Express.js server setup with Prisma ORM configured for PostgreSQL.3. Include basic configuration files (.gitignore, package.json scripts for running client and server, and Prisma schema placeholder).
My reflection: There were no issues.

---

### Entry #005
- **Date**: 2026-08-09
- **Task / Feature**: Issue 4 - Display IT Request Category list & Frontend System Check UI.
- **AI Tool**: Antigravity (Gemini 3.6 Flash)

#### 1. Prompt / Instruction
```text
Please implement Issue 4 (Display the IT request category list & Frontend System Check UI) according to Lab 1 specifications:

Backend Requirements:
1. Create a GET /api/categories Express route in server/src using Prisma to query all categories ordered predictably by ID or name.
2. The response must return HTTP 200 with JSON array containing objects with `id` and `name`:
   [
     { "id": 1, "name": "Account and Access" },
     { "id": 2, "name": "Hardware" },
     { "id": 3, "name": "Software" },
     { "id": 4, "name": "Network" }
   ]
3. Add a Supertest test in server/tests/lab-01/ verifying GET /api/categories returns HTTP 200 and the list of categories.

Frontend Requirements:
1. Create/update the React frontend component (client/src) using Bootstrap styling to display:
   - App title/heading: "TokTickIT IT Service Desk"
   - A button labeled "[Check System]"
   - When clicked, fetch backend health status (GET /api/health) and categories (GET /api/categories).
   - Display a loading state while fetching.
   - On success, display:
     - "System Status: Online"
     - "Supported Request Categories:" list (Account and Access, Hardware, Software, Network).
   - On failure (API or DB down), display:
     - "System Status: Offline"
     - A clear error message (e.g., "Unable to connect to TokTickIT API").
2. Add Vitest tests for the React UI verifying heading rendering, loading state, success state, and error handling.

Documentation:
1. Append Entry #005 to docs/lab-01/ai_use.md logging this prompt and interaction.
```

#### 2. AI Output Summary
- Added `GET /api/categories` route in `server/src/app.ts` querying Prisma categories ordered by `id` ascending.
- Created `server/tests/lab-01/categories.test.ts` with Supertest test verifying `GET /api/categories` returns HTTP 200 and category list.
- Updated `client/src/App.tsx` with Bootstrap styling, title heading "TokTickIT IT Service Desk", button "[Check System]", loading state ("Checking system status..."), online status ("System Status: Online" & categories list), and offline error state ("System Status: Offline" & error message).
- Added Bootstrap 5 CSS link to `client/index.html`.
- Created Vitest + React Testing Library test suite in `client/src/App.test.tsx`.
- Appended Entry #005 to `docs/lab-01/ai_use.md`.

#### 3. Manual Code Adjustments & Review
- **Code Changes**: Verified backend Prisma query order, frontend Bootstrap component classes, fetch error handling, and test mock implementations.
- **Errors/Issues Encountered**: None. All backend Supertest tests and frontend Vitest React tests passed cleanly.
- **Rationale**: Fulfills Issue 4 full-stack specifications with end-to-end testing coverage and user interface requirements.




Implement health Check:
Add GET /api/health to the existing Express backend. It must return HTTP status 200 with JSON payload {"status": "ok", "service": "TokTickIT API"}. Write automated backend tests using Vitest and Supertest in server/tests/lab-01/health.test.ts to verify the response format.

My reflection: tests passed on the first run.

Please implement Issue 3 (Create and seed IT request categories) 
1. Ensure Category model in server/prisma/schema.prisma has id, unique name, and createdAt.
2. Create a Prisma seed script (server/prisma/seed.ts) inserting the four categories: "Account and Access", "Hardware", "Software", "Network".
3. Ensure seed script uses upsert.
4. Update server/package.json with "prisma": { "seed": "tsx prisma/seed.ts" } and script "db:seed": "prisma db seed".


My reflection: There was an error on “process” needed to manually do a 
-npm i -D @types/node
 

Please implement Issue 4 - Display IT request category list & Frontend System Check UI according to Lab 1 specifications:
1. Create GET /api/categories Express route returning categories ordered by ID.
2. Add Supertest test in server/tests/lab-01/ verifying GET /api/categories returns HTTP 200 and category list.
3. Update React UI in client/src/App.tsx using Bootstrap with heading "TokTickIT IT Service Desk" and a "[Check System]" button.
4. When clicked, fetch GET /api/health and GET /api/categories displaying loading, "System Status: Online", and category list on success, or "System Status: Offline" on failure.
5. Add Vitest React testing library tests verifying UI states.

My Reflection: Issue 4 was implemented properly without any problems.
