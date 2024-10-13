// AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a Context for authentication
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        // Retrieve the auth state from localStorage
        const savedAuthState = localStorage.getItem('isAuthenticated');
        return savedAuthState === 'true';
    });

    const login = () => {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true'); // Save to localStorage
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('isAuthenticated'); // Remove from localStorage
    };

    useEffect(() => {
        // Listen for changes in other tabs
        const handleStorageChange = (event) => {
            if (event.key === 'isAuthenticated') {
                setIsAuthenticated(event.newValue === 'true');
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Create a custom hook for easier access to the context
export const useAuth = () => {
    return useContext(AuthContext);
};
