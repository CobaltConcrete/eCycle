import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../components/AuthContext'; // Import the useAuth hook

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Add loading state
    const navigate = useNavigate();
    const { login } = useAuth(); // Get the login function from context

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); // Set loading to true
        setError(''); // Clear previous errors

        try {
            const response = await axios.post('http://localhost:5000/login', {
                username,
                password,
            });

            if (response.status === 200) {
                const { usertype } = response.data; // Get usertype from the response
                localStorage.setItem('usertype', usertype); // Store usertype in localStorage
                
                login(); // Call the login function to update the authentication state

                // Redirect based on usertype
                if (usertype === 'user') {
                    navigate('/select-waste'); // User can access SelectWaste
                } else if (usertype === 'shop') {
                    navigate('/shop-dashboard'); // Shop users may have a different dashboard
                }
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError('Invalid credentials. Please try again.');
            } else {
                setError('An error occurred. Please try again later.');
            }
        } finally {
            setLoading(false); // Set loading to false regardless of the outcome
        }
    };

    // Navigate to Signup page
    const handleSignUp = () => {
        navigate('/signup');
    };

    console.log("Rendering Login Component");

    return (
        <div className="login-container">
            <h2>Login</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                />
                <button type="submit" disabled={loading}> {/* Disable button while loading */}
                    {loading ? 'Logging in...' : 'Login'} {/* Show loading text */}
                </button>
            </form>
            <p>
                Don't have an account? 
                <button onClick={handleSignUp} style={{ marginLeft: '5px' }}>
                    Sign Up
                </button>
            </p>
        </div>
    );
};

export default Login;
