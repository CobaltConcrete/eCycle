// SelectWaste.js
import React, { useEffect, useState } from 'react';
import './SelectWaste.css';

const SelectWaste = () => {
    const [usertype, setUsertype] = useState(null);

    // Retrieve usertype from localStorage when component mounts
    useEffect(() => {
        const storedUsertype = localStorage.getItem('usertype');
        setUsertype(storedUsertype);
    }, []);

    if (usertype == 'shop') {
        return (
            <div className="access-restricted">
                <h2>Access Restricted</h2>
                <p>You need to be registered as a user to access this page.</p>
            </div>
        );
    }

    return (
        <div className="select-waste-container">
            <h2>Select Waste</h2>
            <p>Please select the type of waste you would like to dispose of or recycle.</p>
            <div className="boxes-container">
                <div className="waste-box" onClick={() => alert('Repair E-waste selected!')}>
                    <h3>Repair E-waste</h3>
                </div>
                <div className="waste-box" onClick={() => alert('Dispose E-waste selected!')}>
                    <h3>Dispose E-waste</h3>
                </div>
                <div className="waste-box" onClick={() => alert('Other Waste selected!')}>
                    <h3>Other Waste</h3>
                </div>
            </div>
            <button className="help-button" onClick={() => alert('Help is on the way!')}>
                Need help?
            </button>
        </div>
    );
};

export default SelectWaste;
