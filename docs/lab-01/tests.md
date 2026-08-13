# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

| # | Tool | Test | Result |
| :-: | :--- | :--- | :-: |
| 1 | Supertest | GET /api/health returns 200, status=ok | passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | passed |
| 3 | Vitest | Heading renders | passed |
| 4 | Vitest | Success state shows Online + category list | passed |
| 5 | Vitest | Error state shows Offline + message | passed |

### Backend Test Output

```text
> toktickit-server@1.0.0 test
> vitest run

RUN  v2.1.9  /Users/DBsNICE/toktickit/server

  ✓ tests/lab-01/categories.test.ts (1) 887ms
  ✓ tests/lab-01/health.test.ts (1)

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  17:26:15
   Duration  2.24s (transform 125ms, setup 0ms, collect 1.16s, tests 1.14s, environment 1ms, prepare 292ms)