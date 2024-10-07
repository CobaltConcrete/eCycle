import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';  // Assuming you have some CSS for your app
import Login from './pages/Login';
import Signup from './pages/Signup';
import SelectWaste from './pages/SelectWaste';
import Checklist from './pages/Checklist'; // Import the Checklist component
import ProtectedRoute from './components/ProtectedRoute'; // Adjust the path as necessary

const App = () => {
    return (
        <div className="App">
            <header className="App-header">
                <h1>eCycle</h1>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/select-waste" element={<ProtectedRoute element={<SelectWaste />} />} />
                    <Route path="/checklist" element={<ProtectedRoute element={<Checklist />} />} />
                    <Route path="/shop-dashboard" element={<ProtectedRoute />} />
                </Routes>
            </header>
        </div>
    );
};

export default App;
