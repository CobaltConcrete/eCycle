import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import './Checklist.css';

const Checklist = () => {
    const [checklistOptions, setChecklistOptions] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const [usertype, setUsertype] = useState(localStorage.getItem('usertype'));

    const verifyUser = async () => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const userhashedpassword = localStorage.getItem('userhashedpassword');

        if (!userid || !username || !usertype || !userhashedpassword) {
            navigate('/');
            return;
        }

        try {
            const response = await axios.post(`http://${process.env.REACT_APP_serverIP}:5000/verify`, {
                userid,
                username,
                usertype,
                userhashedpassword,
            });

            if (!response.data.isValid) {
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            navigate('/');
        }
    };

    const fetchUserChecklist = async () => {
        const userid = localStorage.getItem('userid');
        try {
            const response = await axios.get(`http://${process.env.REACT_APP_serverIP}:5000/user-checklist/${userid}`);
            setSelectedOptions(response.data); // Set saved checklist options as selected
        } catch (err) {
            setError('Error loading user checklist. Please try again later.');
        }
    };

    useEffect(() => {
        verifyUser();
    }, []);

    useEffect(() => {
        const fetchChecklistOptions = async () => {
            try {
                const response = await axios.get(`http://${process.env.REACT_APP_serverIP}:5000/checklist-options`);
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
            await axios.post(`http://${process.env.REACT_APP_serverIP}:5000/user-checklist`, {
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
            <h2>
                {usertype === 'shop' ? 'Select Waste Type You Accept:' : 'Select Waste Type You Have:'}
            </h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                {checklistOptions.map(option => (
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
                ))}
                <button type="button" onClick={handleSelectAll} className="btn select-all-btn">
                    {selectedOptions.length === checklistOptions.length ? 'Deselect All' : 'Select All'}
                </button>
                <button type="submit" className="btn submit-btn">Submit</button>
            </form>
        </div>
    );
};

export default Checklist;
