# Health Data Integration Research (Apple HealthKit & Android Health Connect)

This document outlines the technical strategy for integrating biometric data from wearables into the Apprie Health Coaching platform.

## 1. Apple HealthKit (iOS)

HealthKit is the central repository for health and fitness data on iPhone and Apple Watch.

### Key Concepts
- **Permissions:** Granular access. Users must explicitly grant read/write access to specific data types (e.g., HRV, VO2Max).
- **Data Types:** 
    - `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`
    - `HKQuantityTypeIdentifierVO2Max`
    - `HKCategoryTypeIdentifierSleepAnalysis`
- **Framework:** Swift/Objective-C. For a web-based app like Apprie, a native wrapper (Capacitor, React Native, or a native iOS app) is required to access the HealthKit API.

### Integration Strategy for Web
Since Apprie is currently a web application, direct browser access to HealthKit is **not possible** due to privacy restrictions.
- **Option A (Native Bridge):** Build a thin native iOS wrapper using **Capacitor** or **React Native** to fetch data and push it to Apprie's backend.
- **Option B (Partner API):** Use a 3rd-party aggregator like **Terra API**, **Rook**, or **Vital** which provides a unified web-standard API to fetch HealthKit data (requires user to install their sync app).

---

## 2. Android Health Connect

Health Connect is Google's new on-device storage and data sharing platform for Android health data.

### Key Concepts
- **Unified API:** Replaces the old Google Fit API with a more secure, on-device standard.
- **Data Types:** 
    - `HeartRateVariability`
    - `Vo2Max`
    - `SleepSessionRecord`
- **Framework:** Kotlin/Java. Similar to iOS, it requires a native Android environment.

### Integration Strategy
- **Option A (Native Bridge):** Use the Health Connect SDK within an Android wrapper.
- **Option B (Unified API):** Leverage the same 3rd-party aggregators mentioned above (Terra/Vital) for cross-platform consistency.

---

## 3. Top Longevity Markers to Track

| Marker | Importance | Source |
| :--- | :--- | :--- |
| **HRV (Heart Rate Variability)** | Primary indicator of autonomic nervous system health and recovery. | Apple Watch, Oura, Whoop |
| **VO2 Max** | Gold standard for cardiorespiratory fitness and a strong predictor of longevity. | Apple Health (Estimated), Garmin |
| **Sleep Architecture** | Deep and REM sleep stages impact cognitive health and physical repair. | All major wearables |
| **Resting Heart Rate (RHR)** | Baseline cardiovascular health indicator. | All major wearables |

---

## 4. Recommendation for Apprie Prototype

1.  **Phase 1 (Mock Data):** For the current prototype, we will use high-fidelity mock data to demonstrate the dashboard's capabilities.
2.  **Phase 2 (Aggregator):** Implement **Terra API** or **Vital**. These services allow Apprie to remain a web app while gaining access to "Cloud-to-Cloud" sync for Oura, Fitbit, and Garmin, and "App-to-Cloud" sync for Apple Health.
3.  **Phase 3 (Native App):** Transition to a native mobile app for direct, zero-cost access to HealthKit and Health Connect.

---

## 5. Security & Privacy Note
All biometric data must be encrypted at rest (AES-256) and in transit (TLS 1.3). Under SOC 2 and GDPR, this data is considered sensitive and must be stored in isolated database instances with strict access logs.
