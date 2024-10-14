import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Forums.css';

const Forums = () => {
    const { shopid } = useParams();
    const [forums, setForums] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchForums = async () => {
            try {
                const response = await fetch(`http://localhost:5000/forums/${shopid}`);
                if (!response.ok) {
                    throw new Error('Error fetching forum data.');
                }
                const data = await response.json();
                setForums(data);
            } catch (error) {
                console.error('Error fetching forum data:', error);
                setError('Error fetching forum data. Please try again later.');
            }
        };

        fetchForums();
    }, [shopid]);

    return (
        <div className="forums-container">
            <h2 className="forums-title">Forums for Shop {shopid}</h2>
            {error && <p className="error-message">{error}</p>}
            <ul className="forums-list">
                {forums.length > 0 ? (
                    forums.map((forum) => (
                        <li key={forum.forumid} className="forum-item">
                            <Link to={`/comments/${forum.forumid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <p className="forum-text">{forum.forumtext}</p>
                                <small className="forum-meta">Posted by {forum.postername} at {forum.time}</small>
                            </Link>
                        </li>
                    ))
                ) : (
                    <p className="no-forums">No forums yet.</p> // Message for no forums
                )}
            </ul>
        </div>
    );
};

export default Forums;
