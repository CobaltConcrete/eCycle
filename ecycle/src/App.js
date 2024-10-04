import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';  // Assuming you have some CSS for your app
import Login from './pages/Login';
import SelectWaste from './pages/SelectWaste';

const App = () => {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Welcome to My Website</h1>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/select-waste" element={<SelectWaste />} />
                </Routes>
            </header>
        </div>
    );
};

export default App;

