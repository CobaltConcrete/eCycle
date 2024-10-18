import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import redMarker from '../images/redmarker.png';
import blueMarker from '../images/bluemarker.png';
import './Map.css';

const Map = () => {
    const { type } = useParams();
    const [locations, setLocations] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [manualLocation, setManualLocation] = useState({ lat: '', lon: '' });
    const [manualAddress, setManualAddress] = useState('');
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [error, setError] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [directions, setDirections] = useState([]);

    useEffect(() => {
        if (useCurrentLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    setUserLocation({ lat, lon });
                },
                () => setError('Failed to retrieve your current location')
            );
        } else if (!useCurrentLocation && manualAddress) {
            fetchCoordinatesFromAddress(manualAddress);
        }
    }, [useCurrentLocation, manualAddress]);

    const fetchCoordinatesFromAddress = async (address) => {
        try {
            const response = await axios.post('http://localhost:5000/get-coordinates', { address });
            const { lat, lon } = response.data;
            setManualLocation({ lat, lon });
            setUserLocation({ lat, lon });
        } catch (err) {
            // setError('Failed to fetch coordinates for the given address');
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
            setLocations(response.data.slice(0, 5)); // Take only the first 5 locations
        } catch (err) {
            // setError('Failed to fetch nearby locations');
        }
    };

    const fetchDirections = async (location) => {
        // Use userLocation here safely after declaration
        const currentLocation = useCurrentLocation ? userLocation : manualLocation;
        if (!currentLocation) {
            setError('Current location is not available.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/get-directions', {
                user_location: currentLocation,
                destination: {
                    lat: location.latitude,
                    lon: location.longitude,
                },
            });
            setDirections(response.data.directions);
        } catch (err) {
            // setError('Failed to fetch directions');
        }
    };

    const handleAddressChange = (e) => setManualAddress(e.target.value);

    // Define custom icons
    const userIcon = new L.Icon({
        iconUrl: redMarker,
        iconSize: [25, 25],
        iconAnchor: [12, 25],
    });

    const locationIcon = new L.Icon({
        iconUrl: blueMarker,
        iconSize: [25, 25],
        iconAnchor: [12, 25],
    });

    const MapPan = ({ userLocation }) => {
        const map = useMap();

        useEffect(() => {
            if (userLocation) {
                map.setView([userLocation.lat, userLocation.lon], map.getZoom());
            }
        }, [userLocation, map]);

        return null;
    };

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
                <div>
                    <p>Lat: {userLocation.lat}, Lon: {userLocation.lon}</p>
                    <MapContainer center={[userLocation.lat, userLocation.lon]} zoom={13} style={{ height: '400px', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
                            <Popup>Your Location</Popup>
                        </Marker>
                        {locations.map((loc) => (
                            <Marker
                                key={loc.IndexName}
                                position={[loc.latitude, loc.longitude]}
                                icon={locationIcon}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedLocation(loc);
                                        fetchDirections(loc);
                                    },
                                }}
                            >
                                <Popup>
                                    <h3>{loc.Name}</h3>
                                    <p>{loc.AddressName}</p>
                                    <a href={loc.Hyperlink}>Visit Website</a>
                                </Popup>
                            </Marker>
                        ))}
                        <MapPan userLocation={userLocation} />
                    </MapContainer>
                </div>
            )}

            {directions.length > 0 && (
                <div className="directions-box">
                    <h3>Directions:</h3>
                    <ol>
                        {directions.map((step, index) => (
                            <li key={index} dangerouslySetInnerHTML={{ __html: step }} />
                        ))}
                    </ol>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
