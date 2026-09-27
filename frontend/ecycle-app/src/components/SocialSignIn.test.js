import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SocialSignIn from './SocialSignIn';
import Login from '../pages/LoginUI/Login';
import Signup from '../pages/SignupUI/Signup';
import { requireSupabase } from './supabase';
import { useAuth } from './AuthContext';

jest.mock('./supabase', () => ({ requireSupabase: jest.fn() }));
jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));

beforeEach(() => {
    jest.resetAllMocks();
    window.history.replaceState({}, '', '/');
    useAuth.mockReturnValue({ user: null, session: null, loading: false });
});

test.each([
    ['Google', 'google', {}], ['GitHub', 'github', {}], ['Microsoft', 'azure', { scopes: 'email' }],
])('%s requests OAuth with a same-origin return URL', async (label, provider, extra) => {
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: {}, error: null });
    requireSupabase.mockReturnValue({ auth: { signInWithOAuth } });
    render(<SocialSignIn />);
    fireEvent.click(screen.getByRole('button', { name: `Continue with ${label}` }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({
        provider, options: { redirectTo: window.location.origin + '/', ...extra },
    }));
    screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
});

test.each([Login, Signup])('account screen supports OAuth without requiring email/password input', async Page => {
    const signInWithOAuth = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ auth: { signInWithOAuth } });
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /^(Sign in|Create account)/ })).toBeDisabled();
});

test('provider errors release controls for retry without displaying provider details', async () => {
    const signInWithOAuth = jest.fn().mockResolvedValue({ error: new Error('sensitive-provider-details') });
    const onBusyChange = jest.fn();
    requireSupabase.mockReturnValue({ auth: { signInWithOAuth } });
    render(<SocialSignIn onBusyChange={onBusyChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with GitHub' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to start GitHub sign-in');
    expect(screen.getByRole('alert')).not.toHaveTextContent('sensitive-provider-details');
    expect(screen.getByRole('button', { name: 'Continue with GitHub' })).toBeEnabled();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
});

test('handles missing configuration and thrown network errors', async () => {
    requireSupabase.mockImplementation(() => { throw new Error('not configured'); });
    render(<SocialSignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Microsoft' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to start Microsoft sign-in');
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toBeEnabled();
});

test('cancelled callback shows a safe explanation without echoing URL error details', () => {
    window.history.replaceState({}, '', '/#error=access_denied&error_description=sensitive-text');
    render(<SocialSignIn />);
    expect(screen.getByRole('alert')).toHaveTextContent('cancelled');
    expect(screen.getByRole('alert')).not.toHaveTextContent('sensitive-text');
});

test('a pending provider request cannot be submitted twice', () => {
    const signInWithOAuth = jest.fn().mockReturnValue(new Promise(() => {}));
    requireSupabase.mockReturnValue({ auth: { signInWithOAuth } });
    render(<SocialSignIn />);
    const button = screen.getByRole('button', { name: 'Continue with Google' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
});
