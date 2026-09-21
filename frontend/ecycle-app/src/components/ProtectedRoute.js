import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ element }) => {
    const { user, session, loading, needsProfile, error, refreshProfile, recovery } = useAuth();
    if (recovery) return <Navigate to="/update-password" replace />;
    if (loading) return <p role="status">Checking your session...</p>;
    if (!session) return <Navigate to="/" replace />;
    if (needsProfile) return <Navigate to="/complete-profile" replace />;
    if (!user) return <div><p role="alert">{error || 'Account unavailable.'}</p><button onClick={refreshProfile}>Retry</button></div>;
    return element;
};

export default ProtectedRoute;
