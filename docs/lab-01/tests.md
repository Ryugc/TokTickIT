# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/src/App.test.tsx`.

| # | Tool | Test | Result |
| :-: | :--- | :--- | :-: |
| 1 | Supertest | GET /api/health returns 200, status=ok | passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | passed |
| 3 | Vitest | Heading renders app title and check system button | passed |
| 4 | Vitest | Displays loading state during system check | passed |
| 5 | Vitest | Displays success state with categories on successful API response | passed |
| 6 | Vitest | Displays offline status and error message on fetch failure | passed |

---

### Backend Test Output:

```text
> toktickit-server@0.1.0 test
> vitest run

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

RUN  v4.1.10 C:/project/toktickit/server

✓ tests/lab-01/categories.test.ts (1 test) 21ms
✓ tests/lab-01/health.test.ts (1 test) 21ms

Test Files  2 passed (2)
     Tests  2 passed (2)
  Start at  11:14:21
  Duration  2.49s (transform 134ms, setup 0ms, import 3.21s, tests 42ms, environment 0ms)
```

---

### Frontend Test Output:

```text
> toktickit-client@0.1.0 test
> vitest run

11:22:14 [vite] warning: `esbuild` option was specified by "vite:react-babel" plugin. This option is deprecated, please use `oxc` instead.
11:22:14 [vite] warning: `optimizeDeps.esbuildOptions` option was specified by "vite:react-babel" plugin. This option is deprecated, please use `optimizeDeps.rolldownOptions` instead.
Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored. The following build options were set: `{ jsx: 'automatic', jsxImportSource: undefined }`

RUN  v4.1.10 C:/project/toktickit/client

✓ src/App.test.tsx (4 tests) 160ms
  ✓ TokTickIT IT Service Desk Component (4)
    ✓ renders app title heading and check system button 98ms
    ✓ displays loading state during system check 15ms
    ✓ displays success state with categories on successful API response 32ms
    ✓ displays offline status and error message on fetch failure 13ms

Test Files  1 passed (1)
     Tests  4 passed (4)
  Start at  11:22:14
  Duration  42.73s (transform 126ms, setup 6.55s, import 727ms, tests 160ms, environment 34.80s)
```