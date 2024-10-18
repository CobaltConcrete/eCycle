import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const registerUser = async (userType) => {
        try {
            const response = await axios.post('http://localhost:5000/register', {
                username,
                password,
                usertype: userType,
            });
            if (response.status === 201) {
                const { userid } = response.data; // Get userid from the response
                localStorage.setItem('usertype', userType); // Store usertype in localStorage
                localStorage.setItem('userid', userid); // Store userid in localStorage

                // Redirect user based on type
                if (userType === 'user') {
                    navigate('/checklist');
                } else if (userType === 'shop') {
                    navigate('/');
                } else if (userType === 'admin') {
                    navigate('/adminpage');
                }
            }
        } catch (err) {
            setError('Username already exists. Please try again.');
        }
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
        </div>
    );
};

export default Signup;
