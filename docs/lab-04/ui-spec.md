# Lab 4 UI Specification: Dashboard Metrics & Actions Taken UI

## 1. Design Philosophy: Zen Green System
TokTickIT UI follows the **Zen Green** design language—a clean, calming, professional design system tailored for IT Operations.

### Design Tokens

| Token Name | Value | Purpose |
| :--- | :--- | :--- |
| `--color-primary` | `#006B3C` | Primary brand color, header active items, primary CTA |
| `--color-primary-hover` | `#00522E` | Hover state for primary buttons |
| `--color-primary-light` | `#E6F2ED` | Light background accent for selected items / active tabs |
| `--color-bg-app` | `#F8FAFC` | Main application viewport background |
| `--color-surface` | `#FFFFFF` | Card & panel background |
| `--color-border` | `#E2E8F0` | Subtle structural borders |
| `--color-text-primary` | `#0F172A` | Primary body text & card titles |
| `--color-text-secondary` | `#475569` | Subtitles, labels, timestamps |

---

## 2. Ticket Status Visual Badge System

| Status | Badge Background | Badge Text Color | Icon / Indicator |
| :--- | :--- | :--- | :--- |
| `NEW` | `#DBEAFE` (Light Blue) | `#1E40AF` | Pulse Dot |
| `OPEN` | `#FEF3C7` (Amber Light) | `#92400E` | Open Eye |
| `IN_PROGRESS` | `#E0E7FF` (Indigo Light) | `#3730A3` | Gear / Spinner |
| `WAITING_FOR_REQUESTER` | `#FFEDD5` (Orange Light) | `#9A3412` | Clock / Hourglass |
| `RESOLVED` | `#DCFCE7` (Zen Green Light)| `#166534` | Checkmark |
| `REOPENED` | `#FEE2E2` (Soft Red) | `#991B1B` | Refresh Arrow |
| `CLOSED` | `#F1F5F9` (Slate Light) | `#475569` | Lock |
| `CANCELLED` | `#E2E8F0` (Muted Grey) | `#64748B` | Cross Circle |

---

## 3. IT Staff Operational Dashboard Layout

### 3.1 Metric Cards Row
Grid layout (2 columns on mobile, 3 columns on tablet, 6 columns on desktop):
1. **Unassigned Queue**: Metric count highlight, warning alert border if count > 5.
2. **My Assigned**: Highlight of tickets assigned to active staff member.
3. **New**: Total NEW status tickets.
4. **Open**: Total OPEN status tickets.
5. **In Progress**: Total IN_PROGRESS status tickets.
6. **Waiting for Requester**: Total WAITING_FOR_REQUESTER status tickets.

### 3.2 Recent Ticket Stream Card
- Clean card container with `#FFFFFF` surface and subtle box-shadow.
- Table/List view of top 5 recently updated tickets across system.
- Columns: Ticket Number, Summary, Requester, Status Badge, Assigned Staff, Last Updated.

---

## 4. Requester Personal Dashboard Layout

### 4.1 Metric Summary Grid
Grid layout (2 columns on mobile, 4 columns on desktop):
1. **Open Tickets**: Active requests awaiting pickup/processing.
2. **In Progress**: Tickets actively being worked on by IT.
3. **Resolved**: Solved tickets pending confirmation or auto-close.
4. **Closed**: Completed tickets.

### 4.2 Recent My Tickets Card
- List of top 5 tickets owned by active user sorted by recent update date.
- Direct link to ticket detail view for quick follow-up.

---

## 5. Actions Taken Tabbed Component

### 5.1 Detail View Position
- Positioned within Ticket Details page alongside Public Comments and Internal Notes.
- Tab bar options: `Public Comments`, `Internal Notes` (Staff only), `Actions Taken`.

### 5.2 Actions Log Card List
- Chronological timeline feed.
- Each entry features:
  - Header: Staff PerformedBy badge, Action Date.
  - Body: Description & Result section.
  - Follow-up Banner: Highlighted in amber callout box if `followUpRequired` is `true`.
  - Attachment Notes section if present.
  - Edit Action button (Staff/Admin only).

### 5.3 Log Action Form Modal / Inline Panel
- Inputs:
  - Description (Textarea, required)
  - Result (Textarea, required)
  - Follow-up Required (Checkbox toggle)
  - Follow-up Note (Textarea, conditionally visible and required when checkbox is checked)
  - Attachment Notes (Textarea, optional)
