import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SignupShop = () => {
    const [shopname, setShopname] = useState('');
    const [addressname, setAddressname] = useState('');
    const [website, setWebsite] = useState('');
    const [actiontype, setActiontype] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Verify user before loading the page
    const verifyUser = async () => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');
        const userhashedpassword = localStorage.getItem('userhashedpassword');

        if (!userid || !username || !usertype || !userhashedpassword) {
            navigate('/'); // Redirect to login page
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/verify-shop', {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const userid = localStorage.getItem('userid'); // Retrieve userid from local storage

        try {
            const coordsResponse = await axios.post('http://localhost:5000/get-coordinates', { address: addressname });
            const { lat, lon } = coordsResponse.data;

            const shopData = {
                userid,
                shopname,
                addressname,
                website,
                actiontype,
                latitude: lat,
                longtitude: lon,
            };

            await axios.post('http://localhost:5000/add-shop', shopData);
            alert('Shop registered or updated successfully!');
            navigate('/shop-dashboard');
        } catch (err) {
            if (err.response && err.response.status === 400) {
                setError('Invalid address or shop registration failed. Please try again.');
            } else {
                setError('Error connecting to the server. Please try again later.');
            }
        }
    };

    return (
        <div className="signup-shop-container">
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
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Shop Type:
                        <input
                            type="text"
                            value={actiontype}
                            onChange={(e) => setActiontype(e.target.value)}
                            required
                        />
                    </label>
                </div>
                <button type="submit">Register Shop</button>
            </form>
        </div>
    );
};

export default SignupShop;
