import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
    }, [navigate]);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    const getLocationName = async (lat, lon) => {
        try {
            const response = await axios.post('http://localhost:5000/get-location-name', {
                lat,
                lon,
            });
            return response.data.locationName;
        } catch (error) {
            console.error('Error fetching location name:', error);
            return null; // Return null if there is an error
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const userid = localStorage.getItem('userid'); // Retrieve userid from local storage
        let currentLocationUsed = false; // Use this flag instead of state

        try {
            let lat, lon;

            // First try to get coordinates from the entered address
            try {
                const coordsResponse = await axios.post('http://localhost:5000/get-coordinates', { address: addressname });
                // Destructure lat and lon from response
                ({ lat, lon } = coordsResponse.data); 

            } catch (addressError) {
                // If address lookup fails, fallback to geolocation
                console.warn('Address lookup failed. Attempting to get user\'s current location...');
                currentLocationUsed = true; // Set this flag when geolocation is used

                await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            lat = position.coords.latitude;
                            lon = position.coords.longitude;

                            // Apply manual calibration using the calculated offsets
                            lat += 0.00153;
                            lon -= 0.0041175; 

                            resolve();
                        },
                        (geoError) => {
                            // If geolocation fails or permission is denied, show error
                            setError('Address is invalid and location permission was denied. Shop registration failed.');
                            setLoading(false);
                            reject(geoError);
                        }
                    );
                });
            }

            // If no lat/lon is found, terminate
            if (!lat || !lon) {
                setError('Unable to retrieve location. Shop registration failed.');
                setLoading(false);
                return;
            }

            // If current location was used, get the location name
            let locationName = '';
            if (currentLocationUsed) {
                locationName = await getLocationName(lat, lon);
                if (!locationName) {
                    setError('Could not retrieve location name. Please check your connection.');
                    setLoading(false);
                    return;
                }
                setAddressname(locationName); // Use setAddressname to update state
            }

            // Create shopData after updating addressname
            const shopData = {
                userid,
                shopname,
                addressname: currentLocationUsed ? locationName : addressname, // Use the current location name if needed
                website,
                actiontype,
                latitude: lat,
                longtitude: lon,
            };

            await axios.post('http://localhost:5000/add-shop', shopData);

            // Show alert if current location was used
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
                <button type="submit" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Shop'}
                </button>
            </form>
        </div>
    );
};

export default SignupShop;
