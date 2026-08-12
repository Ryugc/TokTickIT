Plan Lab 1 Implementation

Please help me set up the initial project scaffolding for "TokTickIT", a full-stack web application vertical slice.Requirements:1. Create a `docs/lab-01/ai_use.md` file with a structured template to log AI prompts, responses, and manual code adjustments.2. Initialize a standard client/server folder structure:- `/client`: React (Vite) application setup.- `/server`: Express.js server setup with Prisma ORM configured for PostgreSQL.3. Include basic configuration files (.gitignore, package.json scripts for running client and server, and Prisma schema placeholder).
My reflection: There were no issues.



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
