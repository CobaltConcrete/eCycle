import React from 'react';

export default function TransportIcon({ mode }) {
    const paths = {
        DRIVING: <><path d="m5 10 2-5h10l2 5M4 10h16v8H4zM6 18v2m12-2v2M7 14h2m6 0h2" /></>,
        WALKING: <><circle cx="13" cy="4" r="2" /><path d="m10 21 3-7-3-4 2-3 3 4 4 2M5 12l4-4 3-1m1 7 4 7M10 10l-2 6-3 4" /></>,
        BICYCLING: <><circle cx="5" cy="16" r="4" /><circle cx="19" cy="16" r="4" /><path d="m5 16 5-8 4 8H5m9 0 3-10h3M8 8h5" /></>,
        TRANSIT: <><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M5 11h14M9 15h.01M15 15h.01M8 19l-2 3m10-3 2 3M9 6h6" /></>,
    };
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[mode]}</svg>;
}
