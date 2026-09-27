// Google Maps accepts a DOM node; never interpolate shop data into HTML.
export function locationPopup(location, onOpenForum) {
    const container = document.createElement('div');
    container.className = 'location-info';
    const kicker = document.createElement('p');
    kicker.className = 'popup-kicker';
    kicker.textContent = 'YOUR NEXT STOP';
    container.appendChild(kicker);
    for (const [tag, value] of [
        ['h3', location.shopname], ['p', location.addressname],
    ]) {
        const element = document.createElement(tag);
        element.textContent = value;
        container.appendChild(element);
    }
    if (Number.isFinite(location.distance)) {
        const distance = document.createElement('p');
        distance.className = 'popup-distance';
        distance.textContent = `${location.distance.toFixed(2)} km away · straight-line distance`;
        container.appendChild(distance);
    }
    const actions = document.createElement('div');
    actions.className = 'popup-actions';
    container.appendChild(actions);
    try {
        const url = new URL(location.website);
        if (['https:', 'http:'].includes(url.protocol)) {
            const link = document.createElement('a');
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Visit website';
            actions.appendChild(link);
        }
    } catch { /* Missing or invalid website: omit the link. */ }
    const lat = location.latitude ?? location.lat;
    const lon = location.longitude ?? location.lon;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const link = document.createElement('a');
        link.href = `https://www.google.com/maps?q=${lat},${lon}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open in Google Maps';
        actions.appendChild(link);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'forum-button';
    button.textContent = 'Visit forum';
    button.addEventListener('click', () => onOpenForum(location.shopid));
    actions.appendChild(button);
    return container;
}
