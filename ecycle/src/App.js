import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SignupShop from './pages/SignupShop';
import SelectWaste from './pages/SelectWaste';
import Checklist from './pages/Checklist';
import Map from './pages/Map';
import Forums from './pages/Forums';
import Comments from './pages/Comments';


const App = () => {
    return (
        <div className="App">
            <header className="App-header">
                <h1>eCycle</h1>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/signup-shop" element={<SignupShop />} />
                    <Route path="/select-waste" element={<ProtectedRoute element={<SelectWaste />} />} />
                    <Route path="/checklist" element={<ProtectedRoute element={<Checklist />} />} />
                    <Route path="/map/:type" element={<ProtectedRoute element={<Map />} />} />
                    <Route path="/forums/:shopid" element={<ProtectedRoute element={<Forums />} />} />
                    <Route path="/comments/:forumid" element={<ProtectedRoute element={<Comments />} />} />
                </Routes>
            </header>
        </div>
    );
};

export default App;
