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
  - [ ] 2.2 Health Coaching: Implement $29.99/year paywall UI and feature list
  - [ ] 2.3 Research - Drug Discovery: Implement AI molecule modeling visualization (static/mock)
  - [ ] 2.4 Research - Digital Twin: Create Health Dashboard UI for longevity research
- [ ] 3.0 Support & Monetization
  - [ ] 3.1 Build Support page with tiered pricing (Individual vs Enterprise)
  - [ ] 3.2 Implement White-labeling options (API, Custom Instance, Compliance)
  - [ ] 3.3 Add "Request Demo" CTA for corporate partnerships

