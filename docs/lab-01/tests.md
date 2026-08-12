# Lab 1 Test Inventory (`docs/lab-01/tests.md`)

| **API-01** | Supertest | Health endpoint (`GET /api/health`) returns status 200 and expected JSON payload `{ "status": "ok", "service": "TokTickIT API" }`. | `server/tests/lab-01/health.test.ts` |
| **API-02** | Supertest | Categories endpoint (`GET /api/categories`) returns status 200 and the 4 seeded categories in predictable order. | `server/tests/lab-01/categories.test.ts` |
| **UI-01** | Vitest | Renders the main app heading ("TokTickIT IT Service Desk") and the "[Check System]" button. | `client/src/App.test.tsx` |
| **UI-02** | Vitest | Displays loading state during fetch, then updates to show "System Status: Online" and the category list on success. | `client/src/App.test.tsx` |
| **UI-03** | Vitest | Displays "System Status: Offline" and a helpful error message when the API fetch fails. | `client/src/App.test.tsx` |