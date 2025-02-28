import React from 'react';
import { useNavigate } from 'react-router-dom';

function SubscriptionTiers() {
    const navigate = useNavigate();

    const tiers = [
        {
            name: 'Basic',
            price: '$9.99/month',
            features: [
                'Basic product access',
                'Email support',
                'Basic analytics'
            ],
            buttonColor: '#4CAF50'
        },
        {
            name: 'Professional',
            price: '$19.99/month',
            features: [
                'All Basic features',
                'Priority support',
                'Advanced analytics',
                'Custom reports'
            ],
            buttonColor: '#2196F3',
            recommended: true
        },
        {
            name: 'Enterprise',
            price: '$49.99/month',
            features: [
                'All Professional features',
                '24/7 support',
                'White-label options',
                'API access',
                'Custom integration'
            ],
            buttonColor: '#9C27B0'
        }
    ];

    const handleSubscribe = (tierName) => {
        // Handle subscription logic here
        console.log(`Subscribing to ${tierName} tier`);
    };

    return (
        <div className="subscription-container">
            <h2>Choose Your Subscription Plan</h2>
            <div className="tiers-container">
                {tiers.map((tier) => (
                    <div key={tier.name} className={`tier-card ${tier.recommended ? 'recommended' : ''}`}>
                        {tier.recommended && <div className="recommended-badge">Recommended</div>}
                        <h3>{tier.name}</h3>
                        <div className="price">{tier.price}</div>
                        <ul>
                            {tier.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => handleSubscribe(tier.name)}
                            style={{ backgroundColor: tier.buttonColor }}
                        >
                            Subscribe Now
                        </button>
                    </div>
                ))}
            </div>

            {/* Affiliate Products Section */}
            <div className="affiliate-section">
                <h2>Recommended Products</h2>
                <div className="affiliate-products">
                    <div className="affiliate-product">
                        <img src="/path-to-product1-image.jpg" alt="Product 1" />
                        <h3>Product Name 1</h3>
                        <p>Product description goes here</p>
                        <a href="affiliate-link-1" className="affiliate-link">Learn More</a>
                    </div>
                    <div className="affiliate-product">
                        <img src="/path-to-product2-image.jpg" alt="Product 2" />
                        <h3>Product Name 2</h3>
                        <p>Product description goes here</p>
                        <a href="affiliate-link-2" className="affiliate-link">Learn More</a>
                    </div>
                    {/* Add more affiliate products as needed */}
                </div>
            </div>
        </div>
    );
}

export default SubscriptionTiers; 