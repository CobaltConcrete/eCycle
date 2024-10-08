import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const Map = () => {
    const { type } = useParams();
    const [locations, setLocations] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [manualLocation, setManualLocation] = useState({ lat: '', lon: '' });
    const [manualAddress, setManualAddress] = useState('');
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (useCurrentLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                () => setError('Failed to retrieve your current location')
            );
        } else if (!useCurrentLocation && manualAddress) {
            fetchCoordinatesFromAddress(manualAddress);
        } else {
            setUserLocation({ lat: manualLocation.lat, lon: manualLocation.lon });
        }
    }, [useCurrentLocation, manualLocation, manualAddress]);

    const fetchCoordinatesFromAddress = async (address) => {
        try {
            const response = await axios.post('http://localhost:5000/get-coordinates', { address });
            const { lat, lon } = response.data;
            setManualLocation({ lat, lon });
        } catch (err) {
            setError('Failed to fetch coordinates for the given address');
        }
    };

    const fetchNearbyLocations = async () => {
        try {
            const location = useCurrentLocation ? userLocation : manualLocation;
            const url = type === 'repair' 
                ? 'http://localhost:5000/nearby-repair-locations' 
                : 'http://localhost:5000/nearby-dispose-locations';
            
            const response = await axios.post(url, {
                lat: location.lat,
                lon: location.lon,
            });
            setLocations(response.data);
        } catch (err) {
            setError('Failed to fetch nearby locations');
        }
    };

    const handleAddressChange = (e) => setManualAddress(e.target.value);

    const userIcon = new L.Icon({
        iconUrl: 'https://example.com/user-location-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

    const locationIcon = new L.Icon({
        iconUrl: 'https://example.com/location-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

    return (
        <div>
            <h2>Find Nearest {type === 'repair' ? 'Repair' : 'Disposal'} Locations</h2>

            <div>
                <label>
                    <input
                        type="radio"
                        checked={useCurrentLocation}
                        onChange={() => setUseCurrentLocation(true)}
                    />
                    Use Current Location
                </label>
                <label>
                    <input
                        type="radio"
                        checked={!useCurrentLocation}
                        onChange={() => setUseCurrentLocation(false)}
                    />
                    Enter Location Manually
                </label>
            </div>

            {!useCurrentLocation && (
                <div>
                    <input
                        type="text"
                        placeholder="Enter address or postal code"
                        value={manualAddress}
                        onChange={handleAddressChange}
                    />
                </div>
            )}

            <button onClick={fetchNearbyLocations}>Find Locations</button>

            {userLocation && (
                <MapContainer center={[userLocation.lat, userLocation.lon]} zoom={13} style={{ height: '400px', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
                        <Popup>Your Location</Popup>
                    </Marker>
                    {locations.map((loc) => (
                        <Marker key={loc.IndexName} position={[loc.lat, loc.lon]} icon={locationIcon}>
                            <Popup>
                                <h3>{loc.Name}</h3>
                                <p>{loc.AddressName}</p>
                                <a href={loc.Hyperlink}>Visit Website</a>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
