## Relevant Files
- `index.html` - Primary landing page (to be optimized).
- `about.html` - New page for Team and History.
- `products.html` - Dedicated products showcase.
- `support.html` - New page for support tiers and white-labeling.
- `css/styles.css` - Stylesheet for optimization and new components.
- `js/scripts.js` - Scripts for RAG integration and interactive elements.

### Notes
- Maintain the current high-quality design while stripping out bloated libraries.
- Use native HTML5/CSS3 for animations where possible to increase speed.
- Coordinate RAG logic with Netlify functions.

## Instructions
Check off tasks as they are completed using `[x]`.

## Tasks

- [ ] 0.0 Setup & Optimization
  - [ ] 0.1 Create a new branch `feature/apprie-optimization`
  - [ ] 0.2 Optimize images in `assets/img/` and minify `css/styles.css`
  - [ ] 0.3 Implement lazy loading for all heavy section images
- [ ] 1.0 Navigation & Tab Restructuring
  - [ ] 1.1 Update Navbar: `Products`, `Support`, `Contact`
  - [ ] 1.2 Move Team and Founder information to a new `about.html`
  - [ ] 1.3 Ensure mobile navigation is fluid and fast
- [ ] 2.0 Product Development (Copilot & Research)
  - [ ] 2.1 Enhance Medical Copilot section:
    - [ ] 2.1.1 Add Patient/Admin Login UI
    - [ ] 2.1.2 Implement RAG document summarization frontend (linking to Netlify functions)
  - [x] 2.2 Health Coaching: Implement $29.99/year paywall UI and feature list
    - [x] 2.2.1 Design Longevity Dashboard: Mockup for HRV, VO2Max, and Sleep markers (Apple Health integration strategy)
    - [x] 2.2.2 Build Onboarding Chatbot: Intake flow for health goals and baseline information
    - [x] 2.2.3 Data Integration Strategy: Research Apple HealthKit (iOS) and Health Connect (Android) API implementation
    - [x] 2.2.4 Interactive Tooltips: Add hover info for HRV, VO2Max, and Sleep with links to coaches
    - [x] 2.2.5 Specialized Coaches: Create landing pages/chat interfaces for VO2Max, HRV, and Sleep agents
    - [x] 2.2.6 Body Intelligence Dashboard:
        - [x] 2.2.6.1 Implement Interactive Body Map: Visual muscle freshness tracking (Fitbod-style)
        - [x] 2.2.6.2 Stability & Weight Tracking: Visual charts for balance and composition
        - [x] 2.2.6.3 Diet Integration: Baseline display for nutritional intake
        - [x] 2.2.6.4 Workout Logger (Strava-style): UI for logging exercises, weights, reps, and sets
        - [x] 2.2.6.5 Volume Increase Tracking: Automated calculation and visualization of Progressive Overload volume trends
  - [x] 2.3 Research - Drug Discovery: Implement AI molecule modeling visualization and repurposed drug mapping
  - [x] 2.4 Research - Digital Twin: Create Health Dashboard UI with intervention simulation and biological age tracking
- [ ] 3.0 Support & Monetization
  - [ ] 3.1 Build Support page with tiered pricing (Individual vs Enterprise)
  - [ ] 3.2 Implement White-labeling options (API, Custom Instance, Compliance)
  - [ ] 3.3 Add "Request Demo" CTA for corporate partnerships
  - [ ] 3.4 Standalone Distribution (New):
    - [ ] 3.4.1 Proof of Concept: Evaluate Tauri vs Electron for packaging .dmg/.exe
    - [ ] 3.4.2 Modularization: Prepare codebase for feature-specific builds (Copilot vs Coach)
    - [ ] 3.4.3 Licensing: Integrate a license key validation system (e.g. Keygen.sh or Stripe)
- [ ] 4.0 Design & User Experience Refinement
  - [ ] 4.1 Update Hero Section: "Your AI-Powered Healthcare Companion" + specific value prop
  - [ ] 4.2 Improve Visual Hierarchy: Add specific icons for pillars and product action screenshots
  - [ ] 4.3 Refine CTAs: Clearly distinguish Primary (Explore) vs Secondary (Copilot) with descriptions
- [ ] 5.0 Content Clarity & Social Proof
  - [ ] 5.1 Expand Core Pillars: Add tangible use cases (e.g. diagnostic scenarios)
  - [ ] 5.2 Contextualize Proof Points: Add context for partner logos and sections for testimonials
  - [ ] 5.3 Implement Product Previews: Highlights on homepage before product deep-links
- [ ] 6.0 Technical & Legal Essentials
  - [ ] 6.1 Upgrade Contact Form: Validation feedback, success/error states, and response time note
  - [ ] 6.2 Legal Compliance: Replace placeholder links for Privacy Policy & Terms of Use
  - [ ] 6.3 Analytics & Tracking (New):
    - [x] 6.3.1 Google Analytics 4 (GA4): Integrate tag for visitor and event tracking (ID: G-RLK1ZG1NGJ)
    - [x] 6.3.2 Google Consent Mode v2: Implement default-deny and consent banner for privacy compliance
    - [x] 6.3.3 Custom Event Tracking: Track key actions (Copilot clicks, Workout logs, Subscription signups)
    - [ ] 6.3.4 User Dashboard: Create a basic analytics view for internal monitoring
  - [ ] 6.4 SEO & Search Console (New):
    - [ ] 6.4.1 Sitemap Generation: Create `sitemap.xml` for search engine indexing
    - [ ] 6.4.2 Robots.txt: Configure `robots.txt` for crawler management
    - [ ] 6.4.3 Search Console: Implement verification (HTML tag) and property setup
    - [ ] 6.4.4 Meta Tags: Optimize page-specific meta titles/descriptions for medical SEO
- [ ] 7.0 Compliance & Medical AI Infrastructure
  - [ ] 7.1 Security Certification Prep: Document SOC 2 Type II audit requirements and existing controls
  - [ ] 7.2 Privacy Compliance: Implement GDPR/CCPA automated compliance controls and data mapping
  - [ ] 7.3 Data Privacy: Set up enterprise encryption standards and strict access control logging
  - [ ] 7.4 Secure AI Policy: Define and display data usage guarantees (no model training on user data)
  - [x] 7.5 Medical AI Research: Evaluate medical-grade LLMs (BioGPT, ClinicalBERT) and embedding models

