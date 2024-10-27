import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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

    // Verify user before loading the page
    const verifyUser = useCallback(async () => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');
        const userhashedpassword = localStorage.getItem('userhashedpassword');

        if (!userid || !username || !usertype || !userhashedpassword) {
            navigate('/');
            return;
        }

        try {
            const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/verify-shop`, {
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
    }, [navigate]);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    const getLocationName = async (lat, lon) => {
        try {
            const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/get-location-name`, {
                lat,
                lon,
            });
            return response.data.locationName;
        } catch (error) {
            console.error('Error fetching location name:', error);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const userid = localStorage.getItem('userid');
        let currentLocationUsed = false;

        try {
            let lat, lon;

            try {
                const coordsResponse = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/get-coordinates`, { address: addressname });
                ({ lat, lon } = coordsResponse.data); 

            } catch (addressError) {
                console.warn('Address lookup failed. Attempting to get user\'s current location via Google API...');
                currentLocationUsed = true;

                const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
                try {
                    const response = await fetch(url, { method: 'POST' });
                    
                    if (!response.ok) {
                        throw new Error("Failed to retrieve location via Google API");
                    }
                    
                    const data = await response.json();
                    lat = data.location.lat;
                    lon = data.location.lng;

                    lat += 0.00153;
                    lon -= 0.0041175;

                } catch (geoError) {
                    console.error("Error obtaining location via Google API", geoError);
                    setError('Address is invalid and location retrieval via Google API failed. Shop registration failed.');
                    setLoading(false);
                    return;
                }
            }

            if (!lat || !lon) {
                setError('Unable to retrieve location. Shop registration failed.');
                setLoading(false);
                return;
            }

            let locationName = '';
            if (currentLocationUsed) {
                locationName = await getLocationName(lat, lon);
                if (!locationName) {
                    setError('Could not retrieve location name. Please check your connection.');
                    setLoading(false);
                    return;
                }
                setAddressname(locationName);
            }

            const shopData = {
                userid,
                shopname,
                addressname: currentLocationUsed ? locationName : addressname,
                website,
                actiontype,
                latitude: lat,
                longtitude: lon,
            };

            await axios.post(`http://${process.env.REACT_APP_localhost}:5000/add-shop`, shopData);

            if (currentLocationUsed) {
                alert('Your current location has been used because the address you entered could not be located.');
            }

            alert('Shop registered or updated successfully!');
            navigate(`/forums/${userid}`);
        } catch (err) {
            if (err.response && err.response.status === 400) {
                setError('Invalid address or shop registration failed. Please try again.');
            } else {
                setError('Error connecting to the server. Please try again later.');
            }
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