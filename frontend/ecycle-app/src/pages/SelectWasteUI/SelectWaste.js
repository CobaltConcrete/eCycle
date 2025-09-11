import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SelectWaste.css';

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>E-Waste Checklist</h2>
                <ol>
                    <li>
                        Is the electronic device functioning?
                        <ul>
                            <li>Yes: Go to <strong>Repair E-Waste</strong>.</li>
                            <li>No: Proceed to the next question.</li>
                        </ul>
                    </li>
                    <li>
                        Is there visible damage (e.g., cracked screen, missing parts)?
                        <ul>
                            <li>Yes: Go to <strong>Dispose E-Waste</strong>.</li>
                            <li>No: Proceed to the next question.</li>
                        </ul>
                    </li>
                    <li>
                        Is it a newer model with available parts?
                        <ul>
                            <li>Yes: Go to <strong>Repair E-Waste</strong>.</li>
                            <li>No: Go to <strong>Dispose E-Waste</strong>.</li>
                        </ul>
                    </li>
                    <li>
                        Is the cost of repair reasonable compared to purchasing a new one?
                        <ul>
                            <li>Yes: Go to <strong>Repair E-Waste</strong>.</li>
                            <li>No: Go to <strong>Dispose E-Waste</strong>.</li>
                        </ul>
                    </li>
                    <li>
                        If it is not an electronic device (e.g., household appliance), can it be recycled?
                        <ul>
                            <li>Yes: Go to <strong>General Waste</strong>.</li>
                            <li>No: Go to <strong>Dispose E-Waste</strong>.</li>
                        </ul>
                    </li>
                </ol>
                <button className="close-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

const SelectWaste = () => {
    const [usertype, setUsertype] = useState(null);
    const [isVerified, setIsVerified] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

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
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify`, {
                    userid,
                    username,
                    usertype,
                    userhashedpassword,
                });

                if (response.data.isValid) {
                    setUsertype(usertype);
                    setIsVerified(true);
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error('Verification failed:', error);
                navigate('/');
            }
        };

        verifyUser();
    }, [navigate]);

    if (!isVerified) {
        return <p>Loading...</p>;
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
        <>
            <div className="user-info">
                <p>Role: <u>{current_role}</u> | Username: <u>{current_username}</u> | Points: <u>{current_points}</u></p>
            </div>
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
                <div>
                    <button className="help-button" onClick={() => setIsModalOpen(true)}>
                        Need help?
                    </button>
                    <HelpModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
                </div>
                <button className="checklist-button" onClick={() => navigate('/checklist')}>
                    Go to Checklist
                </button>
                {usertype === 'admin' && (
                    <button 
                        type="button" 
                        onClick={() => navigate('/report')} 
                        className="reportpage-button"
                    >
                        Go to Report Page 
                    </button>
                )}
            </div>
        </>
    );
};

export default SelectWaste;
