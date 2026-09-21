import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './components/AuthContext';
import Login from './pages/LoginUI/Login';
import Signup from './pages/SignupUI/Signup';
import SignupShop from './pages/SignupShopUI/SignupShop';
import SelectWaste from './pages/SelectWasteUI/SelectWaste';
import Checklist from './pages/ChecklistUI/Checklist';
import Map from './pages/MapUI/Map';
import Forums from './pages/ForumsUI/Forums';
import Comments from './pages/CommentsUI/Comments';
import Report from './pages/ReportUI/Report';
import { CompleteProfile, ResetPassword, UpdatePassword } from './pages/AccountUI/Account';


const App = () => {
    const { isAuthenticated, logout, error, user } = useAuth();
    return (
            <div className="App">
                <a className="skip-link" href="#main-content">Skip to content</a>
                <header className="site-header">
                    <Link className="brand" to="/" aria-label="eCycle home"><span aria-hidden="true">↻</span> eCycle</Link>
                    <span className="brand-note">A little care. A longer life.</span>
                    <nav aria-label="Account">
                        {isAuthenticated ? <button onClick={logout}>Sign out</button> : <Link to="/signup">Join the community <span aria-hidden="true">↗</span></Link>}
                    </nav>
                </header>
                <main className="App-header" id="main-content" tabIndex="-1">
                    {error && user && <p role="alert">{error}</p>}
                    <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/signup-shop" element={<ProtectedRoute element={<SignupShop />} />} />
                        <Route path="/complete-profile" element={<CompleteProfile />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/update-password" element={<UpdatePassword />} />
                        <Route path="/select-waste" element={<ProtectedRoute element={<SelectWaste />} />} />
                        <Route path="/checklist" element={<ProtectedRoute element={<Checklist />} />} />
                        <Route path="/map/:type" element={<ProtectedRoute element={<Map />} />} />
                        <Route path="/forums/:shopid" element={<ProtectedRoute element={<Forums />} />} />
                        <Route path="/comments/:forumid" element={<ProtectedRoute element={<Comments />} />} />
                        <Route path="/report" element={<ProtectedRoute element={<Report />} />} />
                        <Route path="*" element={<div><h1>Page not found</h1><Link to="/">Return home</Link></div>} />
                    </Routes>
                </main>
                <footer className="site-footer"><span>Made for a more circular Singapore.</span><span>Repair. Recycle. Repeat.</span></footer>
            </div>
    );
};

export default App;
