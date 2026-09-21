import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../components/api';
import { useNavigate } from 'react-router-dom';
import './SignupShop.css';

const SignupShop = () => {
    const [shopname, setShopname] = useState('');
    const [addressname, setAddressname] = useState('');
    const [website, setWebsite] = useState('');
    const [actiontype, setActiontype] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

    // Verify user before loading the page
    const verifyUser = useCallback(async () => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');


        if (!userid || !username || !usertype) {
            navigate('/');
            return;
        }

        try {
            const response = await axios.post(`/verify-shop`, {
                userid,
                username,
                usertype,
            });

            if (!response.data.isValid) {
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await axios.post(`/get-coordinates`, { address: addressname });
            const { lat, lng } = response.data;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                setError('Please enter a valid shop address.');
                return;
            }
            await axios.post(`/add-shop`, {
                userid: localStorage.getItem('userid'), shopname, addressname, website,
                actiontype, latitude: lat, longtitude: lng,
            });
            navigate(`/forums/${localStorage.getItem('userid')}`);
        } catch (err) {
            setError('We could not save this shop. Check the address and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        const userid = localStorage.getItem('userid');
        navigate(`/forums/${userid}`);
    };

    return (
        <div className="signup-shop-container">
            <div className="user-info">
                <p>Role: <u>{current_role}</u> | Username: <u>{current_username}</u> | Points: <u>{current_points}</u></p>
            </div>
            <h2>Sign Up Your Shop</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Shop Name:
                        <input
                            type="text"
                            value={shopname}
                            onChange={(e) => setShopname(e.target.value)}
                            placeholder="Enter your shop name"
                            required
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Address:
                        <input
                            type="text"
                            value={addressname}
                            onChange={(e) => setAddressname(e.target.value)}
                            placeholder="Enter your shop address"
                            required
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Website:
                        <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="Enter your website (optional)"
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Waste Service Type:
                        <select
                            value={actiontype}
                            onChange={(e) => setActiontype(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select Waste Service Type</option>
                            <option value="repair">Repair</option>
                            <option value="dispose">Dispose</option>
                            <option value="general">General</option>
                        </select>
                    </label>
                </div>
                <button type="submit" disabled={loading} className="register-button">
                    {loading ? 'Registering...' : 'Register Shop'}
                </button>
            </form>
            <button type="button" onClick={handleBack} className="back-button">
                Back to Forums
            </button>
        </div>
    );
};

export default SignupShop;