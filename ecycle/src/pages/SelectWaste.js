import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SelectWaste.css';

const SelectWaste = () => {
    const [usertype, setUsertype] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUsertype = localStorage.getItem('usertype');
        setUsertype(storedUsertype);
    }, []);

    if (usertype === 'shop') {
        return (
            <div className="access-restricted">
                <h2>Access Restricted</h2>
                <p>You need to be registered as a user to access this page.</p>
            </div>
        );
    }

    const handleSelectWaste = (type) => {
        if (type === 'repair') {
            navigate('/map/repair');
        } else if (type === 'dispose') {
            navigate('/map/dispose');
        } else {
            alert('Other Waste selected!');
        }
    };

    return (
        <div className="select-waste-container">
            <h2>Select Waste</h2>
            <p>Please select the type of waste you would like to dispose of or recycle.</p>
            <div className="boxes-container">
                <div className="waste-box" onClick={() => handleSelectWaste('repair')}>
                    <h3>Repair E-waste</h3>
                </div>
                <div className="waste-box" onClick={() => handleSelectWaste('dispose')}>
                    <h3>Dispose E-waste</h3>
                </div>
                <div className="waste-box" onClick={() => handleSelectWaste('other')}>
                    <h3>Other Waste</h3>
                </div>
            </div>
            <button className="help-button" onClick={() => alert('Help is on the way!')}>
                Need help?
            </button>
            <button className="checklist-button" onClick={() => navigate('/checklist')}>
                Go to Checklist
            </button>
        </div>
    );
};

export default SelectWaste;
