import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { requireSupabase } from '../../components/supabase';
import { useAuth } from '../../components/AuthContext';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user, session, needsProfile, loading: authLoading, error: authError, refreshProfile, recovery } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim()) {
            setError('Enter your email to continue.');
            return;
        }
        
        if (!password.trim()) {
            setError('Enter your password to continue.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await requireSupabase().auth.signInWithPassword({ email: username.trim(), password });
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Unable to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = () => {
        navigate('/signup');
    };

    if (recovery) return <Navigate to="/update-password" replace />;
    if (authLoading) return <p role="status">Checking your session...</p>;
    if (session && needsProfile) return <Navigate to="/complete-profile" replace />;
    if (user) return <Navigate to={user.usertype === 'admin' ? '/report' : user.usertype === 'shop' ? `/forums/${user.userid}` : '/checklist'} replace />;

    return (
        <div className="welcome-layout">
          <section className="welcome-story" aria-labelledby="welcome-heading">
            <p className="eyebrow">SMALL ACTIONS. LASTING IMPACT.</p>
            <h1 id="welcome-heading">Good things deserve<br /><em>another life.</em></h1>
            <p className="welcome-description">Find a place to repair, recycle, or responsibly dispose of your unwanted items. Your next small step starts close to home.</p>
            <div className="journey-steps" aria-label="How eCycle works">
              <p><span>01</span> Choose your items</p>
              <p><span>02</span> Find a nearby place</p>
              <p><span>03</span> Give them a new start</p>
            </div>
            <div className="welcome-photo"><span>Less waste.<br />More possibility.</span></div>
          </section>
          <section className="login-container" aria-labelledby="login-heading">
            <p className="eyebrow">YOUR NEXT SMALL STEP</p>
            <h2 id="login-heading">Welcome back.</h2>
            <p className="login-description">Sign in to find the right place for your items.</p>
            {(error || authError) && <p className="login-error" id="login-error" role="alert">{error || authError}</p>}
            <form onSubmit={handleSubmit} aria-busy={loading}>
                <label htmlFor="login-username">Email</label>
                <input
                    id="login-username"
                    autoComplete="username"
                    required
                    aria-describedby={error ? 'login-error' : undefined}
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="you@example.com"
                />
                <label htmlFor="login-password">Password</label>
                <input
                    id="login-password"
                    autoComplete="current-password"
                    required
                    aria-describedby={error ? 'login-error' : undefined}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in →'}
                </button>
            </form>
            {session && authError && <button onClick={refreshProfile}>Retry loading your account</button>}
            <button className="text-button forgot-password" onClick={() => navigate('/reset-password')}>Forgot password?</button>
            <p className="signup-prompt">
                Don't have an account? 
                <button onClick={handleSignUp} className="text-button">
                    Create an account
                </button>
            </p>
            <p className="login-footnote">For residents, repair shops, and everyone who wants to make a difference.</p>
          </section>
        </div>
    );
};

export default Login;
