/**
 * Apprie Analytics & Tracking
 * This script initializes Google Analytics, handles custom event tracking,
 * and implements Google Consent Mode v2.
 */

// Google Analytics 4 (GA4) Measurement ID for Apprie
const GA_MEASUREMENT_ID = 'G-RLK1ZG1NGJ';

// 1. Initialize dataLayer and gtag function immediately
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

/**
 * 2. Setup Consent Mode Defaults
 * This must run BEFORE the GA4 script loads.
 * By default, we set everything to 'denied' for users in the EEA/UK (or everywhere for safety).
 */
function setupConsentDefaults() {
    const savedConsent = localStorage.getItem('google_consent_granted');
    
    // Set default consent state
    gtag('consent', 'default', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied',
        'wait_for_update': 500 // Wait for a possible update from a banner
    });

    // If user previously granted consent, update it immediately
    if (savedConsent === 'true') {
        updateGoogleConsent(true);
    }
}

/**
 * 3. Update Google Consent State
 * @param {boolean} granted 
 */
function updateGoogleConsent(granted) {
    const status = granted ? 'granted' : 'denied';
    gtag('consent', 'update', {
        'ad_storage': status,
        'ad_user_data': status,
        'ad_personalization': status,
        'analytics_storage': status
    });
    
    if (granted) {
        localStorage.setItem('google_consent_granted', 'true');
    }
}

/**
 * 4. Initialize GA4
 */
function initGA() {
    // Load GA4 Script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        'anonymize_ip': true,
        'cookie_flags': 'SameSite=None;Secure'
    });

    // Store for use in other functions
    window.gtag = gtag;
}

/**
 * 5. Cookie Consent Banner UI
 */
function createConsentBanner() {
    if (localStorage.getItem('google_consent_granted')) return;

    const banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.style = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: #111;
        border: 1px solid #333;
        padding: 20px;
        border-radius: 15px;
        z-index: 10000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        font-family: 'Montserrat', sans-serif;
    `;

    banner.innerHTML = `
        <div style="color: #fff; font-size: 0.85rem; max-width: 70%;">
            <strong style="color: #00ffff;">Cookie Consent</strong><br>
            We use cookies to improve your experience and measure performance. By clicking "Accept All", you consent to our use of cookies for analytics and personalized ads.
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="consent-deny" style="background: transparent; border: 1px solid #333; color: #a0a0a0; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 0.8rem;">Deny</button>
            <button id="consent-accept" style="background: #008080; border: none; color: #fff; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.8rem;">Accept All</button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('consent-accept').addEventListener('click', () => {
        updateGoogleConsent(true);
        banner.remove();
    });

    document.getElementById('consent-deny').addEventListener('click', () => {
        localStorage.setItem('google_consent_granted', 'false');
        banner.remove();
    });
}

/**
 * Track Custom Events
 * @param {string} eventName 
 * @param {object} params 
 */
function trackEvent(eventName, params = {}) {
    if (window.gtag) {
        window.gtag('event', eventName, params);
        console.log(`Analytics Event: ${eventName}`, params);
    }
}

// 6. Execution Flow
setupConsentDefaults();
initGA();

document.addEventListener('DOMContentLoaded', () => {
    createConsentBanner();
});
