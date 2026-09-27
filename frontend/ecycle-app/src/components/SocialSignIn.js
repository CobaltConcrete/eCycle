import React, { useRef, useState } from 'react';
import { requireSupabase } from './supabase';

const providers = [
    { id: 'google', label: 'Google' },
];

function callbackError() {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return [query, fragment].some(params => params.has('error') || params.has('error_description'))
        ? 'Social sign-in was cancelled or could not be completed. Please try again.' : '';
}

export default function SocialSignIn({ disabled = false, onBusyChange }) {
    const [pending, setPending] = useState('');
    const [error, setError] = useState(callbackError);
    const inFlight = useRef(false);

    async function signIn(provider) {
        if (disabled || inFlight.current) return;
        inFlight.current = true;
        setPending(provider.id);
        setError('');
        onBusyChange?.(true);
        try {
            const { error: authError } = await requireSupabase().auth.signInWithOAuth({
                provider: provider.id,
                options: {
                    redirectTo: window.location.origin + '/',
                },
            });
            if (authError) throw authError;
            // SDK starts a full-page redirect. Keep controls disabled until navigation.
        } catch (err) {
            setError(`Unable to start ${provider.label} sign-in. Please retry or use email. If this continues, contact the site owner.`);
            inFlight.current = false;
            setPending('');
            onBusyChange?.(false);
        }
    }

    return <div className="social-sign-in" role="group" aria-label="Social sign-in">
        <div className="social-sign-in-buttons">
            {providers.map(provider => <button key={provider.id} type="button"
                className="social-sign-in-button" disabled={disabled || Boolean(pending)}
                onClick={() => signIn(provider)}>
                {pending === provider.id ? `Connecting to ${provider.label}...` : `Continue with ${provider.label}`}
            </button>)}
        </div>
        {pending && <p role="status">Opening your sign-in provider...</p>}
        {error && <p role="alert">{error}</p>}
        <p className="auth-divider">or continue with email</p>
    </div>;
}
