import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../../components/api';
import { useAuth } from '../../components/AuthContext';
import { requireSupabase } from '../../components/supabase';

export function CompleteProfile() {
    const { user, session, loading, refreshProfile, needsProfile, error: accountError } = useAuth();
    const [username, setUsername] = useState('');
    const [usertype, setUsertype] = useState('user');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState(false);
    if (loading) return <p role="status">Loading your account...</p>;
    if (!session) return <Navigate to="/" replace />;
    if (user) return <Navigate to={created && user.usertype === 'shop' ? '/signup-shop' : '/'} replace />;
    if (!needsProfile) return <div><p role="alert">{accountError}</p><button onClick={refreshProfile}>Retry</button></div>;
    async function submit(event) {
        event.preventDefault(); setBusy(true); setError('');
        try { await api.post('/auth/profile', { username, usertype }); setCreated(true); refreshProfile(); }
        catch (err) { setError(err.response?.data?.detail || 'Unable to create your profile. Please retry.'); }
        finally { setBusy(false); }
    }
    return <section className="login-container"><h1>Complete your profile</h1>
        <p>Already used eCycle with a username? Ask the site owner to link your old account before creating a new profile. Your existing data has been preserved.</p>
        {error && <p role="alert">{typeof error === 'string' ? error : 'Check your profile details.'}</p>}
        <form onSubmit={submit}>
            <label htmlFor="profile-name">Username</label><input id="profile-name" value={username} onChange={e => setUsername(e.target.value)} required maxLength={100} />
            <label htmlFor="profile-type">Account type</label><select id="profile-type" value={usertype} onChange={e => setUsertype(e.target.value)}>
                <option value="user">Resident</option><option value="shop">Repair or recycling shop</option>
            </select><button disabled={busy}>{busy ? 'Saving...' : 'Create profile'}</button>
        </form><button onClick={refreshProfile}>Check whether my existing account is linked</button>
    </section>;
}

export function ResetPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault(); setBusy(true); setError(''); setMessage('');
        try {
            const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin + '/update-password',
            });
            if (error) throw error;
            setMessage('If this email has an account, you will receive a password reset link.');
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    return <section className="login-container"><h1>Reset your password</h1>
        {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
        <form onSubmit={submit}><label htmlFor="reset-email">Email</label><input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <button disabled={busy}>Send reset link</button></form><Link to="/">Back to sign in</Link>
    </section>;
}

export function UpdatePassword() {
    const { session, loading, finishRecovery } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();
    async function submit(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const { error } = await requireSupabase().auth.updateUser({ password });
            if (error) throw error;
            setPassword(''); finishRecovery(); navigate('/', { replace: true });
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    if (loading) return <p role="status">Checking your reset link...</p>;
    if (!session) return <section className="login-container"><h1>Reset link unavailable</h1><p>The link may have expired or already been used.</p><Link to="/reset-password">Request another link</Link></section>;
    return <section className="login-container"><h1>Choose a new password</h1>{error && <p role="alert">{error}</p>}
        <form onSubmit={submit}><label htmlFor="new-password">New password (at least 12 characters)</label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} />
            <button disabled={busy}>Save password</button></form>
    </section>;
}
