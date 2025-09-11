import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    const [activeIndex, setActiveIndex] = useState(null);
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(null);
    const [manualAddress, setManualAddress] = useState('');
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [error, setError] = useState('');
    const [map, setMap] = useState(null);
    const [directionsRenderer, setDirectionsRenderer] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [isVerified, setIsVerified] = useState(false);
    const [selectedTransportMode, setSelectedTransportMode] = useState(transportMode);
    const [markers, setMarkers] = useState([]);
    const [nearbyMarkers, setNearbyMarkers] = useState([]);
    const [historyMarkers, setHistoryMarkers] = useState([]);
    const [history, setHistory] = useState([]);
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
    const [isLocationsOpen, setIsLocationsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const mapRef = useRef(null);
    const infoWindowRef = useRef(null);
    const navigate = useNavigate();
    const userid = localStorage.getItem('userid');
    const usertype = localStorage.getItem('usertype');
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

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
                infoWindowRef.current = new window.google.maps.InfoWindow();
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
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify`, {
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

    useEffect(() => {
        if (window.google) {
            initializeMap();
        } else {
            console.error("Google Maps API is not loaded.");
        }
    }, []);

    const initializeMap = () => {
        const map = new window.google.maps.Map(document.getElementById('map'), {
            center: { lat: 0, lng: 0 }, // Replace with your desired coordinates
            zoom: 13,
        });

        mapRef.current = map;

        // Initialize a single InfoWindow instance after Google Maps is ready
        infoWindowRef.current = new window.google.maps.InfoWindow();
    };

    const fetchNearbyLocations = useCallback(async (lat, lng) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/nearby-locations`, {
                lat,
                lon: lng,
                actiontype: type,
                userid: userid
            });
            setLocations(response.data.slice(0, 5));
            addMarkersToMap(response.data.slice(0, 5));
        } catch (err) {
            window.alert('Failed to fetch nearby locations');
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
    //                     window.alert('Failed to retrieve your current location');
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
                        window.alert('Failed to retrieve your current location: ' + error.message);
                    });
            });
        }
    }, [isVerified, useCurrentLocation, loadMap]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (userLocation && userLocation.lat && userLocation.lng) {
                try {
                    const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-history`, {
                        params: { 
                            userid,
                            lat: userLocation.lat,
                            lon: userLocation.lng
                        }
                    });
                    setHistory(response.data.history);
                } catch (error) {
                    console.error("Error fetching history:", error.response ? error.response.data.message : error.message);
                }
            }
        };

        if (isVerified) {
            fetchHistory();
        }
    }, [userid, isVerified, userLocation]);

    // useEffect(() => {
    //     const fetchHistory = async () => {
    //         try {
    //             const response = await axios.get(`/get-history`, { params: { userid } });
    //             setHistory(response.data.history);
    //         } catch (error) {
    //             console.error("Error fetching history:", error.response ? error.response.data.message : error.message);
    //         }
    //     };

    //     fetchHistory();
    // }, [userid]);

const addMarkersToMap = (locations) => {
    // Initialize the map with the user's current location
    const map = new window.google.maps.Map(document.getElementById('map'), {
        center,
        zoom: 13,
    });

    mapRef.current = map;

    const newMarkers = [];
    const bounds = new window.google.maps.LatLngBounds();

    const userMarker = new window.google.maps.Marker({
        map,
        position: center,
        title: "You are here!",
        clickable: true,
    });
    newMarkers.push(userMarker);
    bounds.extend(center);

    // const infoWindow = new window.google.maps.InfoWindow();

    if (!directionsService) {
        directionsService = new window.google.maps.DirectionsService();
    }
    const directionsRenderer = new window.google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    setDirectionsRenderer(directionsRenderer);

    // Loop through locations and add markers
    locations.forEach((location) => {
        const markerPosition = { lat: location.latitude, lng: location.longitude };
        const marker = new window.google.maps.Marker({
            map,
            position: markerPosition,
            title: location.Name,
            icon: new window.google.maps.MarkerImage('http://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_green.png'),
            clickable: true,
        });

        const infoWindow = new window.google.maps.InfoWindow();

        bounds.extend(markerPosition);
        newMarkers.push(marker);

        marker.addListener('click', async () => {
            loc = location;

            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/add-history`, {
                    userid: localStorage.getItem('userid'),
                    shopid: location.shopid,
                });
                console.log(response.data.message);
            } catch (error) {
                console.error("Error adding history entry:", error);
            }

            // Clear previous directions if they exist
            if (directionsRenderer) {
                directionsRenderer.set('directions', null);
            }

            // Request directions to the selected location
            directionsService.route(
                {
                    origin: center,
                    destination: markerPosition,
                    travelMode: transportMode,
                    transitOptions: { routingPreference: 'LESS_WALKING' },
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

            infoWindowRef.current.close();
            infoWindowRef.current.setContent(`
                <div class="location-info">
                    <h3 class="shop-name">${location.shopname}</h3>
                    <p class="shop-address">${location.addressname}</p>
                    <p class="shop-address"> Distance: ${loc.distance} km</p>
                    <a href="${location.website}" target="_blank" class="website-link">Visit Website</a>
                    <br />
                    <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}" target="_blank" class="maps-link">
                        View on Google Maps
                    </a>
                    <br />
                    <div class="forum-button-container">
                        <button class="forum-button" onclick="window.location.href='/forums/${location.shopid}'">
                            Visit Forum
                        </button>
                    </div>
                </div>
            `);

            infoWindowRef.current.open(map, marker);   
        });
    });

    // Adjust map to fit all markers within the view with padding
    const padding = 20; // Adjust padding as needed
    map.fitBounds(bounds, { top: padding, right: padding, bottom: padding, left: padding });

    // Update markers state
    setMarkers(newMarkers);
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
            if (!address) {
                window.alert('Address cannot be empty');
                return;
            }

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/get-coordinates`, { address });
            const { lat, lon } = response.data;

            setManualLocation({ lat, lng: lon });
            loadMap(lat, lon);

        } catch (err) {
            if (!isNaN(address)) {
                window.alert('Invalid Postal Code');
            } else {
                window.alert('Invalid Address');
            }
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

    const handleInstructionsToggle = () => {
        setIsInstructionsOpen(!isInstructionsOpen); // Toggle instructions
    };

    const handleLocationsToggle = () => {
        setIsLocationsOpen(!isLocationsOpen);
    };

    const handleHistoryToggle = () => {
        setIsHistoryOpen(!isHistoryOpen);
    };

    const handleLocationClick = (location, index) => {
        const marker = markers[index+1];
        window.google.maps.event.trigger(marker, 'click');
    };

    const handleItemClick = (location, index) => {
        setActiveIndex(index);
        handleLocationClick(location, index);
    };

const handleHistoryItemClick = (entry, index) => {
    const lat = entry.lat;
    const lon = entry.lon;
    setActiveHistoryIndex(index);

    // Add a new marker at the history location
    const newMarker = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat, lng: lon },
        title: entry.Name || "History Location",
        icon: new window.google.maps.MarkerImage('http://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_green.png'),
        clickable: true,
    });

    const infoWindow = new window.google.maps.InfoWindow();

    setMarkers((prevMarkers) => [...prevMarkers, newMarker]);

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(new window.google.maps.LatLng(center.lat, center.lng));
    bounds.extend(new window.google.maps.LatLng(lat, lon));
    mapRef.current.fitBounds(bounds);

    newMarker.addListener('click', async () => {
        const loc = entry;

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/add-history`, {
                userid: localStorage.getItem('userid'),
                shopid: loc.shopid,
            });
            console.log(response.data.message);
        } catch (error) {
            console.error("Error adding history entry:", error);
        }

        // Clear previous directions if they exist
        if (directionsRenderer) {
            directionsRenderer.set('directions', null);
        }

        // Request directions to the selected location
        directionsService.route(
            {
                origin: center,
                destination: { lat: loc.lat, lng: loc.lon }, // Corrected property names
                travelMode: transportMode,
                transitOptions: { routingPreference: 'LESS_WALKING' },
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

        infoWindowRef.current.close();
        infoWindowRef.current.setContent(`
            <div class="location-info">
                <h3 class="shop-name">${loc.shopname}</h3>
                <p class="shop-address">${loc.addressname}</p>
                <p class="shop-address"> Distance: ${loc.distance} km</p>
                <a href="${loc.website}" target="_blank" class="website-link">Visit Website</a>
                <br />
                <a href="https://www.google.com/maps?q=${loc.lat},${loc.lon}" target="_blank" class="maps-link">
                    View on Google Maps
                </a>
                <br />
                <div class="forum-button-container">
                    <button class="forum-button" onclick="window.location.href='/forums/${loc.shopid}'">
                        Visit Forum
                    </button>
                </div>
            </div>
        `);

        infoWindowRef.current.open(mapRef.current, newMarker);

    });
    infoWindowRef.current.close();
    window.google.maps.event.trigger(newMarker, 'click');
};

    return (
        <div>
            <div className="user-info">
                <p>Role: <u>{current_role}</u> | Username: <u>{current_username}</u> | Points: <u>{current_points}</u></p>
            </div>
            <h2>Find Nearest {type === 'repair' ? 'Repair' : type === 'dispose' ? 'Disposal' : 'General Waste Disposal'} Locations</h2>

            <div className="pills-container">
                <ul className="nav nav-pills mb-3" id="pills-tab" role="tablist">
                    <li className="nav-item" role="presentation">
                        <a
                            className={`nav-link ${useCurrentLocation ? 'active' : ''}`}
                            onClick={() => setUseCurrentLocation(true)}
                            href="#"
                        >
                            Use Current Location
                        </a>
                    </li>
                    <li className="nav-item" role="presentation">
                        <a
                            className={`nav-link ${!useCurrentLocation ? 'active' : ''}`}
                            onClick={() => setUseCurrentLocation(false)}
                            href="#"
                        >
                            Enter Location Manually
                        </a>
                    </li>
                </ul>
            </div>

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
                    <div className="instructions-container">
                        <h3 onClick={handleInstructionsToggle} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <span className={`arrow ${isInstructionsOpen ? 'expanded' : 'collapsed'}`}>▶</span>
                            Directions Instructions
                        </h3>
                        {isInstructionsOpen && (
                            <div className="scrollable-content">
                                <ol>
                                    {instructions.map((step, index) => (
                                        <li key={index}>{step.instructions.replace(/<[^>]*>/g, '')}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                )}

                <div className="location-details">
                    <h2 onClick={handleLocationsToggle} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <span className={`arrow ${isLocationsOpen ? 'expanded' : 'collapsed'}`}>▶</span>
                        Nearby Locations Details
                    </h2>
                    {isLocationsOpen && (
                        <div className="scrollable-content">
                            <ul>
                                {locations.map((location, index) => (
                                    <li
                                        key={index}
                                        onClick={() => handleItemClick(location, index)}
                                        className={activeIndex === index ? 'active' : ''}
                                    >
                                        <h3>{location.shopname}</h3>
                                        <p>{location.addressname}</p>
                                        <p>Distance: {location.distance} km</p>
                                        <a href={location.website} target="_blank" rel="noopener noreferrer">
                                            Visit Website
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

<div className="history-details">
    <h2 onClick={handleHistoryToggle} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <span className={`arrow ${isHistoryOpen ? 'expanded' : 'collapsed'}`}>▶</span>
        History
    </h2>
    {isHistoryOpen && (
        <div className="scrollable-content">
            <ul>
                {history.length > 0 ? (
                    history.map((entry, index) => (
                        <li
                            key={index}
                            onClick={() => handleHistoryItemClick(entry, index)}
                            className={activeHistoryIndex === index ? 'active' : ''}
                        >
                            <h3>{entry.shopname}</h3>
                            <p>{entry.addressname}</p>
                            <p>Distance: {entry.distance} km</p>
                            <p>Visited on: {entry.time}</p>
                            <a href={entry.website} target="_blank" rel="noopener noreferrer">
                                Visit Website
                            </a>
                        </li>
                    ))
                ) : (
                    <p>No history available.</p>
                )}
            </ul>
        </div>
    )}
</div>

            </div>

            <div className="button-container">
                {usertype === 'shop' && (
                    <button className="back-button" onClick={() => navigate(`/forums/${userid}`)}>
                        Back to Forums
                    </button>
                )}

                {usertype !== 'shop' && (
                    <button className="back-button" onClick={() => navigate('/select-waste')}>
                        Back to Waste Selection
                    </button>
                )}

                {usertype === 'admin' && (
                    <button className="reportpage-button" onClick={() => navigate('/report')}>
                        Back to Report Page
                    </button>
                )}
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Map;
