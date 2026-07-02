# Project Constraints & Rules for FaciliTrack

This document outlines the coding standards, styling conventions, and architectural constraints that Google Antigravity must adhere to when working on the **FaciliTrack** repository.

---

## 1. Design & Styling Standards

*   **Aesthetics:** Maintain a premium, high-fidelity dark-themed interface by default. Use glassmorphism (`backdrop-blur`), subtle gradients, and glowing primary borders (`var(--primary-glow)`) as seen in the existing UI design.
*   **Utility Framework:** Use Tailwind CSS for layout, spacing, and styling. Ad-hoc custom styles must be defined as variables/utility classes in `src/index.css` rather than written inline.
*   **Icons:** Use `lucide-react` for UI icons. Maintain style uniformity (e.g., standard size `16` or `18` for action buttons, `12` or `14` for detail badges).
*   **Transitions:** All buttons, panels, and modals must use smooth transition effects (e.g., `transition-all duration-300`, hover states, and keyframe animations like `fadeIn` or `slideUp`).

---

## 2. TypeScript & Code Quality

*   **Strict Typing:** Never use `any`. All properties, function inputs, and component states must be strictly typed.
*   **Centralized Types:** All domain interfaces (e.g., `RepairRequest`, `Facility`, `Vendor`, `User`) must be imported from [types.ts](file:///c:/Users/LabanBwireBscBIT/Downloads/Development/src/types.ts). Modify this file first if a schema needs to be extended.
*   **React Best Practices:** Use React functional components with explicit `React.FC<Props>` typing and standard hooks (`useState`, `useEffect`, `useMemo`).

---

## 3. Architecture & State Management

*   **Mock Storage & Database:** All requests, organization details, and contractor profiles are mocked and stored in browser `localStorage` to facilitate a stateless server sandbox.
*   **Mock Data Sync:** Keep mock initialization and persistence logic inside [mockData.ts](file:///c:/Users/LabanBwireBscBIT/Downloads/Development/src/utils/mockData.ts). If new entities are registered, verify they sync to local storage key namespaces (e.g., `fm_v3_requests`, `fm_v3_vendors`).
*   **Persona Simulations:** Do not break the multitenant top bar simulation control in [App.tsx](file:///c:/Users/LabanBwireBscBIT/Downloads/Development/src/App.tsx). Swapping between Resident (Tenant), Manager, and Vendor personas must dynamically toggle active tabs and request filtering.

---

## 4. UI Copy & Feedback

*   **No Alerts:** Do not use native window `alert()` dialogs for workflow notifications in production additions. Create or reuse clean, non-intrusive toast messages or modal panels.
*   **Form Validations:** Ensure all form fields are validated on submit. Provide helper text and warning statuses (e.g., `emergency` urgency warnings) to alert the user.
