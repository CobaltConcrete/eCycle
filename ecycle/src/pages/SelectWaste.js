import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SelectWaste.css';

const SelectWaste = () => {
    const [usertype, setUsertype] = useState(null);
    const [isVerified, setIsVerified] = useState(false);
    const navigate = useNavigate();

        useEffect(() => {
        const verifyUser = async () => {
            const userid = localStorage.getItem('userid');
            const username = localStorage.getItem('username');
            const usertype = localStorage.getItem('usertype');
            const userhashedpassword = localStorage.getItem('userhashedpassword');

            if (!userid || !username || !usertype || !userhashedpassword) {
                navigate('/');
                return;
            }

            try {
                const response = await axios.post('http://192.168.18.72:5000/verify', {
                    userid,
                    username,
                    usertype,
                    userhashedpassword,
                });

                if (response.data.isValid) {
                    setUsertype(usertype);
                    setIsVerified(true); // User is verified
                } else {
                    navigate('/'); // Redirect if verification fails
                }
            } catch (error) {
                console.error('Verification failed:', error);
                navigate('/'); // Redirect on any error
            }
        };

        verifyUser();
    }, [navigate]);

    if (!isVerified) {
        return <p>Loading...</p>; // Or a loading spinner
    }

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
        } else if (type === 'general') {
            navigate('/map/general');
        } else {
            alert('Please select a valid waste type.');
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
                <div className="waste-box" onClick={() => handleSelectWaste('general')}>
                    <h3>General Waste</h3>
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
