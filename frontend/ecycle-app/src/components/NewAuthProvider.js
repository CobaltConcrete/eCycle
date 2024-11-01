import React, { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const NewAuthProvider = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuthentication = async () => {
            const username = localStorage.getItem('username');
            const hashedpassword = localStorage.getItem('hashedpassword');

            if ( username && hashedpassword ) {
                try {
                    const response = await axios.post('http://localhost:5000/check-auth', {
                        username,
                        hashedpassword,
                    });

                    if (response.status !== 200) {
                        throw new Error('User not authenticated');
                    }
                } catch (error) {
                    // Redirect to the main page if authentication fails
                    navigate('/');
                }
            } else {
                // If any of the credentials are missing, redirect to the main page
                navigate('/');
            }
        };

        checkAuthentication();
    }, [navigate]);

    return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export default NewAuthProvider;
