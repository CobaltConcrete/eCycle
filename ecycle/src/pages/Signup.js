import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';
import './Signup.css'; // Import the custom CSS

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const registerUser = async (usertype) => {
        try {
            const response = await axios.post('http://localhost:5000/signup', {
                username,
                password,
                usertype,
            });

            if (response.status === 200) {
                // Successful registration
                const { userid } = response.data;
                localStorage.setItem('userid', userid);
                localStorage.setItem('username', username);
                localStorage.setItem('usertype', usertype);
                login();
                navigate('/checklist'); // Redirect after signup
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        }
    };

    const handleBackToLogin = () => {
        navigate('/'); // Redirect to login page
    };

    return (
        <div className="signup-container">
            <h2>Sign Up</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form>
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
                <div className="user-type-container">
                    <button type="button" onClick={() => registerUser('user')} className="user-button">
                        Register as User
                    </button>
                    <button type="button" onClick={() => registerUser('shop')} className="shop-button">
                        Register as Shop
                    </button>
                </div>
            </form>
            <button onClick={handleBackToLogin} className="back-to-login-button">
                Back to Login
            </button>
        </div>
    );
};

export default Signup;
