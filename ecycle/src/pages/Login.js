import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();  // Initialize useNavigate

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate a login request (replace with your API call)
        if (username === 'test' && password === 'test') {
            // Successful login
            alert('Login successful!');
            navigate('/select-waste');  // Redirect to SelectWaste component
        } else {
            // Failed login
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="login-container" style={styles.container}>
            <h2>Login</h2>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    style={styles.input}
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    style={styles.input}
                />
                <button type="submit" style={styles.button}>Login</button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f4f4f4',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        width: '300px',
    },
    input: {
        padding: '10px',
        margin: '10px 0',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    button: {
        padding: '10px',
        backgroundColor: '#5cb85c',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        cursor: 'pointer',
    },
    error: {
        color: 'red',
    },
};

export default Login;
