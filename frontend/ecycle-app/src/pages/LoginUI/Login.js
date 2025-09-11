import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username.trim()) {
            alert('Username cannot be empty.');
            return;
        }
        
        if (!password.trim()) {
            alert('Password cannot be empty.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/login`, {
                username,
                password,
            });

            if (response.status === 200) {
                const { userid, usertype, userpassword } = response.data;
                localStorage.setItem('userid', userid);
                localStorage.setItem('username', username);
                localStorage.setItem('usertype', usertype);
                localStorage.setItem('userhashedpassword', userpassword);
                login();

                // Redirect based on usertype
                if (usertype === 'user') {
                    navigate('/checklist');
                } else if (usertype === 'shop') {
                    localStorage.setItem('pathFromButton', `/forums/${userid}`);
                    navigate(`/forums/${userid}`);
                } else if (usertype === 'admin') {
                    navigate('/report');
                }
            }
        } catch (err) {
            // Check if username already exists or if credentials are incorrect
            if (err.response && err.response.status === 401) {
                alert('Invalid credentials. Please try again.');
            } else {
                alert('An error occurred. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = () => {
        navigate('/signup');
    };

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
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p className="signup-prompt">
                Don't have an account? 
                <button onClick={handleSignUp} style={{ marginLeft: '5px' }}>
                    Sign Up
                </button>
            </p>
        </div>
    );
};

export default Login;
