let mapsPromise;
let callbackId = 0;

export function loadMaps() {
    if (window.google?.maps?.geometry?.encoding) return Promise.resolve(window.google.maps);
    if (mapsPromise) return mapsPromise;
    const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!key) return Promise.reject(new Error('Map display is not configured. You can still search for locations.'));
    mapsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callback = `ecycleMapsReady${++callbackId}`;
        const cleanup = () => { clearTimeout(timer); delete window[callback]; };
        const fail = () => {
            cleanup(); script.remove(); mapsPromise = undefined;
            reject(new Error('Unable to load the map. Check your connection and browser-key restrictions, then retry.'));
        };
        const timer = setTimeout(fail, 20000);
        window[callback] = () => {
            if (!window.google?.maps?.geometry?.encoding) { fail(); return; }
            cleanup(); resolve(window.google.maps);
        };
        script.id = 'ecycle-google-maps';
        script.async = true;
        script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, libraries: 'geometry', loading: 'async', callback, v: 'weekly' })}`;
        script.onerror = fail;
        document.head.appendChild(script);
    });
    return mapsPromise;
}

export function locateDevice() {
    if (window.isSecureContext === false) {
        return Promise.reject(new Error('Location access requires HTTPS or localhost. Enter an address instead.'));
    }
    if (!navigator.geolocation) {
        return Promise.reject(new Error('Your browser does not support location access. Enter an address instead.'));
    }
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
        error => reject(new Error({
            1: 'Location permission was denied. Allow location access in your browser or enter an address.',
            2: 'Your location is unavailable. Try again or enter an address.',
            3: 'Location lookup timed out. Try again or enter an address.',
        }[error.code] || 'Unable to determine your location. Enter an address instead.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    ));
}

export function apiMessage(error, fallback) {
    const message = error.response?.data?.detail || error.response?.data?.error;
    return typeof message === 'string' ? message : fallback;
}

export function normalizeLocation(location) {
    return { ...location, latitude: location.latitude ?? location.lat, longitude: location.longitude ?? location.lon };
}
