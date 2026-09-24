# Lab 4 API Specification: Actions Taken & Metrics Dashboards

## Overview
This document defines REST API request and response payload contracts for Actions Taken audit logging and role-based metrics dashboards.

---

## 1. Actions Taken Endpoints

### 1.1 GET `/api/tickets/:id/actions`
Retrieves all Actions Taken logged for a specific ticket.

- **Authentication**: Required (`toktickit_session` cookie or Bearer header).
- **Authorization**:
  - `IT_STAFF` & `ADMIN`: Can access any ticket's actions.
  - `REQUESTER`: Can access actions ONLY for tickets owned by the active user (`ticket.requesterId === req.user.id`).

#### Request Parameters
- Path: `id` (integer) - Ticket ID.

#### Responses
- **`200 OK`**: Returns array of `ActionTaken` objects.
  ```json
  [
    {
      "id": "c1f7a0b3-401d-4f1d-92a1-123456789abc",
      "ticketId": 101,
      "performedById": 2,
      "description": "Replaced faulty Ethernet cable on Workstation 4.",
      "result": "Network connectivity restored to 1Gbps full duplex.",
      "followUpRequired": true,
      "followUpNote": "Verify patch panel port labeling tomorrow morning.",
      "attachmentNotes": "Photo of replaced cable attached to internal log.",
      "actionDate": "2026-09-24T10:00:00.000Z",
      "createdAt": "2026-09-24T10:00:00.000Z",
      "updatedAt": "2026-09-24T10:00:00.000Z",
      "performedBy": {
        "id": 2,
        "name": "Jane Staff",
        "email": "staff@toktickit.com",
        "role": "IT_STAFF"
      }
    }
  ]
  ```
- **`401 Unauthorized`**: Authentication missing or expired.
- **`403 Forbidden`**: Requester attempting to view another user's ticket actions.
- **`404 Not Found`**: Ticket ID does not exist.

---

### 1.2 POST `/api/tickets/:id/actions`
Creates a new Action Taken record for a ticket.

- **Authentication**: Required.
- **Authorization**: `IT_STAFF` or `ADMIN` only. (`403 Forbidden` for `REQUESTER`).

#### Request Body
```json
{
  "description": "Upgraded RAM from 8GB to 32GB on workstation.",
  "result": "System successfully booted into BIOS and verified 32GB dual-channel.",
  "followUpRequired": true,
  "followUpNote": "Check in with user after 48 hours to confirm CAD performance.",
  "attachmentNotes": "Diagnostic report saved as benchmark_0924.pdf"
}
```

#### Validation Rules
- `description`: String, required, non-empty.
- `result`: String, required, non-empty.
- `followUpRequired`: Boolean, optional (default `false`).
- `followUpNote`: String, required if `followUpRequired` is `true` (must not be empty or whitespace).
- `attachmentNotes`: String, optional.
- `performedById`: Automatically assigned to active `req.user.id`.

#### Responses
- **`201 Created`**: Returns created `ActionTaken` object.
- **`400 Bad Request`**: Validation failure (missing description/result or missing followUpNote when followUpRequired is true).
- **`401 Unauthorized`**: Authentication missing or expired.
- **`403 Forbidden`**: Requester role access attempt.
- **`404 Not Found`**: Ticket ID does not exist.

---

### 1.3 PATCH `/api/actions/:id`
Updates an existing Action Taken record.

- **Authentication**: Required.
- **Authorization**: `IT_STAFF` or `ADMIN` only. (`403 Forbidden` for `REQUESTER`).

#### Path Parameters
- `id` (string): Action Taken UUID.

#### Request Body
```json
{
  "description": "Updated diagnostic summary.",
  "result": "Verified solution under stress test.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Updated logs attached."
}
```

#### Responses
- **`200 OK`**: Returns updated `ActionTaken` object.
- **`400 Bad Request`**: Validation failure.
- **`401 Unauthorized`**: Missing session.
- **`403 Forbidden`**: Requester role access attempt.
- **`404 Not Found`**: Action Taken ID does not exist.

---

## 2. Dashboard Endpoints

### 2.1 GET `/api/dashboard/staff`
Retrieves operational metrics and recent activity for IT Staff and Admins.

- **Authentication**: Required.
- **Authorization**: `IT_STAFF` or `ADMIN` only. (`403 Forbidden` for `REQUESTER`).

#### Response `200 OK`
```json
{
  "unassignedCount": 5,
  "myAssignedCount": 3,
  "newCount": 4,
  "openCount": 6,
  "inProgressCount": 3,
  "waitingForRequesterCount": 2,
  "recentTickets": [
    {
      "id": 101,
      "ticketNumber": "TCK-LAB4-001",
      "summary": "VPN connection dropping intermittently",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "createdAt": "2026-09-24T08:00:00.000Z",
      "updatedAt": "2026-09-24T09:30:00.000Z",
      "requesterUser": {
        "id": 5,
        "name": "Alice Requester",
        "email": "alice@company.com"
      },
      "assignedTo": {
        "id": 2,
        "name": "Jane Staff",
        "email": "staff@toktickit.com"
      },
      "category": { "id": 1, "name": "Network" },
      "relatedSystem": { "id": 3, "name": "VPN Access" }
    }
  ]
}
```

---

### 2.2 GET `/api/dashboard/requester`
Retrieves personal ticket metrics and recent tickets owned by the authenticated user.

- **Authentication**: Required (All roles: `REQUESTER`, `IT_STAFF`, `ADMIN`).

#### Response `200 OK`
```json
{
  "openCount": 2,
  "inProgressCount": 1,
  "resolvedCount": 3,
  "closedCount": 5,
  "recentTickets": [
    {
      "id": 102,
      "ticketNumber": "TCK-LAB4-002",
      "summary": "Monitor flickering on dock",
      "currentStatus": "OPEN",
      "requestedPriority": "MEDIUM",
      "createdAt": "2026-09-24T08:30:00.000Z",
      "updatedAt": "2026-09-24T09:15:00.000Z",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 5, "name": "Workstation Hardware" }
    }
  ]
}
```
