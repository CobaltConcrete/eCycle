import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../components/AuthContext';

const Checklist = () => {
    const [checklistOptions, setChecklistOptions] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Create a navigate instance
    const { login } = useAuth();

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
            const response = await axios.post('http://localhost:5000/verify', {
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

    useEffect(() => {
        verifyUser();
    }, []);

    useEffect(() => {
        // Fetch checklist options from the backend only after user verification
        const fetchChecklistOptions = async () => {
            try {
                const response = await axios.get('http://localhost:5000/checklist-options');
                setChecklistOptions(response.data);
            } catch (err) {
                setError('Error fetching checklist options. Please try again later.');
            }
        };

        fetchChecklistOptions();
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
            // If all are selected, deselect all
            setSelectedOptions([]);
        } else {
            // Select all options
            const allOptionIds = checklistOptions.map(option => option.checklistoptionid);
            setSelectedOptions(allOptionIds);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userid = localStorage.getItem('userid'); // Get userid from localStorage
        const usertype = localStorage.getItem('usertype'); // Get usertype from localStorage

        try {
            await axios.post('http://localhost:5000/user-checklist', {
                userid,
                checklistoptionids: selectedOptions,
            });
            alert('Checklist options saved successfully!');

            // Redirect based on usertype
            if (usertype === 'user') {
                navigate('/select-waste'); // Redirect to /select-waste
            } else if (usertype === 'shop') {
                navigate('/shop-dashboard'); // Redirect to /shop-dashboard
            }
        } catch (err) {
            setError('Error saving checklist options. Please try again later.');
        }
    };

    return (
        <div className="checklist-container">
            <h2>Select Checklist Options</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                {checklistOptions.map(option => (
                    <div key={option.checklistoptionid}>
                        <label>
                            <input
                                type="checkbox"
                                value={option.checklistoptionid}
                                checked={selectedOptions.includes(option.checklistoptionid)}
                                onChange={() => handleCheckboxChange(option.checklistoptionid)}
                            />
                            {option.checklistoptiontype}
                        </label>
                    </div>
                ))}
                <button type="button" onClick={handleSelectAll}>
                    {selectedOptions.length === checklistOptions.length ? 'Deselect All' : 'Select All'}
                </button>
                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default Checklist;
