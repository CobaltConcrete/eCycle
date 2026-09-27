import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { requireSupabase } from '../../components/supabase';
import { useAuth } from '../../components/AuthContext';
import SocialSignIn from '../../components/SocialSignIn';

export default function Signup() {
    const { session, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [socialBusy, setSocialBusy] = useState(false);
    if (!loading && session) return <Navigate to="/" replace />;
    async function submit(event) {
        event.preventDefault();
        if (busy || socialBusy) return;
        setBusy(true); setError(''); setMessage('');
        try {
            const { error } = await requireSupabase().auth.signUp({ email: email.trim(), password,
                options: { emailRedirectTo: window.location.origin + '/' } });
            if (error) throw error;
            setPassword('');
            setMessage('Check your email to confirm your account, then sign in. You will choose your username and account type next.');
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    return <section className="login-container"><h1>Create your account</h1>
        <p>Continue with a social account, or sign up with email and confirm it. Then choose a resident or shop profile.</p>
        <SocialSignIn disabled={busy} onBusyChange={setSocialBusy} />
        {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
        <form onSubmit={submit}>
            <label htmlFor="signup-email">Email</label><input id="signup-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <label htmlFor="signup-password">Password (at least 12 characters)</label><input id="signup-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} />
            <button disabled={busy || socialBusy}>{busy ? 'Creating account...' : 'Create account'}</button>
        </form><Link to="/">Back to sign in</Link>
    </section>;
}
