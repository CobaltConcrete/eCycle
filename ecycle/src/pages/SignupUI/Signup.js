import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext';
import './Signup.css';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const registerUser = async (usertype) => {
        try {
            const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/register`, {
                username,
                password,
                usertype,
            });

            if (response.status === 200 || response.status === 201) {
                // Successful registration
                const { userid } = response.data;
                localStorage.setItem('userid', userid);
                localStorage.setItem('username', username);
                localStorage.setItem('usertype', usertype);
                login();
                
                alert('Registration successful! Redirecting to login page.');
                
                navigate('/');
            } else {
                alert('Registration failed! Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
            alert('An error occurred. Please try again later.');
        }
    };

    const handleBackToLogin = () => {
        navigate('/');
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
