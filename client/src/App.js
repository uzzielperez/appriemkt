import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SubscriptionTiers from './components/SubscriptionTiers';
// Import other components...

function App() {
    return (
        <Router>
            <Routes>
                {/* Existing routes */}
                <Route path="/products" element={<SubscriptionTiers />} />
                {/* Other routes */}
            </Routes>
        </Router>
    );
}

export default App; 