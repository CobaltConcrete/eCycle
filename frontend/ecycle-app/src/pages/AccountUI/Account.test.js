import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../SignupUI/Signup';
import { CompleteProfile, ResetPassword, UpdatePassword } from './Account';
import { useAuth } from '../../components/AuthContext';
import { requireSupabase } from '../../components/supabase';
import api from '../../components/api';

jest.mock('../../components/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/supabase', () => ({ requireSupabase: jest.fn() }));
jest.mock('../../components/api', () => ({ post: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('signup sends credentials only to Auth and explains email confirmation', async () => {
    useAuth.mockReturnValue({ session: null, loading: false });
    const signUp = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ auth: { signUp } });
    render(<MemoryRouter><Signup /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'resident@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'long-fixture-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
    expect(signUp).toHaveBeenCalledWith({ email: 'resident@example.com', password: 'long-fixture-password', options: { emailRedirectTo: window.location.origin + '/' } });
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Password/)).toHaveValue('');
});

test('profile creation offers only resident/shop and refreshes verified identity', async () => {
    const refreshProfile = jest.fn();
    useAuth.mockReturnValue({ session: {}, user: null, loading: false, needsProfile: true, refreshProfile });
    api.post.mockResolvedValue({ data: { userid: 1 } });
    render(<MemoryRouter><CompleteProfile /></MemoryRouter>);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newresident' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create profile' }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith('/auth/profile', { username: 'newresident', usertype: 'user' });
});

test('recovery requests use the password-update redirect and a neutral confirmation', async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ auth: { resetPasswordForEmail } });
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'resident@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If this email has an account');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('resident@example.com', { redirectTo: window.location.origin + '/update-password' });
});

test('password updates use the recovery session and finish the recovery flow', async () => {
    const finishRecovery = jest.fn();
    useAuth.mockReturnValue({ session: {}, loading: false, finishRecovery });
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    requireSupabase.mockReturnValue({ auth: { updateUser } });
    render(<MemoryRouter><UpdatePassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'new-fixture-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await waitFor(() => expect(finishRecovery).toHaveBeenCalled());
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-fixture-password' });
});
