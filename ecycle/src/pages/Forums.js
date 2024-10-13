import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

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
        <div>
            <h2>Forums for Shop {shopid}</h2>
            {error && <p>{error}</p>}
            <ul>
                {forums.map((forum) => (
                    <li key={forum.forumid}>
                        <Link to={`/comments/${forum.forumid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <p>{forum.forumtext}</p>
                            <small>Posted by {forum.postername} at {forum.time}</small>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Forums;
