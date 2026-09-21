import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../components/api';
import { useAuth } from '../../components/AuthContext';
import { locationPopup } from '../../components/locationPopup';
import { loadMaps, locateDevice, normalizeLocation, apiMessage } from '../../components/mapServices';
import './Map.css';

export default function MapPage() {
    const { type } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userid = user?.userid;
    const [source, setSource] = useState('device');
    const [address, setAddress] = useState('');
    const [origin, setOrigin] = useState(null);
    const [locations, setLocations] = useState([]);
    const [history, setHistory] = useState([]);
    const [selected, setSelected] = useState(null);
    const [mode, setMode] = useState('DRIVING');
    const [route, setRoute] = useState(null);
    const [busy, setBusy] = useState(false);
    const [searching, setSearching] = useState(false);
    const [routing, setRouting] = useState(false);
    const [error, setError] = useState('');
    const [routeError, setRouteError] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [mapError, setMapError] = useState('');
    const [maps, setMaps] = useState(null);
    const [mapAttempt, setMapAttempt] = useState(0);
    const [routeAttempt, setRouteAttempt] = useState(0);
    const [historyRevision, setHistoryRevision] = useState(0);
    const node = useRef(null);
    const mapRef = useRef(null);
    const infoRef = useRef(null);
    const searchId = useRef(0);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; searchId.current += 1; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setMapError('');
        const previousAuthFailure = window.gm_authFailure;
        const authFailure = () => {
            if (!cancelled) setMapError('Google could not authorize the map. Check Maps JavaScript API, billing and browser-key restrictions.');
            if (previousAuthFailure) previousAuthFailure();
        };
        window.gm_authFailure = authFailure;
        loadMaps().then(sdk => {
            if (cancelled) return;
            mapRef.current = new sdk.Map(node.current, { center: { lat: 1.3521, lng: 103.8198 }, zoom: 12 });
            infoRef.current = new sdk.InfoWindow();
            setMaps(sdk);
        }).catch(err => { if (!cancelled) setMapError(err.message); });
        return () => {
            cancelled = true;
            if (window.gm_authFailure === authFailure) window.gm_authFailure = previousAuthFailure;
            infoRef.current?.close();
            mapRef.current = null;
        };
    }, [mapAttempt]);

    function clearOrigin() {
        searchId.current += 1;
        setBusy(false); setOrigin(null); setSelected(null); setLocations([]); setHistory([]);
        setError(''); setRouteError(''); setHistoryError('');
    }

    async function search(event) {
        event.preventDefault();
        clearOrigin();
        const requestId = searchId.current;
        setBusy(true);
        try {
            let position;
            if (source === 'device') position = await locateDevice();
            else {
                if (!address.trim()) throw new Error('Enter an address or postal code.');
                const result = await api.post('/get-coordinates', { address: address.trim() });
                position = result.data;
            }
            if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) throw new Error('No valid coordinates were returned. Try another address.');
            if (requestId === searchId.current) setOrigin(position);
        } catch (err) {
            if (requestId === searchId.current) setError(apiMessage(err, err.message || 'Unable to find your location.'));
        } finally {
            if (requestId === searchId.current) setBusy(false);
        }
    }

    useEffect(() => {
        setLocations([]); setSelected(null); setError('');
        if (!origin || !userid) { setSearching(false); return; }
        let cancelled = false;
        const controller = new AbortController();
        setSearching(true);
        api.post('/nearby-locations', { userid, lat: origin.lat, lon: origin.lng, actiontype: type }, { signal: controller.signal })
            .then(({ data }) => { if (!cancelled) setLocations(data.map(normalizeLocation)); })
            .catch(err => { if (!cancelled) setError(apiMessage(err, 'Unable to load nearby locations. Please search again.')); })
            .finally(() => { if (!cancelled) setSearching(false); });
        return () => { cancelled = true; controller.abort(); };
    }, [origin, userid, type]);

    useEffect(() => {
        if (!origin || !userid) return;
        let cancelled = false;
        const controller = new AbortController();
        api.get('/get-history', { params: { userid, lat: origin.lat, lon: origin.lng }, signal: controller.signal })
            .then(({ data }) => { if (!cancelled) setHistory(data.history.map(normalizeLocation)); })
            .catch(() => { if (!cancelled) setHistoryError('Unable to load your recent places.'); });
        return () => { cancelled = true; controller.abort(); };
    }, [origin, userid, historyRevision]);

    const selectLocation = useCallback(location => {
        setSelected(normalizeLocation(location)); setHistoryError('');
        api.post('/add-history', { userid, shopid: location.shopid })
            .then(() => { if (mounted.current) setHistoryRevision(value => value + 1); })
            .catch(() => { if (mounted.current) setHistoryError('Directions are still available, but this place could not be saved to history.'); });
    }, [userid]);

    useEffect(() => {
        if (!maps || !mapRef.current) return;
        infoRef.current?.close();
        if (!origin) return;
        const markers = [];
        const bounds = new maps.LatLngBounds();
        markers.push(new maps.Marker({ map: mapRef.current, position: origin, title: 'Search origin' }));
        bounds.extend(origin);
        const visible = [...locations];
        if (selected && !visible.some(place => place.shopid === selected.shopid)) visible.push(selected);
        visible.forEach(place => {
            const position = { lat: place.latitude, lng: place.longitude };
            const marker = new maps.Marker({ map: mapRef.current, position, title: place.shopname });
            const listener = marker.addListener('click', () => selectLocation(place));
            marker.ecycleListener = listener;
            markers.push(marker); bounds.extend(position);
            if (selected?.shopid === place.shopid) {
                infoRef.current.setContent(locationPopup(place, shopid => navigate(`/forums/${shopid}`)));
                infoRef.current.open(mapRef.current, marker);
            }
        });
        if (!selected) {
            if (visible.length) mapRef.current.fitBounds(bounds, 32);
            else { mapRef.current.setCenter(origin); mapRef.current.setZoom(13); }
        }
        return () => markers.forEach(marker => { marker.ecycleListener?.remove(); marker.setMap(null); });
    }, [maps, origin, locations, selected, selectLocation, navigate]);

    useEffect(() => {
        setRoute(null); setRouteError('');
        if (!origin || !selected) { setRouting(false); return; }
        let cancelled = false;
        const controller = new AbortController();
        setRouting(true);
        api.post('/get-directions', {
            user_location: { lat: origin.lat, lon: origin.lng },
            destination: { lat: selected.latitude, lon: selected.longitude }, mode,
        }, { signal: controller.signal, timeout: 25000 })
            .then(({ data }) => { if (!cancelled) setRoute(data); })
            .catch(err => { if (!cancelled) setRouteError(apiMessage(err, 'Unable to load directions. Please retry.')); })
            .finally(() => { if (!cancelled) setRouting(false); });
        return () => { cancelled = true; controller.abort(); };
    }, [origin, selected, mode, routeAttempt]);

    useEffect(() => {
        if (!maps || !mapRef.current || !route) return;
        const path = maps.geometry.encoding.decodePath(route.encodedPolyline);
        const line = new maps.Polyline({ map: mapRef.current, path, strokeColor: '#176b45', strokeWeight: 5 });
        const bounds = new maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        if (path.length) mapRef.current.fitBounds(bounds, 32);
        return () => line.setMap(null);
    }, [maps, route]);

    const locationList = (items, prefix) => <ul className="map-place-list">{items.map(place => <li key={place.shopid}>
        <button type="button" aria-pressed={selected?.shopid === place.shopid} onClick={() => selectLocation(place)}>
            {prefix} {place.shopname}
        </button>
        <p>{place.addressname}</p><p>{place.distance} km straight-line distance</p>
        {place.time && <p>Last viewed: {place.time}</p>}
    </li>)}</ul>;

    return <section className="map-page">
        <h1>Find nearby {type === 'repair' ? 'repair shops' : type === 'dispose' ? 'disposal locations' : 'recycling locations'}</h1>
        <form onSubmit={search}>
            <fieldset><legend>Where are you starting from?</legend>
                <label><input type="radio" name="location-source" checked={source === 'device'} onChange={() => { clearOrigin(); setSource('device'); }} /> My current location</label>
                <label><input type="radio" name="location-source" checked={source === 'address'} onChange={() => { clearOrigin(); setSource('address'); }} /> Enter an address</label>
            </fieldset>
            {source === 'address' && <label>Address or postal code<input className="location-input" value={address} onChange={event => setAddress(event.target.value)} maxLength={255} required /></label>}
            <button className="find-locations-btn" disabled={busy || searching}>{busy ? 'Finding your location...' : searching ? 'Searching...' : source === 'device' ? 'Use my location' : 'Find locations'}</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {origin && <p>Search origin: {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}{Number.isFinite(origin.accuracy) ? ` (reported accuracy: ${Math.round(origin.accuracy)} m)` : ''}</p>}
        <label className="transport-mode-container">Transport mode <select value={mode} onChange={event => setMode(event.target.value)}>
            <option value="DRIVING">Driving</option><option value="WALKING">Walking</option><option value="BICYCLING">Bicycling</option><option value="TRANSIT">Transit</option>
        </select></label>
        {mapError && <div role="alert"><p>{mapError}</p><button onClick={() => { setMaps(null); setMapAttempt(value => value + 1); }}>Retry map</button></div>}
        <div ref={node} id="map" aria-label="Nearby places and route map" style={{ height: 400, width: '100%' }} />
        {selected && <h2>Directions to {selected.shopname}</h2>}
        {routing && <p role="status">Loading directions...</p>}
        {routeError && <div role="alert"><p>{routeError}</p><button onClick={() => setRouteAttempt(value => value + 1)}>Retry directions</button></div>}
        {route && <div className="instructions-container">
            <p>{(route.distanceMeters / 1000).toFixed(1)} km route; approximately {Math.ceil(parseFloat(route.duration) / 60)} minutes.</p>
            {route.description && <p>{route.description}</p>}
            {route.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
            {['WALKING', 'BICYCLING'].includes(mode) && <p>Walking and cycling routes may omit paths or sidewalks. Use caution and follow local signs.</p>}
            <details open><summary>Directions instructions</summary><ol>{route.directions.map((instruction, index) => <li key={index}>{instruction}</li>)}</ol>
                {!route.directions.length && <p>No detailed instructions were supplied for this route.</p>}
            </details>
        </div>}
        <details open className="location-details"><summary>Nearby places</summary>
            {!origin ? <p>Choose a starting point to find places.</p> : searching ? <p role="status">Finding matching places...</p> : !locations.length ? <p>No matching places found for this search.</p> : locationList(locations, 'Directions to')}
        </details>
        <details className="history-details"><summary>Recently viewed places</summary>
            {historyError && <p role="alert">{historyError}</p>}
            {history.length ? locationList(history, 'Revisit') : <p>No recent places for this account.</p>}
        </details>
        <div className="button-container"><button onClick={() => navigate(user?.usertype === 'shop' ? `/forums/${userid}` : '/select-waste')}>Back</button>
            {user?.usertype === 'admin' && <button onClick={() => navigate('/report')}>Review reports</button>}
        </div>
    </section>;
}
