# Lab 2 — AI Use and Reflection

**Agent / Tool Used:** GCP Antigravity Coding Agent  
**LLM Used:** Gemini 3.5 Flash

---

## 📋 Selected Key Prompts & Task Logs

| # | Task / Issue | Prompt Summary | Result & Reflection |
| :-: | :--- | :--- | :--- |
| **1** | **Lab 2 Setup & Specifications** | Prompted agent to read lab guidelines and assist in drafting `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` templates. | **Success:** Established complete engineering contract and test traceability matrix prior to coding. |
| **2** | **Issue 2: Dev Requester Context** | Asked agent to implement `RequesterUser` schema, seed 4 active and 1 inactive requesters, create `GET /api/requesters` endpoint, build the UI selector modal with context state, and write automated tests. | **Success:** Generated Prisma models, seed data, API routes, and React context modal cleanly. All backend and UI component tests passed. |

---

## 📝 Detailed Prompt Logs

### Prompt #2: Issue 2 — Development Requester Context & Identity Selector
> **Prompt:**  
> *"Please implement Issue #2: Development Requester Context & Identity Selector according to docs/lab-02/specification.md, api-spec.md, and ui-spec.md..."*
>
> **Reflection:**  
> The agent generated the Prisma schema, database seed script, Express route, and React selector component in one pass. Having the specification and API contract clearly defined beforehand prevented the agent from inventing unnecessary authentication fields like passwords or JWT tokens.