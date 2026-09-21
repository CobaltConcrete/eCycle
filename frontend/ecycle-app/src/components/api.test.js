import api from './api';
import { requireSupabase } from './supabase';

jest.mock('axios', () => ({ create: jest.fn(() => ({ interceptors: { request: { use: jest.fn() } } })) }));
jest.mock('./supabase', () => ({ requireSupabase: jest.fn() }));

const authorize = api.interceptors.request.use.mock.calls[0][0];

test('attaches the current SDK token, never cached role or hash credentials', async () => {
    localStorage.setItem('userhashedpassword', 'legacy-hash');
    const getSession = jest.fn().mockResolvedValue({ data: { session: { access_token: 'current-token' } } });
    requireSupabase.mockReturnValue({ auth: { getSession } });
    const result = await authorize({ url: '/forums/4', headers: {} });
    expect(result.headers).toEqual({ Authorization: 'Bearer current-token' });
    getSession.mockResolvedValue({ data: { session: { access_token: 'refreshed-token' } } });
    expect((await authorize({ url: '/auth/me', headers: {} })).headers.Authorization).toBe('Bearer refreshed-token');
    localStorage.clear();
});

test.each(['https://other.example/path', '//other.example/path'])('does not leak tokens to %s', async url => {
    requireSupabase.mockReturnValue({ auth: { getSession: async () => ({ data: { session: { access_token: 'private' } } }) } });
    await expect(authorize({ url, headers: {} })).rejects.toThrow('relative paths');
});

test('stops requests without a session or when session refresh fails', async () => {
    requireSupabase.mockReturnValue({ auth: { getSession: async () => ({ data: { session: null } }) } });
    await expect(authorize({ url: '/auth/me', headers: {} })).rejects.toThrow('Sign in required');
    requireSupabase.mockReturnValue({ auth: { getSession: async () => ({ error: new Error('Refresh failed') }) } });
    await expect(authorize({ url: '/auth/me', headers: {} })).rejects.toThrow('Refresh failed');
});
