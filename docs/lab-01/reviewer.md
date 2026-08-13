# Peer Review Log (`docs/lab-01/reviewer.md`)

## 👤 Reviewer Details
* **Name:** Moe Thauk Ko
* **Student ID:** 67070503483
* **GitHub Username:** `@MoeThaukKo3483`

---

## 💬 Review Comments & Responses

### 📌 Issue #1: Express Server & Repository Setup

> **💬 Reviewer Comment:**  
> *"Server startup logic in `index.ts` looks clean."*  
> 
> **↩️ Author Reply:**  
> *"Thanks! Keeping `index.ts` simple makes it easier to test later."*

> **💬 Reviewer Comment:**  
> *"Verified that `.env` is listed in `.gitignore` so database connection strings won't accidentally be pushed to GitHub."*  
> 
> **↩️ Author Reply:**  
> *"Thanks! I checked `git status` to make sure `.env` won't be pushed."*

---

### 📌 Issue #2: Health Check API Endpoint

> **💬 Reviewer Comment:**  
> *"Health check returns HTTP 200 correctly with `{ status: 'ok', service: 'TokTickIT API' }` so it looks fine to me."*  
> 
> **↩️ Author Reply:**  
> *"I tested it in the browser and confirmed it returns 200 correctly."*

> **💬 Reviewer Comment:**  
> *"Good Supertest test case. It properly validates both the HTTP status code and the exact response body so it looks clean to me."*  
> 
> **↩️ Author Reply:**  
> *"Thanks! The backend test passed completely when I ran `npm test`."*

---

### 📌 Issue #3: Create & Seed IT Request Categories

> **💬 Reviewer Comment:**  
> *"Category model definition looks good. The `@unique` constraint on `name` is properly set so it looks good to me."*  
> 
> **↩️ Author Reply:**  
> *"Thanks! Updated the database and the table schema was created cleanly."*

---

### 📌 Issue #4: Service Desk UI Components

> **💬 Reviewer Comment:**  
> *"Bootstrap alert and list rendering look good. It handled dynamic array mapping properly so it looks perfect to me."*  
> 
> **↩️ Author Reply:**  
> *"Thanks! I tested the button in the browser and confirmed the category list renders cleanly."*