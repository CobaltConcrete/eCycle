import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Forums.css';

const Forums = () => {
    const { shopid } = useParams();
    const [forums, setForums] = useState([]);
    const [error, setError] = useState('');
    const [newForumText, setNewForumText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [editMode, setEditMode] = useState({ status: false, forumid: null, forumtext: '' });
    const navigate = useNavigate();
    const userid = localStorage.getItem('userid'); // Get the user ID

    useEffect(() => {
        const verifyUser = async () => {
            const username = localStorage.getItem('username');
            const usertype = localStorage.getItem('usertype');
            const userhashedpassword = localStorage.getItem('userhashedpassword');

            if (!userid || !username || !usertype || !userhashedpassword) {
                navigate('/');
                return;
            }

            try {
                const response = await axios.post('http://localhost:5000/verify', {
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
    }, [navigate, userid]);

    useEffect(() => {
        if (isVerified) {
            fetchForums();
        }
    }, [isVerified, shopid]);

    const fetchForums = async () => {
        try {
            const response = await fetch(`http://localhost:5000/forums/${shopid}`);
            if (!response.ok) throw new Error('Error fetching forum data.');

            const data = await response.json();
            setForums(data);
        } catch (error) {
            console.error('Error fetching forum data:', error);
            setError('Error fetching forum data. Please try again later.');
        }
    };

    const handleAddForum = async () => {
        if (!newForumText.trim()) {
            setError('Forum text cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/forums/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    forumtext: newForumText,
                    shopid,
                    posterid: userid,
                    time: new Date().toLocaleString(),
                })
            });

            if (!response.ok) throw new Error('Error adding new forum.');
            setNewForumText('');
            fetchForums();
        } catch (error) {
            console.error('Error adding new forum:', error);
            setError('Error adding new forum. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditForum = async (forumid) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/forums/edit/${forumid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forumtext: editMode.forumtext }),
            });

            if (!response.ok) throw new Error('Error editing forum.');
            setEditMode({ status: false, forumid: null, forumtext: '' });
            fetchForums();
        } catch (error) {
            console.error('Error editing forum:', error);
            setError('Error editing forum. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteForum = async (forumid) => {
        try {
            const response = await fetch(`http://localhost:5000/forums/delete/${forumid}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Error deleting forum.');
            fetchForums();
        } catch (error) {
            console.error('Error deleting forum:', error);
            setError('Error deleting forum. Please try again later.');
        }
    };

    return (
        <div className="forums-container">
            {isVerified ? (
                <>
                    <h2 className="forums-title">Forums for Shop {shopid}</h2>
                    {error && <p className="error-message">{error}</p>}

                    <div className="add-forum">
                        <textarea
                            value={newForumText}
                            onChange={(e) => setNewForumText(e.target.value)}
                            placeholder="Enter your forum text here"
                            className="forum-input"
                        ></textarea>
                        <button onClick={handleAddForum} disabled={loading} className="add-forum-button">
                            {loading ? 'Submitting...' : 'Add Forum'}
                        </button>
                    </div>

                    <ul className="forums-list">
                        {forums.length > 0 ? (
                            forums.map((forum) => (
                                <li key={forum.forumid} className="forum-item">
                                    {editMode.status && editMode.forumid === forum.forumid ? (
                                        <>
                                            <textarea
                                                value={editMode.forumtext}
                                                onChange={(e) => setEditMode({ ...editMode, forumtext: e.target.value })}
                                                className="forum-edit-input"
                                            />
                                            <button onClick={() => handleEditForum(forum.forumid)} disabled={loading}>
                                                Save
                                            </button>
                                            <button onClick={() => setEditMode({ status: false, forumid: null, forumtext: '' })}>
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link to={`/comments/${forum.forumid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                <p className="forum-text">{forum.forumtext}</p>
                                                <small className="forum-meta">Posted by {forum.postername} at {forum.time}</small>
                                            </Link>
                                            {forum.posterid === parseInt(userid) && (
                                                <div className="forum-actions">
                                                    <button onClick={() => setEditMode({ status: true, forumid: forum.forumid, forumtext: forum.forumtext })}>
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteForum(forum.forumid)}>Delete</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </li>
                            ))
                        ) : (
                            <p className="no-forums">No forums yet.</p>
                        )}
                    </ul>
                </>
            ) : (
                <p>Verifying user...</p>
            )}
        </div>
    );
};

export default Forums;
