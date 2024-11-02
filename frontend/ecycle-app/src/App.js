import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/LoginUI/Login';
import Signup from './pages/SignupUI/Signup';
import SignupShop from './pages/SignupShopUI/SignupShop';
import SelectWaste from './pages/SelectWasteUI/SelectWaste';
import Checklist from './pages/ChecklistUI/Checklist';
import Map from './pages/MapUI/Map';
import Forums from './pages/ForumsUI/Forums';
import Comments from './pages/CommentsUI/Comments';
import Report from './pages/ReportUI/Report';


const App = () => {
    return (
        <div className="App">
            <header className="App-header">
                <div className="title-container">
                    <h1>eCycle</h1>
                </div>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/signup-shop" element={<SignupShop />} />
                    <Route path="/select-waste" element={<ProtectedRoute element={<SelectWaste />} />} />
                    <Route path="/checklist" element={<ProtectedRoute element={<Checklist />} />} />
                    <Route path="/map/:type" element={<ProtectedRoute element={<Map />} />} />
                    <Route path="/forums/:shopid" element={<ProtectedRoute element={<Forums />} />} />
                    <Route path="/comments/:forumid" element={<ProtectedRoute element={<Comments />} />} />
                    <Route path="/report" element={<ProtectedRoute element={<Report />} />} />
                </Routes>
            </header>
        </div>
    );
};

export default App;
