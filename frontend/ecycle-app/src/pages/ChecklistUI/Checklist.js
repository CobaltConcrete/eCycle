import AccountSummary from '../../components/AccountSummary';
import React, { useEffect, useState, useCallback } from 'react';
import axios from '../../components/api';
import { useNavigate } from 'react-router-dom';
import './Checklist.css';

const Checklist = () => {
    const [checklistOptions, setChecklistOptions] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [usertype] = useState(localStorage.getItem('usertype'));
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

    const verifyUser = useCallback(async () => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');


        if (!userid || !username || !usertype) {
            navigate('/');
            return;
        }

        try {
            const response = await axios.post(`/verify`, {
                userid,
                username,
                usertype,
            });

            if (response.data.isValid) {
                localStorage.setItem('points', response.data.points);
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            navigate('/');
        }
    }, [navigate]);

    const fetchUserChecklist = async () => {
        const userid = localStorage.getItem('userid');
        try {
            const response = await axios.get(`/user-checklist/${userid}`);
            setSelectedOptions(response.data); // Set saved checklist options as selected
        } catch (err) {
            setError('Error loading user checklist. Please try again later.');
        }
    };

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    useEffect(() => {
        const fetchChecklistOptions = async () => {
            try {
                const response = await axios.get(`/checklist-options`);
                setChecklistOptions(response.data);
            } catch (err) {
                setError('Error fetching checklist options. Please try again later.');
            }
        };

        fetchChecklistOptions();
        fetchUserChecklist(); // Load user-specific selections
    }, []);

    const handleCheckboxChange = (optionId) => {
        if (selectedOptions.includes(optionId)) {
            setSelectedOptions(selectedOptions.filter(id => id !== optionId));
        } else {
            setSelectedOptions([...selectedOptions, optionId]);
        }
    };

    const handleSelectAll = () => {
        if (selectedOptions.length === checklistOptions.length) {
            setSelectedOptions([]);
        } else {
            const allOptionIds = checklistOptions.map(option => option.checklistoptionid);
            setSelectedOptions(allOptionIds);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userid = localStorage.getItem('userid');

        try {
            await axios.post(`/user-checklist`, {
                userid,
                checklistoptionids: selectedOptions,
            });

            if (usertype === 'user' || usertype === 'admin') {
                navigate('/select-waste');
            } else if (usertype === 'shop') {
                navigate(`/forums/${userid}`);
            }
        } catch (err) {
            setError('Error saving checklist options. Please try again later.');
        }
    };

    return (
        <div className="checklist-container">
            <AccountSummary username={current_username} role={current_role} points={current_points} />
            <p className="eyebrow">MAKE ROOM FOR SOMETHING BETTER</p>
            <h2>
                {usertype === 'shop' ? 'What items do you accept?' : 'What are you making space for?'}
            </h2>
            <p className="checklist-intro">{usertype === 'shop' ? 'Choose the categories your location accepts.' : "Select your items. We'll find places that accept your selection."}</p>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="checklist-grid">{checklistOptions.map(option => (
                    <div key={option.checklistoptionid} className="switch-container">
                        <input
                            type="checkbox"
                            id={`optionSwitch${option.checklistoptionid}`}
                            checked={selectedOptions.includes(option.checklistoptionid)}
                            onChange={() => handleCheckboxChange(option.checklistoptionid)}
                            className="switch-input"
                        />
                        <label className="switch-label" htmlFor={`optionSwitch${option.checklistoptionid}`}>
                            {option.checklistoptiontype}
                        </label>
                    </div>
                ))}</div>
                <div className="checklist-actions"><span aria-live="polite">{selectedOptions.length} selected</span>
                <button type="button" onClick={handleSelectAll} className="btn select-all-btn">
                    {selectedOptions.length === checklistOptions.length ? 'Deselect All' : 'Select All'}
                </button>
                <button type="submit" className="btn submit-btn">{usertype === 'shop' ? 'Save accepted items' : 'Continue'} <span aria-hidden="true">&rarr;</span></button></div>
            </form>
        </div>
    );
};

export default Checklist;
