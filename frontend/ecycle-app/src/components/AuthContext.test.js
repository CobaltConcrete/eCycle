import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from './supabase';
import api from './api';

jest.mock('./api', () => ({ get: jest.fn() }));
jest.mock('./supabase', () => ({ supabase: { auth: { onAuthStateChange: jest.fn(), signOut: jest.fn() } } }));

let notify;
beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    supabase.auth.onAuthStateChange.mockImplementation(callback => {
        notify = callback;
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
});

function Probe() {
    const auth = useAuth();
    return <div><p>{auth.loading ? 'Loading' : auth.user?.username || (auth.needsProfile ? 'Create profile' : 'Signed out')}</p>
        {auth.error && <p role="alert">{auth.error}</p>}
        {auth.recovery && <p>Recover password</p>}
        <button onClick={auth.logout}>Sign out</button></div>;
}

test('does not authenticate from old localStorage flags and deletes the old hash', () => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userhashedpassword', 'old-hash');
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('userhashedpassword')).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
});

test('loads server identity and clears it on cross-tab sign-out', async () => {
    api.get.mockResolvedValue({ data: { userid: 1, username: 'resident', usertype: 'user', points: 5 } });
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => notify('SIGNED_IN', { access_token: 'test-token' }));
    expect(await screen.findByText('resident')).toBeInTheDocument();
    expect(localStorage.getItem('userid')).toBe('1');
    act(() => notify('SIGNED_OUT', null));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('userid')).toBeNull();
});

test('does not restore a stale account after sign-out during a pending profile request', async () => {
    let resolve;
    api.get.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => notify('SIGNED_IN', { access_token: 'test-token' }));
    act(() => notify('SIGNED_OUT', null));
    await act(async () => resolve({ data: { userid: 1, username: 'stale', usertype: 'admin' } }));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('userid')).toBeNull();
});

test('distinguishes a new profile from provider outages', async () => {
    api.get.mockRejectedValue({ response: { status: 403, data: { detail: 'profile_required' } } });
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => notify('SIGNED_IN', { access_token: 'new-user' }));
    expect(await screen.findByText('Create profile')).toBeInTheDocument();
    api.get.mockRejectedValue({ response: { status: 503, data: { detail: 'Authentication service unavailable' } } });
    act(() => notify('TOKEN_REFRESHED', { access_token: 'refreshed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication service unavailable');
    expect(screen.queryByText('Create profile')).not.toBeInTheDocument();
});

test('recovery events are preserved and failed sign-out is visible', async () => {
    api.get.mockResolvedValue({ data: { userid: 1, username: 'resident', usertype: 'user' } });
    supabase.auth.signOut.mockResolvedValue({ error: new Error('offline') });
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => notify('PASSWORD_RECOVERY', { access_token: 'recovery-token' }));
    expect(await screen.findByText('resident')).toBeInTheDocument();
    expect(screen.getByText('Recover password')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sign-out could not be completed'));
    expect(screen.getByText('resident')).toBeInTheDocument();
});
