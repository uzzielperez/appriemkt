import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginButton() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = () => {
        const token = localStorage.getItem('token');
        console.log('Checking token:', token);
        setIsLoggedIn(!!token);
    };

    const handleAuth = async () => {
        console.log('Current auth state:', isLoggedIn);
        if (isLoggedIn) {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    console.log('Logout successful');
                    localStorage.clear(); // Clear all storage
                    setIsLoggedIn(false);
                    window.location.href = '/login'; // Force a full page refresh
                } else {
                    console.error('Logout failed:', response.status);
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        } else {
            navigate('/login');
        }
    };

    return (
        <button 
            onClick={handleAuth}
            style={{
                cursor: 'pointer',
                padding: '8px 16px',
                backgroundColor: isLoggedIn ? '#ff4444' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
            }}
        >
            {isLoggedIn ? 'Logout' : 'Login'}
        </button>
    );
}

export default LoginButton; 