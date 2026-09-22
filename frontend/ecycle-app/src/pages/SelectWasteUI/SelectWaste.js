import AccountSummary from '../../components/AccountSummary';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../components/api';
import './SelectWaste.css';

const SelectWaste = () => {
    const [usertype, setUsertype] = useState(null);
    const [isVerified, setIsVerified] = useState(false);
    const navigate = useNavigate();
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

        useEffect(() => {
        const verifyUser = async () => {
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
            <AccountSummary username={current_username} role={current_role} points={current_points} />
            <div className="select-waste-container">
                <p className="eyebrow">A BETTER NEXT CHAPTER</p><h2>What will you do today?</h2>
                <p>Choose a service. We'll find nearby places that accept the items on your checklist.</p>
                <div className="boxes-container">
                    <button type="button" className="waste-box" onClick={() => handleSelectWaste('repair')}>
                        <span className="card-number">01</span><h3>Repair & reuse</h3><span className="card-description">Keep a good thing going. Find a local repair shop.</span><span className="card-arrow" aria-hidden="true">↗</span>
                    </button>
                    <button type="button" className="waste-box" onClick={() => handleSelectWaste('dispose')}>
                        <span className="card-number">02</span><h3>Recycle electronics</h3><span className="card-description">Find a collection point for your old electronics.</span><span className="card-arrow" aria-hidden="true">↗</span>
                    </button>
                    <button type="button" className="waste-box" onClick={() => handleSelectWaste('general')}>
                        <span className="card-number">03</span><h3>Recycle other items</h3><span className="card-description">Find a place for the other items on your list.</span><span className="card-arrow" aria-hidden="true">↗</span>
                    </button>
                </div>
                <details className="service-guide">
                    <summary>Not sure where to start?</summary>
                    <p>If your item could be repaired, ask a repair shop about parts and costs first. For unwanted electronics, choose a collection point that accepts your item type. Check your selected location's requirements before visiting.</p>
                </details>
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
