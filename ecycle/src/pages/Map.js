import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import redMarker from '../images/redmarker.png';
import blueMarker from '../images/bluemarker.png';

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
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    setUserLocation({ lat, lon });
                    console.log(`Current Location: Lat: ${lat}, Lon: ${lon}`);
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
            console.log(`Fetched Coordinates: Lat: ${lat}, Lon: ${lon}`);
        } catch (err) {
            // setError('Failed to fetch coordinates for the given address: ' + err.message);
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
            // Reset map center to user location
            if (userLocation) {
                console.log(`User Location: Lat: ${userLocation.lat}, Lon: ${userLocation.lon}`);
            }
        } catch (err) {
            setError('Failed to fetch nearby locations');
        }
    };

    const handleAddressChange = (e) => setManualAddress(e.target.value);

    // Define custom icons
    const userIcon = new L.Icon({
        iconUrl: redMarker, // Use your imported image for user location
        iconSize: [25, 25], // Size of the icon
        iconAnchor: [12, 25], // Point of the icon which will correspond to marker's location
    });

    const locationIcon = new L.Icon({
        iconUrl: blueMarker, // Use your imported image for nearby locations
        iconSize: [25, 25], // Size of the icon
        iconAnchor: [12, 25], // Point of the icon which will correspond to marker's location
    });

    // Custom component to pan the map
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
                            <Marker key={loc.IndexName} position={[loc.latitude, loc.longitude]} icon={locationIcon}>
                                <Popup>
                                    <h3>{loc.Name}</h3>
                                    <p>{loc.AddressName}</p>
                                    <a href={loc.Hyperlink}>Visit Website</a>
                                </Popup>
                            </Marker>
                        ))}
                        {/* Include the MapPan component to handle panning */}
                        <MapPan userLocation={userLocation} />
                    </MapContainer>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
