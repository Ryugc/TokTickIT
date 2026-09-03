# TokTickIT 🎫

An IT Service Desk platform built for Software Engineering Lab 2, featuring simulated requester session identity management, ticket creation, attachment validation, and data isolation.

---

## 📚 Lab 02 Documentation Links

- [Specification & Business Rules](docs/lab-02/specification.md)
- [API Specification & Endpoints](docs/lab-02/api-spec.md)
- [Test Strategy & Traceability Matrix](docs/lab-02/tests.md)
- [UI Specification & Design Tokens](docs/lab-02/ui-spec.md)
- [AI Usage Log](docs/lab-02/ai-use.md)
- [Peer Reviewer Log](docs/lab-02/reviewer.md)

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite, TypeScript, Zen Green Theme (`#006B3C`)
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **Testing:** React Testing Library, Supertest, Playwright (E2E)
- **AI Integration:** Vercel AI SDK

---

## 🚀 How to Run

### 1. Database Setup
Ensure PostgreSQL is running and set up your `.env` file in `/server`:

```bash
cd server
npm install
npx prisma migrate dev
npx prisma db seed
