# PRD - Apprie Optimization & Feature Expansion (v2.1)

## Introduction/Overview
Apprie is optimizing its existing high-quality design for speed and responsiveness while expanding its functional scope. This update focuses on organizational restructuring (separate About/Team page), specialized product offerings (Copilot with RAG, Health Coaching with paywall, Research platforms), and a revamped Support/B2B tiering system.

## Goals
1.  **Performance & Responsiveness:** Optimize the existing Bootstrap/CSS for faster load times and better mobile/tablet compatibility without a full React migration (unless requested later).
2.  **Navigation Restructuring:** Focus navigation on Products, Support, and Contact, moving About/Team to a separate route.
3.  **Product Deep Dive:**
    *   **Medical Copilot:** Implement RAG-based summarization with User/Admin authentication.
    *   **Health Coaching:** Establish a $29.99/year subscription model.
    *   **Research Platforms:** Build landing pages/sections for Drug Discovery and Digital Twin platforms.
4.  **B2B & Support:** Define clear tiers for individual support and corporate white-labeling.

## Functional Requirements
1.  **Navigation & Routing:**
    *   Update Navbar to: `Products`, `Support`, `Contact`.
    *   Create a separate `About` page (containing the Team section).
2.  **Product Suite:**
    *   **Medical Copilot (RAG):**
        *   Login flow for Patients and Admins.
        *   RAG system integration for document summarization.
    *   **Health Coaching ($29.99/year):**
        *   Feature list: Activity tracking, recovery scores, nutritional coaching.
        *   Payment/Subscription CTA.
    *   **Research - Drug Discovery:** Suggestion: AI-driven protein folding visualization and molecule cross-referencing.
    *   **Research - Digital Twin:** Suggestion: Real-time biometric syncing and longitudinal health forecasting.
3.  **Support & White-labeling:**
    *   **Individual Tiers:** Basic (Community), Pro (Priority Support), Premium (Consultations).
    *   **White-labeling:** Suggestion: API Access, Custom Brand Assets, Dedicated Cloud Instance, and HIPAA Compliance as a Service.

## Technical Considerations
*   **Speed:** Image optimization, CSS minification, and removing unused legacy scripts.
*   **Responsiveness:** Use Bootstrap 5's flexbox and grid utilities to ensure pixel-perfect display on mobile.
*   **Authentication:** Integration with Netlify Identity or Firebase for the Copilot portal.

## Success Metrics
*   Page load speed improvement (measured via Lighthouse).
*   User conversion rate for the Health Coaching subscription.
*   Lead generation for white-labeling inquiries.

