# Lab 2 REST API Specification

## Base URL
`/api`

---

## 1. Reference Data Endpoints

### GET /api/requesters
- **Description:** Retrieves all active Development Requesters for session selection.
- **Response (200 OK):**
  Array of objects with `id`, `name`, `email`, `department`, `isActive`.

### GET /api/categories
- **Description:** Retrieves active ticket categories ordered by ID.
- **Response (200 OK):**
  Array of objects with `id`, `name`.

### GET /api/related-systems
- **Description:** Retrieves all active related IT systems.
- **Response (200 OK):**
  Array of objects with `id`, `name`.

---

## 2. Ticket Endpoints

### POST /api/tickets
- **Description:** Creates a new support ticket for the active requester.
- **Headers:** `X-Requester-Id: <number>`
- **Request Payload Fields:** `summary`, `description`, `categoryId`, `relatedSystemId`, `requestedPriority`.
- **Response (201 Created):** Returns created ticket object with generated `ticketNumber`, `currentStatus` (default: "NEW"), and timestamps.
- **Errors:**
  - `400 Bad Request`: Validation failure or missing `X-Requester-Id` header.

### GET /api/tickets
- **Description:** Retrieves paginated tickets belonging solely to the active requester.
- **Headers:** `X-Requester-Id: <number>`
- **Query Parameters:** `search`, `categoryId`, `requestedPriority`, `currentStatus`, `sortBy`, `sortOrder`, `page`, `limit`.
- **Response (200 OK):** Returns `data` array and `pagination` object (`total`, `page`, `limit`, `totalPages`).

### GET /api/tickets/:id
- **Description:** Retrieves full ticket detail for an owned ticket.
- **Headers:** `X-Requester-Id: <number>`
- **Response (200 OK):** Returns full ticket metadata and array of active attachments.
- **Errors:**
  - `403 Forbidden`: Attempting to access a ticket owned by another Requester.
  - `404 Not Found`: Ticket ID does not exist.

---

## 3. Attachment Endpoints

### POST /api/tickets/:id/attachments
- **Description:** Uploads a supporting file to an owned ticket.
- **Headers:** `X-Requester-Id: <number>`, `Content-Type: multipart/form-data`
- **Form Field:** `file` (JPG, PNG, WEBP, PDF <= 5 MB)
- **Response (201 Created):** Returns uploaded attachment metadata.
- **Errors:**
  - `400 Bad Request`: File type not permitted, size > 5 MB, or active limit (5) reached.
  - `403 Forbidden`: Ticket not owned by current requester.

### DELETE /api/attachments/:id
- **Description:** Performs soft-removal of an attachment.
- **Headers:** `X-Requester-Id: <number>`
- **Request Body:** `{ "removalReason": "<string>" }`
- **Response (200 OK):** Returns attachment metadata with `isRemoved: true`.

### GET /api/attachments/:id/download
- **Description:** Downloads active attachment file bytes.
- **Response (200 OK):** Binary file stream.
- **Errors:**
  - `403 Forbidden`: Not owner of the ticket.
  - `410 Gone`: Attachment has been soft-removed.