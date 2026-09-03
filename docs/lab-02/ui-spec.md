# Lab 2 Zen Green UI Specification

## 1. Design Tokens & Palette

| Token Name | Hex Code | Intended Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | App header, primary button background, core accents |
| **Secondary Green** | `#0B7A46` | Hover states, active tab highlights, link text |
| **Pale Green** | `#EAF6EF` | Selected rows, subtle callout backgrounds, success containers |
| **Page Background** | `#F5F7F6` | Light-gray canvas background |
| **Surface / Card** | `#FFFFFF` | Clean white cards with subtle border and soft shadow |
| **Dark Text** | `#1A231E` | Charcoal green for high-contrast text |
| **Read-Only Surface** | `#F0F4F2` | Distinct soft gray-green background for read-only fields |
| **Error** | `#D32F2F` | Red validation borders and field-level error text |

---

## 2. Form & Component Rules

- **Field Layout**: Labels always render above input controls.
- **Required Fields**: Mandatory controls show a red asterisk (`*`) next to the label.
- **Read-Only Fields**: Styled with `#F0F4F2` background to differentiate from editable inputs.
- **Button States**: Primary `#006B3C`, Busy/Loading spinner state, Disabled opacity 0.5.
- **Validation Messages**: Rendered directly beneath the associated field in red text.

---

## 3. Responsive Layout Guidelines

| Viewport Size | Layout Rules |
| :--- | :--- |
| **Desktop (>= 992px)** | Multi-column forms, full data table view with centered pagination. |
| **Tablet (768–991px)** | 2-column stacked form, table scales horizontally with smooth scrolling. |
| **Mobile (< 768px)** | 1-column vertically stacked inputs, ticket table converts to touch-friendly card lists. |

---

## 4. Visual Inspection Checklist & Screenshot Locations

- [ ] **Create Ticket Screen**: `artifacts/lab-02/screenshots/create-ticket/`
- [ ] **My Tickets Screen**: `artifacts/lab-02/screenshots/my-tickets/`
- [ ] **Ticket Detail & Attachments**: `artifacts/lab-02/screenshots/ticket-detail/`