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
5.  **Design & Content Polish:** Refine the landing page messaging, visual hierarchy, and credibility indicators (social proof).

## Functional Requirements
1.  **Navigation & Routing:**
    *   Update Navbar to: `Products`, `Support`, `Contact`.
    *   Create a separate `About` page (containing the Team section).
    *   **New:** Add feature highlights/previews on the homepage for each product.
2.  **Product Suite:**
    *   **Medical Copilot (RAG):**
        *   Login flow for Patients and Admins.
        *   RAG system integration for document summarization.
    *   **Health Coaching ($29.99/year):**
        *   **Longevity Dashboard:** Integration with Apple Health/Fitness data (HRV, VO2Max, Sleep, Activity).
        *   **Onboarding Flow:** Interactive chat-based intake to identify health goals and establish a baseline.
        *   **Feature list:** Activity tracking, recovery scores, nutritional coaching.
        *   **Payment/Subscription CTA.**
    *   **Research - Drug Discovery:** Suggestion: AI-driven protein folding visualization and molecule cross-referencing.
    *   **Research - Digital Twin:** Suggestion: Real-time biometric syncing and longitudinal health forecasting.
3.  **Support & White-labeling:**
    *   **Individual Tiers:** Basic (Community), Pro (Priority Support), Premium (Consultations).
    *   **White-labeling:** Suggestion: API Access, Custom Brand Assets, Dedicated Cloud Instance, and HIPAA Compliance as a Service.
4.  **User Experience & Content (New):**
    *   **Hero Section:** Update to "Your AI-Powered Healthcare Companion" with a clear value proposition.
    *   **Visual Hierarchy:** Use more icons, screenshots, and illustrations to reduce text-heavy areas.
    *   **CTA Strategy:** Define Primary vs. Secondary CTAs with clear outcome descriptions.
    *   **Core Pillars:** Detail specific medical use cases under each pillar.
    *   **Social Proof:** Add context for partner logos and sections for testimonials/case studies.
5.  **Technical & Legal (New):**
    *   **Contact Form:** Add real-time validation, success/error feedback, and response time notice.
    *   **Legal:** Functional (non-placeholder) Privacy Policy and Terms of Use pages.
6.  **Compliance & AI Security (New):**
    *   **SOC 2 Type II:** Independently audited security controls to protect customer data with enterprise encryption and monitoring.
    *   **Global Privacy:** GDPR, CCPA, and international privacy regulations covered with automated compliance controls.
    *   **Private Data:** Enterprise encryption, secure storage, and strict access controls to keep data completely private.
    *   **Secure AI:** Guarantee that data never trains models, is not shared with other customers, and is used only for the owner's purpose.

## Technical Considerations
*   **Speed:** Image optimization, CSS minification, and removing unused legacy scripts.
*   **Responsiveness:** Use Bootstrap 5's flexbox and grid utilities to ensure pixel-perfect display on mobile.
*   **Authentication:** Integration with Netlify Identity or Firebase for the Copilot portal.
*   **Medical AI Research:** Explore LLM and embedding models appropriate for medical use (e.g., BioGPT, ClinicalBERT, Med-PaLM 2, HIPAA-compliant model providers like Azure OpenAI or AWS Bedrock).

## Success Metrics
*   Page load speed improvement (measured via Lighthouse).
*   User conversion rate for the Health Coaching subscription.
*   Lead generation for white-labeling inquiries.

