# Lab 3 API Contract Specification

This document details the RESTful API endpoints for authentication, IT Staff ticket management, public comments, internal notes, and Admin user administration.

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a user using email and password credentials. Sets an HTTP-Only session cookie (`toktickit_session`) on success.

- **Access Level**: Public
- **Request Body**:
  ```json
  {
    "email": "staff@toktickit.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 2,
      "name": "Jane Staff",
      "email": "staff@toktickit.com",
      "role": "IT_STAFF",
      "department": "IT Support",
      "isActive": true,
      "mustChangePassword": false
    }
  }
  ```
- **Response (401 Unauthorized)**:
  ```json
  {
    "error": "UNAUTHORIZED",
    "message": "Invalid email or password credentials."
  }
  ```

---

### `POST /api/auth/logout`
Invalidates the current session and clears the `toktickit_session` HTTP-Only cookie.

- **Access Level**: Authenticated User
- **Request Body**: None
- **Response (200 OK)**:
  ```json
  {
    "message": "Successfully logged out."
  }
  ```

---

### `GET /api/auth/me`
Retrieves the currently authenticated user's context from the JWT session cookie.

- **Access Level**: Authenticated User
- **Request Body**: None
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 2,
      "name": "Jane Staff",
      "email": "staff@toktickit.com",
      "role": "IT_STAFF",
      "department": "IT Support",
      "isActive": true,
      "mustChangePassword": false
    }
  }
  ```
- **Response (401 Unauthorized)**:
  ```json
  {
    "error": "UNAUTHORIZED",
    "message": "No active authentication session."
  }
  ```

---

### `POST /api/auth/change-password`
Updates the authenticated user's password. Clears `mustChangePassword` flag upon success.

- **Access Level**: Authenticated User (Required for `mustChangePassword = true`)
- **Request Body**:
  ```json
  {
    "currentPassword": "TempPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password changed successfully.",
    "user": {
      "id": 2,
      "email": "staff@toktickit.com",
      "mustChangePassword": false
    }
  }
  ```
- **Response (400 Bad Request)**:
  ```json
  {
    "error": "INVALID_PASSWORD",
    "message": "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
  }
  ```

---

## 2. IT Staff Queue Endpoints

### `GET /api/staff/tickets`
Retrieves all system tickets with filtering, searching, sorting, and pagination.

- **Access Level**: `IT_STAFF`, `ADMIN`
- **Query Parameters**:
  - `search` (optional string): Case-insensitive search on ticket number or summary.
  - `category` (optional string): Category name or ID filter.
  - `requestedPriority` (optional enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `itPriority` (optional enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `status` (optional enum: `NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)
  - `assignedTo` (optional string: `"unassigned"`, or staff user ID)
  - `sortBy` (optional string: `"createdAt"`, `"updatedAt"`, `"requestedPriority"`, `"itPriority"`, default `"createdAt"`)
  - `sortOrder` (optional string: `"asc"`, `"desc"`, default `"desc"`)
  - `page` (optional integer, default `1`)
  - `limit` (optional integer, default `10`)

- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "VPN connection failing intermittently",
        "description": "Unable to connect to internal network via VPN.",
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "currentStatus": "OPEN",
        "requester": {
          "id": 5,
          "name": "Alice Requester",
          "email": "alice@company.com",
          "department": "Sales"
        },
        "assignedTo": {
          "id": 2,
          "name": "Jane Staff",
          "email": "staff@toktickit.com"
        },
        "category": { "id": 1, "name": "Network" },
        "relatedSystem": { "id": 3, "name": "Corporate VPN" },
        "createdAt": "2026-09-12T10:00:00.000Z",
        "updatedAt": "2026-09-12T10:30:00.000Z"
      }
    ],
    "pagination": {
      "totalItems": 42,
      "totalPages": 5,
      "currentPage": 1,
      "limit": 10
    }
  }
  ```
- **Response (403 Forbidden)**:
  ```json
  {
    "error": "FORBIDDEN",
    "message": "Only IT Staff and Admins may access the global staff queue."
  }
  ```

---

## 3. IT Staff Ticket Detail & Workflow Endpoints

### `GET /api/staff/tickets/:id`
Retrieves detailed information for a single ticket including metadata, requester details, assignee, attachments, comments count, and internal notes count.

- **Access Level**: `IT_STAFF`, `ADMIN`
- **Path Parameter**: `id` (integer ticket ID)
- **Response (200 OK)**:
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000101",
    "summary": "VPN connection failing intermittently",
    "description": "Unable to connect to internal network via VPN.",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "currentStatus": "OPEN",
    "requester": {
      "id": 5,
      "name": "Alice Requester",
      "email": "alice@company.com",
      "department": "Sales"
    },
    "assignedTo": {
      "id": 2,
      "name": "Jane Staff",
      "email": "staff@toktickit.com"
    },
    "category": { "id": 1, "name": "Network" },
    "relatedSystem": { "id": 3, "name": "Corporate VPN" },
    "attachments": [],
    "createdAt": "2026-09-12T10:00:00.000Z",
    "updatedAt": "2026-09-12T10:30:00.000Z"
  }
  ```

---

### `PATCH /api/staff/tickets/:id/claim`
Assigns the ticket to the currently authenticated staff member (`assignedToId = currentUserId`). If the ticket status is `NEW`, it automatically transitions to `OPEN`.

- **Access Level**: `IT_STAFF`, `ADMIN`
- **Response (200 OK)**:
  ```json
  {
    "id": 101,
    "assignedToId": 2,
    "currentStatus": "OPEN",
    "updatedAt": "2026-09-12T11:00:00.000Z"
  }
  ```

---

### `PATCH /api/staff/tickets/:id/assign`
Assigns or reassigns the ticket to a specified active IT Staff or Admin user.

- **Access Level**: `IT_STAFF`, `ADMIN`
- **Request Body**:
  ```json
  {
    "assignedToId": 3
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": 101,
    "assignedToId": 3,
    "updatedAt": "2026-09-12T11:15:00.000Z"
  }
  ```
- **Response (400 Bad Request)**:
  ```json
  {
    "error": "INVALID_ASSIGNEE",
    "message": "Target assignee must be an active IT Staff or Admin user."
  }
  ```

---

### `PATCH /api/staff/tickets/:id/workflow`
Updates the ticket's `currentStatus` and/or `itPriority`. Enforces the BR-06 status state machine transition matrix.

- **Access Level**: `IT_STAFF`, `ADMIN`
- **Request Body**:
  ```json
  {
    "status": "IN_PROGRESS",
    "itPriority": "URGENT"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": 101,
    "currentStatus": "IN_PROGRESS",
    "itPriority": "URGENT",
    "updatedAt": "2026-09-12T11:30:00.000Z"
  }
  ```
- **Response (400 Bad Request)**:
  ```json
  {
    "error": "INVALID_STATUS_TRANSITION",
    "message": "Invalid status transition from CLOSED to IN_PROGRESS."
  }
  ```

---

## 4. Public Comments & Internal Notes Endpoints

### `GET /api/tickets/:id/comments`
Retrieves public comments for a ticket.

- **Access Level**: Ticket Owner (`REQUESTER`), `IT_STAFF`, `ADMIN`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "content": "Please check if your network cable is plugged in.",
      "createdAt": "2026-09-12T10:15:00.000Z",
      "author": {
        "id": 2,
        "name": "Jane Staff",
        "role": "IT_STAFF"
      }
    }
  ]
  ```

### `POST /api/tickets/:id/comments`
Posts a new public comment.

- **Access Level**: Ticket Owner (`REQUESTER`), `IT_STAFF`, `ADMIN`
- **Request Body**:
  ```json
  {
    "content": "Cable is plugged in, lights are flashing."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 2,
    "content": "Cable is plugged in, lights are flashing.",
    "ticketId": 101,
    "createdAt": "2026-09-12T10:20:00.000Z",
    "author": {
      "id": 5,
      "name": "Alice Requester",
      "role": "REQUESTER"
    }
  }
  ```

---

### `GET /api/tickets/:id/notes`
Retrieves confidential internal notes for a ticket.

- **Access Level**: `IT_STAFF`, `ADMIN` strictly (`REQUESTER` blocked with 403)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "content": "User VPN profile is corrupted in Active Directory.",
      "createdAt": "2026-09-12T10:25:00.000Z",
      "author": {
        "id": 2,
        "name": "Jane Staff",
        "role": "IT_STAFF"
      }
    }
  ]
  ```
- **Response (403 Forbidden)**:
  ```json
  {
    "error": "FORBIDDEN",
    "message": "Internal notes are confidential to IT Staff and Admins."
  }
  ```

### `POST /api/tickets/:id/notes`
Posts a new confidential internal note.

- **Access Level**: `IT_STAFF`, `ADMIN` strictly (`REQUESTER` blocked with 403)
- **Request Body**:
  ```json
  {
    "content": "Reset RADIUS secret on VPN server gateway."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 2,
    "content": "Reset RADIUS secret on VPN server gateway.",
    "ticketId": 101,
    "createdAt": "2026-09-12T10:30:00.000Z",
    "author": {
      "id": 2,
      "name": "Jane Staff",
      "role": "IT_STAFF"
    }
  }
  ```

---

## 5. Admin User Management Endpoints

### `GET /api/admin/users`
Retrieves system user directory with search, role, department, and active status filtering.

- **Access Level**: `ADMIN`
- **Query Parameters**: `search`, `role`, `department`, `isActive`, `page`, `limit`
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Super Admin",
        "email": "admin@toktickit.com",
        "role": "ADMIN",
        "department": "IT Operations",
        "isActive": true,
        "mustChangePassword": false,
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalItems": 15,
      "totalPages": 2,
      "currentPage": 1,
      "limit": 10
    }
  }
  ```

---

### `POST /api/admin/users`
Creates a new user account with temporary password. Sets `mustChangePassword = true`.

- **Access Level**: `ADMIN`
- **Request Body**:
  ```json
  {
    "name": "Bob Tech",
    "email": "bob@toktickit.com",
    "department": "Infrastructure",
    "role": "IT_STAFF",
    "tempPassword": "TempPassword123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user": {
      "id": 10,
      "name": "Bob Tech",
      "email": "bob@toktickit.com",
      "department": "Infrastructure",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": true,
      "createdAt": "2026-09-12T12:00:00.000Z"
    }
  }
  ```

---

### `PATCH /api/admin/users/:id`
Updates an existing user's name, department, role, or active status.

- **Access Level**: `ADMIN`
- **Request Body**:
  ```json
  {
    "name": "Bob Tech Senior",
    "department": "Lead IT",
    "role": "IT_STAFF",
    "isActive": true
  }
  ```
- **Response (200 OK)**: User profile DTO.
- **Response (400 Bad Request)**:
  - If self-deactivating: `"An Admin cannot deactivate their own account."`
  - If self-demoting: `"An Admin cannot remove their own ADMIN role."`

---

### `POST /api/admin/users/:id/reset-password`
Resets a user's password with a new temporary password and sets `mustChangePassword = true`.

- **Access Level**: `ADMIN`
- **Request Body**:
  ```json
  {
    "tempPassword": "NewTempPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset successfully. Mandatory password change flag set."
  }
  ```
