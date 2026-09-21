import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabase';
import api from './api';

const AuthContext = createContext();
const displayKeys = ['isAuthenticated', 'userid', 'username', 'usertype', 'userhashedpassword', 'points', 'pathFromButton'];
const clearDisplay = () => displayKeys.forEach(key => localStorage.removeItem(key));

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(supabase));
    const [needsProfile, setNeedsProfile] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [recovery, setRecovery] = useState(false);

    useEffect(() => {
        clearDisplay(); // Purge permanent hash credentials from previous versions.
        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
            // Keep this callback synchronous: SDK calls here can deadlock its session lock.
            clearDisplay();
            setUser(null);
            setNeedsProfile(false);
            setError('');
            setLoading(Boolean(next));
            setSession(next);
            if (event === 'PASSWORD_RECOVERY') setRecovery(true);
            if (!next) setRecovery(false);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session) return;
        let cancelled = false;
        setLoading(true);
        setError('');
        api.get('/auth/me').then(({ data }) => {
            if (cancelled) return;
            // Transitional display cache for legacy pages, never an authorization source.
            ['userid', 'username', 'usertype', 'points'].forEach(key => localStorage.setItem(key, data[key]));
            setUser(data);
            setNeedsProfile(false);
        }).catch(err => {
            if (cancelled) return;
            setUser(null);
            if (err.response?.status === 403 && err.response?.data?.detail === 'profile_required') {
                setNeedsProfile(true);
            } else {
                setError(err.response?.data?.detail || 'Unable to load your account. Please retry.');
            }
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [session, retry]);

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) { setError('Sign-out could not be completed. Please retry.'); return; }
        clearDisplay();
        setUser(null);
        setSession(null);
        setNeedsProfile(false);
        setRecovery(false);
    };

    return <AuthContext.Provider value={{ session, user, loading, error, needsProfile, recovery,
        isAuthenticated: Boolean(session), logout, refreshProfile: () => setRetry(n => n + 1),
        finishRecovery: () => setRecovery(false) }}>
        {children}
    </AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
