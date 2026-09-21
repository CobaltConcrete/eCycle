import axios from 'axios';
import { requireSupabase } from './supabase';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL, timeout: 15000 });

api.interceptors.request.use(async config => {
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('Sign in required.');
    // Reject absolute URLs: this client must never send a token to another provider.
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(config.url || '')) {
        throw new Error('The authenticated API client accepts relative paths only.');
    }
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
    return config;
});

export default api;
