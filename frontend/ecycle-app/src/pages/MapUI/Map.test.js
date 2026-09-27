import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MapPage from './Map';
import api from '../../components/api';
import { loadMaps, locateDevice } from '../../components/mapServices';

jest.mock('../../components/api', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../../components/AuthContext', () => ({ useAuth: () => ({ user: { userid: 1, usertype: 'user' } }) }));
jest.mock('../../components/mapServices', () => ({
    ...jest.requireActual('../../components/mapServices'), loadMaps: jest.fn(), locateDevice: jest.fn(),
}));

const place = { shopid: 4, shopname: 'Repair shop', latitude: 1.3, longitude: 103.8, addressname: 'Shop address', distance: 2 };
const recent = { shopid: 7, shopname: 'Previous shop', lat: 1.4, lon: 103.9, addressname: 'Previous address', distance: 3 };
const route = { encodedPolyline: 'test-line', directions: ['Turn left'], distanceMeters: 2000, duration: '300s', warnings: ['Route warning'] };
let sdk;

beforeEach(() => {
    jest.clearAllMocks();
    const map = { fitBounds: jest.fn(), setCenter: jest.fn(), setZoom: jest.fn() };
    sdk = {
        Map: jest.fn(() => map), InfoWindow: jest.fn(() => ({ close: jest.fn(), open: jest.fn(), setContent: jest.fn() })),
        Marker: jest.fn(() => ({ setMap: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) })),
        LatLngBounds: jest.fn(() => ({ extend: jest.fn() })),
        Polyline: jest.fn(() => ({ setMap: jest.fn() })),
        geometry: { encoding: { decodePath: jest.fn(() => [{ lat: 0, lng: 0 }, { lat: 1.3, lng: 103.8 }]) } },
    };
    loadMaps.mockResolvedValue(sdk);
    locateDevice.mockResolvedValue({ lat: 0, lng: 0, accuracy: 15 });
    api.get.mockResolvedValue({ data: { history: [recent] } });
    api.post.mockImplementation(async path => {
        if (path === '/nearby-locations') return { data: [place] };
        if (path === '/get-coordinates') return { data: { lat: 1.2, lng: 103.7 } };
        if (path === '/get-directions') return { data: route };
        return { data: {} };
    });
});

function page() {
    return render(<MemoryRouter initialEntries={['/map/repair']}><Routes><Route path="/map/:type" element={<MapPage />} /></Routes></MemoryRouter>);
}

async function searchDevice() {
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    return screen.findByRole('button', { name: 'Directions to Repair shop' });
}

test('requests location only on demand, accepts zero coordinates and keeps one map instance', async () => {
    page();
    expect(locateDevice).not.toHaveBeenCalled();
    const destination = await searchDevice();
    expect(api.post).toHaveBeenCalledWith('/nearby-locations', expect.objectContaining({ lat: 0, lon: 0 }), expect.anything());
    expect(api.get).toHaveBeenCalledWith('/get-history', expect.objectContaining({ params: { userid: 1, lat: 0, lon: 0 } }));
    fireEvent.click(destination);
    expect(await screen.findByText('Turn left')).toBeInTheDocument();
    expect(screen.getByText('Route warning')).toBeInTheDocument();
    await waitFor(() => expect(sdk.geometry.encoding.decodePath).toHaveBeenCalledWith('test-line'));
    expect(sdk.Map).toHaveBeenCalledTimes(1);
    expect(sdk.Marker).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Your starting point', icon: expect.objectContaining({ fillColor: '#2563eb' }),
    }));
});

test('radius starts at ten matches and expands/shrinks without another search request', async () => {
    const original = api.post.getMockImplementation();
    api.post.mockImplementation((path, body, options) => path === '/nearby-locations'
        ? Promise.resolve({ data: Array.from({ length: 15 }, (_, i) => ({ ...place, shopid: i + 1, shopname: `Place ${i + 1}`, distance: i + 1 })) })
        : original(path, body, options));
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    await screen.findByText('10 matching places within 10.0 km');
    const slider = screen.getByRole('slider', { name: /Search radius/ });
    expect(slider).toHaveValue('10');
    fireEvent.change(slider, { target: { value: '15' } });
    expect(screen.getByText('15 matching places within 15.0 km')).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '0.1' } });
    expect(screen.getByText('0 matching places within 0.1 km')).toBeInTheDocument();
    expect(api.post.mock.calls.filter(([path]) => path === '/nearby-locations')).toHaveLength(1);
});

test('manual origin drives nearby search, history routes and mode changes', async () => {
    page();
    fireEvent.click(screen.getByLabelText('Enter an address'));
    fireEvent.change(screen.getByLabelText('Address or postal code'), { target: { value: 'Test address' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find locations' }));
    await screen.findByRole('button', { name: 'Directions to Repair shop' });
    expect(api.get).toHaveBeenCalledWith('/get-history', expect.objectContaining({ params: { userid: 1, lat: 1.2, lon: 103.7 } }));
    fireEvent.click(screen.getByText('Recently viewed places'));
    fireEvent.click(await screen.findByRole('button', { name: 'Revisit Previous shop' }));
    await screen.findByText('Turn left');
    fireEvent.click(screen.getByRole('radio', { name: 'Train' }));
    expect(screen.getByRole('radio', { name: 'Train' })).toBeChecked();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/get-directions', {
        user_location: { lat: 1.2, lon: 103.7 }, destination: { lat: 1.4, lon: 103.9 }, mode: 'TRANSIT',
    }, expect.anything()));
    await waitFor(() => expect(screen.queryByText('Loading directions...')).not.toBeInTheDocument());
    expect(locateDevice).not.toHaveBeenCalled();
});

test('permission denial gives a manual fallback without calling nearby search', async () => {
    locateDevice.mockRejectedValue(new Error('Location permission was denied. Enter an address.'));
    page(); fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('permission was denied');
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Enter an address')).toBeEnabled();
});

test('late device lookup cannot overwrite an address search', async () => {
    let complete;
    locateDevice.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    page(); fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    fireEvent.click(screen.getByLabelText('Enter an address'));
    fireEvent.change(screen.getByLabelText('Address or postal code'), { target: { value: 'New address' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find locations' }));
    await screen.findByRole('button', { name: 'Directions to Repair shop' });
    await act(async () => complete({ lat: 55, lng: 55 }));
    expect(screen.getByText(/Search origin: 1.20000, 103.70000/)).toBeInTheDocument();
    expect(api.post.mock.calls.filter(([path]) => path === '/nearby-locations')).toHaveLength(1);
});

test('late route responses cannot overwrite a newer mode and old polylines are removed', async () => {
    let oldResponse;
    const original = api.post.getMockImplementation();
    api.post.mockImplementation((path, body, options) => path === '/get-directions' && body.mode === 'DRIVING'
        ? new Promise(resolve => { oldResponse = resolve; }) : original(path, body, options));
    page(); fireEvent.click(await searchDevice());
    await waitFor(() => expect(oldResponse).toBeDefined());
    fireEvent.click(screen.getByRole('radio', { name: 'Walking' }));
    await screen.findByText('Turn left');
    await act(async () => oldResponse({ data: { ...route, directions: ['Obsolete driving directions'] } }));
    expect(screen.queryByText('Obsolete driving directions')).not.toBeInTheDocument();
    await waitFor(() => expect(sdk.Polyline).toHaveBeenCalled());
    const line = sdk.Polyline.mock.results[0].value;
    fireEvent.click(screen.getByLabelText('Enter an address'));
    await waitFor(() => expect(line.setMap).toHaveBeenCalledWith(null));
    expect(screen.queryByText('Turn left')).not.toBeInTheDocument();
});

test('map failure leaves search usable and route failures can be retried', async () => {
    loadMaps.mockRejectedValue(new Error('Map unavailable'));
    const original = api.post.getMockImplementation();
    api.post.mockImplementation((path, body, options) => path === '/get-directions'
        ? Promise.reject({ response: { data: { detail: 'No route found' } } }) : original(path, body, options));
    page(); fireEvent.click(await searchDevice());
    expect(await screen.findByText('No route found')).toBeInTheDocument();
    expect(screen.getByText('Map unavailable')).toBeInTheDocument();
    api.post.mockImplementation(original);
    fireEvent.click(screen.getByRole('button', { name: 'Retry directions' }));
    expect(await screen.findByText('Turn left')).toBeInTheDocument();
});
