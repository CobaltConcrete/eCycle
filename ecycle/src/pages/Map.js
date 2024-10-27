import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './Map.css';

let loc = null;
let center = null;
let directionsService = null;
let transportMode = window.google?.maps?.TravelMode?.DRIVING || 'DRIVING';

const Map = () => {
    const { type } = useParams();
    const [userLocation, setUserLocation] = useState(null);
    const [manualLocation, setManualLocation] = useState(null);
    const [locations, setLocations] = useState([]);
    const [manualAddress, setManualAddress] = useState('');
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [error, setError] = useState('');
    const [map, setMap] = useState(null);
    const [directionsRenderer, setDirectionsRenderer] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [isVerified, setIsVerified] = useState(false);
    const [selectedTransportMode, setSelectedTransportMode] = useState(transportMode);
    const navigate = useNavigate();
    const userid = localStorage.getItem('userid');

    // Function to load Google Maps script dynamically
    const loadGoogleMapsScript = (callback) => {
        const existingScript = document.getElementById('googleMaps');
        if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.id = 'googleMaps';
            document.body.appendChild(script);
            script.onload = () => {
                if (callback) callback();
            };
        } else {
            if (callback) callback();
        }
    };

    useEffect(() => {
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
                const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/verify`, {
                    userid,
                    username,
                    usertype,
                    userhashedpassword,
                });

                if (response.data.isValid) {
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

    const fetchNearbyLocations = useCallback(async (lat, lng) => {
        try {
            const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/nearby-locations`, {
                lat,
                lon: lng,
                actiontype: type,
                userid: userid
            });
            setLocations(response.data.slice(0, 5));
            addMarkersToMap(response.data.slice(0, 5));
        } catch (err) {
            setError('Failed to fetch nearby locations');
        }
    }, [type, userid]);

    const loadMap = useCallback((lat, lng) => {
        center = { lat, lng };

        const map = new window.google.maps.Map(document.getElementById('map'), {
            center,
            zoom: 13,
        });
        setMap(map);

        new window.google.maps.Marker({
            position: center,
            map,
            title: "You are here!",
        });

        fetchNearbyLocations(lat, lng);
    }, [fetchNearbyLocations]);

    // useEffect(() => {
    //     if (isVerified && useCurrentLocation && navigator.geolocation) {
    //         loadGoogleMapsScript(() => {
    //             navigator.geolocation.getCurrentPosition(
    //                 (position) => {
    //                     let { latitude, longitude } = position.coords;
    //                     setUserLocation({ lat: latitude, lng: longitude });
    //                     loadMap(latitude, longitude);
    //                 },
    //                 (error) => {
    //                     console.error("Error obtaining location", error);
    //                     setError('Failed to retrieve your current location');
    //                 }
    //             );
    //         });
    //     }
    // }, [isVerified, useCurrentLocation, loadMap]);

    useEffect(() => {
        if (isVerified && useCurrentLocation) {
            loadGoogleMapsScript(() => {
                const apiKey = 'YOUR_API_KEY';
                const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;

                fetch(url, {
                    method: 'POST'
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Failed to retrieve location");
                        }
                        return response.json();
                    })
                    .then(data => {
                        const { lat, lng } = data.location;
                        setUserLocation({ lat, lng });
                        loadMap(lat, lng);
                    })
                    .catch(error => {
                        console.error("Error obtaining location via Google API", error);
                        setError('Failed to retrieve your current location: ' + error.message);
                    });
            });
        }
    }, [isVerified, useCurrentLocation, loadMap]);

    const addMarkersToMap = (locations) => {
        const map = new window.google.maps.Map(document.getElementById('map'), {
            center,
            zoom: 13,
        });

        new window.google.maps.Marker({
            map,
            position: center,
            title: "You are here!",
            clickable: true
        });

        const infoWindow = new window.google.maps.InfoWindow();
        
        if (!directionsService) {
            directionsService = new window.google.maps.DirectionsService();
        }
        const directionsRenderer = new window.google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);
        setDirectionsRenderer(directionsRenderer);

        locations.forEach((location) => {
            const marker = new window.google.maps.Marker({
                map,
                position: { lat: location.latitude, lng: location.longitude },
                title: location.Name,
                icon: new window.google.maps.MarkerImage('http://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_green.png'),
                clickable: true
            });

            marker.addListener('click', () => {
                loc = location;

                if (directionsRenderer) {
                    directionsRenderer.set('directions', null);
                }

                directionsService.route(
                    {
                        origin: center,
                        destination: { lat: loc.latitude, lng: loc.longitude },
                        travelMode: transportMode, 
                        transitOptions: {
                            routingPreference: 'LESS_WALKING'
                        }
                    },
                    (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            directionsRenderer.setDirections(result);
                            setInstructions(result.routes[0].legs[0].steps);
                        } else {
                            console.error(`Directions request failed due to ${status}`);
                        }
                    }
                );

                infoWindow.setContent(`
                    <div class="location-info">
                        <h3 class="shop-name">${location.shopname}</h3>
                        <p class="shop-address">${location.addressname}</p>
                        <a href="${location.website}" target="_blank" class="website-link">Visit Website</a>
                        <br />
                        <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}" target="_blank" class="maps-link">
                            View on Google Maps
                        </a>
                        <br />
                        <div class="forum-button-container">
                            <button class="forum-button" onclick="window.open('/forums/${location.shopid}', '_blank')">
                                Visit Forum
                            </button>
                        </div>
                    </div>
                `);
                infoWindow.open(map, marker);   
            });
        });
    };

    const handleAddressChange = (e) => setManualAddress(e.target.value);

    const handleSearch = () => {
        if (useCurrentLocation && userLocation) {
            fetchNearbyLocations(userLocation.lat, userLocation.lng);
        } else {
            fetchCoordinatesFromAddress(manualAddress);
        }
    };

    const fetchCoordinatesFromAddress = async (address) => {
        try {
            const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/get-coordinates`, { address });
            const { lat, lon } = response.data;
            setManualLocation({ lat, lng: lon });
            loadMap(lat, lon);
        } catch (err) {
            setError('Failed to fetch coordinates for the given address');
        }
    };

    const handleTransportModeChange = (mode) => {
        transportMode = mode;
        setSelectedTransportMode(mode);

        if (loc) {
            if (directionsRenderer) {
                directionsRenderer.set('directions', null);
            }

            directionsService.route(
                {
                    origin: center,
                    destination: { lat: loc.latitude, lng: loc.longitude },
                    travelMode: transportMode, 
                    transitOptions: {
                        routingPreference: 'LESS_WALKING'
                    }
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRenderer.setDirections(result);
                        setInstructions(result.routes[0].legs[0].steps);
                    } else {
                        console.error(`Directions request failed due to ${status}`);
                    }
                }
            );
        }
    };

    return (
        <div>
            <h2>Find Nearest {type === 'repair' ? 'Repair' : type === 'dispose' ? 'Disposal' : 'General Waste Disposal'} Locations</h2>
            <ul className="nav nav-pills mb-3" id="pills-tab" role="tablist">
                <a className="nav-item" role="presentation">
                    <a
                        className={`nav-link ${useCurrentLocation ? 'active' : ''}`}
                        onClick={() => setUseCurrentLocation(true)}
                        href="#"
                    >
                        Use Current Location
                    </a>
                </a>
                <a className="nav-item" role="presentation">
                    <a
                        className={`nav-link ${!useCurrentLocation ? 'active' : ''}`}
                        onClick={() => setUseCurrentLocation(false)}
                        href="#"
                    >
                        Enter Location Manually
                    </a>
                </a>
            </ul>

            <div className="input-container" style={{ height: !useCurrentLocation ? '60px' : '0' }}>
                {!useCurrentLocation && (
                    <input
                        type="text"
                        placeholder="Enter address or postal code"
                        value={manualAddress}
                        onChange={handleAddressChange}
                        className="location-input"
                    />
                )}
            </div>

            <button className="find-locations-btn" onClick={handleSearch}>Find Locations</button>

            <div className="transport-mode-container">
                <label htmlFor="transportMode">Select Transport Mode: </label>
                <select
                    id="transportMode"
                    value={transportMode}
                    onChange={(e) => handleTransportModeChange(e.target.value)}
                    className="transport-mode-select"
                >
                    <option value={window.google?.maps?.TravelMode?.DRIVING}>Driving</option>
                    <option value={window.google?.maps?.TravelMode?.WALKING}>Walking</option>
                    <option value={window.google?.maps?.TravelMode?.BICYCLING}>Bicycling</option>
                    <option value={window.google?.maps?.TravelMode?.TRANSIT}>Transit</option>
                </select>
            </div>

            <div id="map" style={{ height: '400px', width: '100%' }}></div>

            <div>
                {instructions.length > 0 && (
                    <div className="instructions-container" style={{ fontSize: '0.8em' }}>
                        <h3>Directions Instructions:</h3>
                        <ol>
                            {instructions.map((step, index) => (
                                <li key={index}>{step.instructions.replace(/<[^>]*>/g, '')}</li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
