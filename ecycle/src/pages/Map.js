import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const Map = () => {
    const { type } = useParams();
    const [locations, setLocations] = useState([]);
    const [userLocation, setUserLocation] = useState({ lat: '', lon: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                () => setError('Failed to retrieve your current location')
            );
        } else {
            setError('Geolocation is not supported by your browser');
        }
    }, []);

    const fetchNearbyLocations = async () => {
        try {
            const url = type === 'repair' 
                ? 'http://localhost:5000/nearby-repair-locations' 
                : 'http://localhost:5000/nearby-dispose-locations';
            
            const response = await axios.post(url, {
                lat: userLocation.lat,
                lon: userLocation.lon,
            });
            setLocations(response.data);
        } catch (err) {
            setError('Failed to fetch nearby locations');
        }
    };

    return (
        <div>
            <h2>Find Nearest {type === 'repair' ? 'Repair' : 'Disposal'} Locations</h2>
            <button onClick={fetchNearbyLocations}>Use Current Location</button>
            <div>
                {locations.map((loc) => (
                    <div key={loc.IndexName}>
                        <h3>{loc.Name}</h3>
                        <p>{loc.AddressName}</p>
                        <a href={loc.Hyperlink}>Visit Website</a>
                    </div>
                ))}
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
