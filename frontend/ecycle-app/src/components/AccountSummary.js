import React from 'react';

export default function AccountSummary({ username, role, points }) {
    const name = username || 'Community member';
    const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
    return <aside className="account-summary" aria-label="Your account">
        <span className="account-avatar" aria-hidden="true">{initials}</span>
        <div className="account-name"><strong>{name}</strong><span>{({ user: 'Community member', shop: 'Shop partner', admin: 'Administrator' })[role] || 'Member'}</span></div>
        <div className="account-points"><strong>{points ?? 0}</strong><span>community points</span></div>
    </aside>;
}
