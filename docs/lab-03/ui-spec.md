# Lab 3 UI Design & Layout Specification

This document details the user interface guidelines, Zen Green design system tokens, screen layouts, tabbed communication components, and security modals for TokTickIT Sprint 3.

---

## 1. Design System Tokens & Typography

### Palette & Color Tokens
- **Primary Color**: Zen Green `#006B3C`
- **Primary Hover / Active**: `#0B7A46`
- **Primary Light Container**: `#EAF6EF`
- **Header Accent**: Dark Forest Green `#043D22`
- **Neutral Surface**: `#FFFFFF`
- **Background Slate**: `#F8FAFC`
- **Text Primary**: `#1A202C`
- **Text Secondary**: `#4A5568`
- **Border Gray**: `#E2E8F0`

### Status Badges
- `NEW`: Soft Blue (`#EBF8FF`, text `#2B6CB0`)
- `OPEN`: Warm Amber (`#FEFCBF`, text `#D69E2E`)
- `IN_PROGRESS`: Purple (`#FAF5FF`, text `#805AD5`)
- `RESOLVED`: Emerald Green (`#F0FFF4`, text `#38A169`)
- `CLOSED`: Neutral Gray (`#EDF2F7`, text `#718096`)

### Priority Indicator Pills
- `LOW`: Light Gray (`#EDF2F7`)
- `MEDIUM`: Blue (`#EBF8FF`)
- `HIGH`: Orange (`#FEEBC8`, text `#DD6B20`)
- `URGENT`: Red (`#FED7D7`, text `#E53E3E`)

### Typography Hierarchy
- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Page Title**: 24px (1.5rem), Font Weight 700
- **Section Header**: 18px (1.125rem), Font Weight 600
- **Body Text**: 14px (0.875rem), Font Weight 400
- **Label / Button**: 14px (0.875rem), Font Weight 500
- **Badge / Caption**: 12px (0.75rem), Font Weight 600

---

## 2. Authentication & Mandatory Password Change Layouts

### Login Screen Layout
- Centered card container (max-width `420px`) with subtle shadow and Zen Green top accent border (`4px solid #006B3C`).
- Logo branding at top: TokTickIT logo with Zen Green accent.
- Input Fields:
  - Email input with envelope icon and placeholder `user@company.com`.
  - Password input with lock icon and show/hide password toggle button.
- Error Banner: Red background container (`#FFF5F5`, text `#C53030`) displaying authentication errors.
- Action: Full-width Zen Green submit button `"Sign In"`.

### Mandatory First-Time Password Change Screen Layout
- Modal overlay or dedicated screen triggered when `mustChangePassword === true`.
- Locked Viewport: Navigation links and external routes are disabled.
- Header: Alert banner `"Action Required: Mandatory Password Change"`.
- Real-Time Password Complexity Checklist:
  - [ ] At least 8 characters long
  - [ ] At least 1 uppercase letter (A-Z)
  - [ ] At least 1 lowercase letter (a-z)
  - [ ] At least 1 number (0-9)
  - [ ] At least 1 special character (`!@#$%^&*...`)
- Input Fields: Current Password, New Password, Confirm New Password.
- Submit Button: `"Update Password & Continue"`. Enabled only when all checklist items pass and passwords match.

---

## 3. IT Staff Queue Table & Mobile Card Guidelines

### Desktop Queue Layout (≥992px)
- **Top Bar Summary Cards**:
  - Quick count counter pills: `Unassigned`, `In Progress`, `Urgent`.
- **Search & Filter Control Bar**:
  - Search bar input with search icon (searches Ticket # or Summary).
  - Category dropdown filter.
  - Requested Priority dropdown filter.
  - IT Priority dropdown filter.
  - Status dropdown filter.
  - Clear Filters button.
- **Data Table Layout**:
  - Columns: Ticket Number, Summary, Requester, Category, Requested Priority, IT Priority, Status, Assigned To, Actions.
  - Row Hover: Background tint `#F7FAFC`.
  - Action Dropdown / Buttons: Quick Claim button (`"Claim"`) if unassigned; `"View Details"` button.
- **Pagination Footer**: Page size selector (10, 25, 50), page indicator (`"Page 1 of 5"`), Prev/Next buttons.

### Mobile Queue Guidelines (<768px)
- Stacked Ticket Cards with Zen Green left border indicator.
- Top row: Ticket Number and Status badge.
- Middle section: Summary title, Requester name, IT Priority badge.
- Bottom action bar: `"Claim"` pill button and `"View Details"` full card tap.

---

## 4. IT Staff Ticket Detail & Tabbed Communication Interface

### Layout Structure
- Two-column layout on desktop:
  - **Main Column (Left 65%)**: Ticket Summary, Description, Attachments, Tabbed Communication Section.
  - **Sidebar Column (Right 35%)**: Ticket Controls (Status Dropdown, IT Priority Selector, Assigned To Staff Selector, Requester Metadata).

### Tabbed Communication Section
- **Tab Header Bar**:
  - `Tab 1: Public Comments` (visible to all users).
  - `Tab 2: Internal Notes` (visible ONLY to IT Staff and Admins; completely hidden from DOM for Requesters).

- **Public Comments Tab**:
  - Chat thread styling with green background bubbles for IT Staff and gray bubbles for Requesters.
  - Textarea input with `"Post Public Comment"` button.

- **Internal Notes Tab**:
  - Distinct Amber/Yellow background container (`#FEFCBF` tint, border `#ECC94B`) with warning header icon: `"🔒 Confidential Internal Notes — Visible only to IT Staff and Admins"`.
  - Textarea input with `"Add Internal Note"` button.

---

## 5. Admin User Management Screen & Safety Dialogs

### User Directory Table
- Filter bar: Search input, Role filter (`REQUESTER`, `IT_STAFF`, `ADMIN`), Department filter, Active status filter (`Active`, `Inactive`).
- User Table Columns: Name, Email, Department, Role Badge, Active Toggle Switch, Actions (`Edit`, `Reset Password`).

### Add / Edit User Modal
- Inputs: Name, Email (disabled during Edit), Department, Role selector (`REQUESTER`, `IT_STAFF`, `ADMIN`), Temporary Password (on Add).
- Active switch toggle (`Active / Inactive`).

### Safety Alert Dialogs
- **Self-Deactivation Block Dialog**: Modal warning triggered if Admin attempts to uncheck `Active` on own account:
  - Header: `"Action Blocked"`.
  - Body: `"You cannot deactivate your own Admin account. Please contact another system administrator."`
- **Self-Demotion Block Dialog**: Modal warning triggered if Admin attempts to change own role to `IT_STAFF` or `REQUESTER`:
  - Header: `"Action Blocked"`.
  - Body: `"You cannot remove your own ADMIN role."`
- **Reset Password Modal**: Prompts for new temporary password with complexity requirements, displaying reminder: `"User will be forced to change this password on next login."`
