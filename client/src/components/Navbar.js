import { useNavigate } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include', // if using cookies
            });

            if (response.ok) {
                // Clear any local storage items
                localStorage.removeItem('token');
                // Redirect to login page
                navigate('/login');
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        // ... existing JSX ...
        <button onClick={handleLogout}>Logout</button>
        // ... existing JSX ...
    );
}

export default Navbar; 