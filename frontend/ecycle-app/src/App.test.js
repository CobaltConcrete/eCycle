import { render, screen } from '@testing-library/react';
import App from './App';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';

jest.mock('./components/api', () => ({ post: jest.fn(), get: jest.fn() }));
jest.mock('./components/supabase', () => ({ supabase: null }));

test('offers labelled sign-in and account creation on the home page', () => {
  render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  expect(screen.getByRole('button', { name: /Sign in/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Create an account/ })).toBeInTheDocument();
});
