import { locateDevice, normalizeLocation } from './mapServices';

afterEach(() => {
    jest.restoreAllMocks();
    delete navigator.geolocation;
    delete window.isSecureContext;
});

test('device coordinates and accuracy are returned with bounded permission-based lookup', async () => {
    const getCurrentPosition = jest.fn(success => success({ coords: { latitude: 0, longitude: 0, accuracy: 8 } }));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    await expect(locateDevice()).resolves.toEqual({ lat: 0, lng: 0, accuracy: 8 });
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
});

test.each([[1, 'permission was denied'], [2, 'unavailable'], [3, 'timed out']])('explains location failure %i', async (code, message) => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success, fail) => fail({ code }) } });
    await expect(locateDevice()).rejects.toThrow(message);
});

test('unsupported and insecure browsers get a manual-address fallback', async () => {
    await expect(locateDevice()).rejects.toThrow('does not support');
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    await expect(locateDevice()).rejects.toThrow('HTTPS or localhost');
});

test('history coordinates normalize without discarding zero values', () => {
    expect(normalizeLocation({ lat: 0, lon: 0 })).toEqual({ lat: 0, lon: 0, latitude: 0, longitude: 0 });
});

test('concurrent SDK loads share a promise and wait for the ready callback', async () => {
    jest.resetModules();
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'fixture-browser-key';
    const { loadMaps } = require('./mapServices');
    const first = loadMaps();
    expect(loadMaps()).toBe(first);
    const script = document.getElementById('ecycle-google-maps');
    const url = new URL(script.src);
    expect(url.searchParams.get('libraries')).toBe('geometry');
    window.google = { maps: { geometry: { encoding: {} } } };
    window[url.searchParams.get('callback')]();
    await expect(first).resolves.toBe(window.google.maps);
    script.remove(); delete window.google; delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
});

test('a failed SDK download can be retried', async () => {
    jest.resetModules();
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'fixture-browser-key';
    const { loadMaps } = require('./mapServices');
    const first = loadMaps();
    const failure = expect(first).rejects.toThrow('Unable to load');
    document.getElementById('ecycle-google-maps').onerror();
    await failure;
    const second = loadMaps();
    expect(second).not.toBe(first);
    const script = document.getElementById('ecycle-google-maps');
    const callback = new URL(script.src).searchParams.get('callback');
    window.google = { maps: { geometry: { encoding: {} } } };
    window[callback](); await second;
    script.remove(); delete window.google; delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
});
