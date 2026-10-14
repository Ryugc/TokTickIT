# Lab 4 UI Specification: Dashboard Metrics & Actions Taken UI

## 1. Design Philosophy: Zen Green System
TokTickIT UI follows the **Zen Green** design language—a clean, accessible, and structured interface tailored for IT Operations workflows.

### Design Tokens

| Token Name | Value | Purpose |
| :--- | :--- | :--- |
| `--color-primary` | `#006B3C` | Primary brand color, header banner, primary CTA buttons |
| `--color-primary-hover` | `#00522E` | Hover/active state for primary interactive elements |
| `--color-primary-light` | `#E6F2ED` | Pale background accent for active badges and cards |
| `--color-focus-ring` | `#006B3C` | 2px high-contrast keyboard outline focus indicator |
| `--color-bg-app` | `#F8FAFC` | Viewport body background |
| `--color-surface` | `#FFFFFF` | Card, table, and form container background |
| `--color-border` | `#E2E8F0` | Structural card borders and dividing lines |
| `--color-text-primary` | `#0F172A` | Primary headers, field labels, and ticket summaries |
| `--color-text-secondary` | `#475569` | Secondary metadata, dates, and helper text |
| `--color-danger` | `#DC2626` | Validation error banners and Resolution Gate alerts |

---

## 2. Ticket Status Visual Badge System

| Status | Badge Background | Badge Text Color | Purpose / Meaning |
| :--- | :--- | :--- | :--- |
| `NEW` | `#DBEAFE` (Light Blue) | `#1E40AF` | Newly submitted, unassigned ticket |
| `OPEN` | `#FEF3C7` (Amber Light) | `#92400E` | Triaged, acknowledged, and ready for work |
| `IN_PROGRESS` | `#E0E7FF` (Indigo Light) | `#3730A3` | Staff currently working on resolution |
| `WAITING_FOR_REQUESTER` | `#FFEDD5` (Orange Light) | `#9A3412` | Blocked pending requester response |
| `RESOLVED` | `#DCFCE7` (Zen Green Light)| `#166534` | Actions completed and verified |
| `REOPENED` | `#FEE2E2` (Soft Red) | `#991B1B` | Issue recurrence reported by requester |
| `CLOSED` | `#F1F5F9` (Slate Light) | `#475569` | Archived, final terminal state |
| `CANCELLED` | `#E2E8F0` (Muted Grey) | `#64748B` | Voided request |

---

## 3. IT Staff Operational Dashboard Layout

### 3.1 Metric Cards Row
Fluid flex/grid layout adapting across viewports (1 column on mobile, 2 columns on tablet, 6 columns on desktop):
1. **Unassigned Tickets**: Metric highlight of unassigned, active tickets.
2. **Assigned to Me**: Load indicator for active tickets assigned to the logged-in staff member.
3. **New**: Total `NEW` status tickets across the system.
4. **Open**: Total `OPEN` status tickets across the system.
5. **In Progress**: Total `IN_PROGRESS` status tickets across the system.
6. **Waiting for Requester**: Total `WAITING_FOR_REQUESTER` status tickets across the system.

### 3.2 Recent Operational Activity Stream
- Container: `#FFFFFF` surface with 1px border and soft drop shadow (`0 1px 3px rgba(0,0,0,0.08)`).
- Table displaying the top 5 most recently updated tickets ordered by `updatedAt DESC`.
- Columns: Ticket Number, Summary, Priority Badge, Status Badge, Requester, Last Updated, and a "View" drill-down button.

---

## 4. Requester Personal Dashboard Layout

### 4.1 Personal Metric Summary Grid
Grid layout (1 column on mobile, 2 columns on tablet, 4 columns on desktop):
1. **Open Requests**: Active requests awaiting processing (`NEW`, `OPEN`).
2. **In Progress**: Requests under active investigation (`IN_PROGRESS`, `WAITING_FOR_REQUESTER`).
3. **Resolved**: Completed tickets pending requester confirmation.
4. **Closed**: Concluded requests (`CLOSED`, `CANCELLED`).

### 4.2 My Recent Activity Card
- Displays the top 5 tickets owned by the authenticated requester.
- Excludes tickets submitted by other users to preserve data isolation.
- Includes a direct "View" link navigating to the ticket detail page.

---

## 5. Actions Taken Audit Log & Form Controls

### 5.1 Ticket Detail Layout Integration
- Structured as a dedicated card panel on the Ticket Detail screen positioned beneath Public Comments, Internal Notes, and File Attachments.
- Visual header with a count badge indicating the total number of logged actions.

### 5.2 Actions Log Card List
- Chronological timeline feed sorted from oldest to newest (`createdAt ASC`).
- Card structure:
  - Header: Staff name, role badge (`IT_STAFF`), and server timestamp.
  - Body: Distinct **Description / Procedure** and **Result / Outcome** blocks.
  - Follow-up Banner: Yellow callout box displayed when `followUpRequired` is `true`.
  - Attachment Notes: Optional reference block for associated diagnostic files.

### 5.3 Action Form Controls & Validation
- **IT Staff / Admin**: Displays the "+ Log New Action Taken" form.
  - Description: Mandatory textarea (`BR-02`).
  - Result: Mandatory textarea (`BR-02`).
  - Follow-Up Checkbox: Toggles requirement for the Follow-Up Note.
  - Follow-Up Note: Conditionally displayed and required when the checkbox is checked; triggers an inline red alert banner if left empty.
- **Requester**: Displays the audit log in read-only mode; creation and edit controls are hidden from the DOM.

---

## 6. Accessibility & Responsive Standards

### 6.1 Viewport Breakpoints
- **Desktop (`>= 1200px`)**: Multi-column grids for dashboard metrics; side-by-side or wide card layouts.
- **Tablet (`768px – 1024px`)**: Metric cards reflow into 2 columns; tables maintain horizontal readability without clipped text.
- **Mobile (`<= 430px`)**: Single-column vertical stacking for metric cards and forms; zero horizontal viewport overflow (`overflow-x: hidden`).

### 6.2 Accessibility (WCAG 2.1 AA)
- **Keyboard Navigation**: All interactive controls (buttons, inputs, status select menus, navigation links) support full sequential keyboard navigation (`Tab` / `Shift+Tab`) with a visible `2px solid #006B3C` focus ring.
- **Color Contrast**: All badge text and button labels maintain at least a 4.5:1 contrast ratio against their respective background fills.
- **Safe Feedback**: Form validation errors and the Resolution Gate alert render with both visual color cues and descriptive text messages.
