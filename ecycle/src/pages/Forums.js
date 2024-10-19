import React, { useEffect, useState, useCallback } from 'react';
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
    const [shopDetails, setShopDetails] = useState({});
    const [username, setUsername] = useState('');
    const [editMode, setEditMode] = useState({ status: false, forumid: null, forumtext: '' });
    const navigate = useNavigate();
    const userid = localStorage.getItem('userid'); // Get the user ID
    const usertype = localStorage.getItem('usertype'); // Get the usertype

    const fetchShopDetails = useCallback(async () => {
        try {
            const shopResponse = await fetch(`http://localhost:5000/get-shop-details/${shopid}`);
            if (!shopResponse.ok) throw new Error('Error fetching shop details.');

            const shopData = await shopResponse.json();
            setShopDetails(shopData);

            // Fetch username based on shop's userid
            const userResponse = await fetch(`http://localhost:5000/get-username/${shopid}`); // Assuming this endpoint exists
            if (!userResponse.ok) throw new Error('Error fetching user details.');

            const userData = await userResponse.json();
            setUsername(userData.username);
        } catch (error) {
            console.error('Error fetching shop or user data:', error);
            setError('Error fetching shop or user data. Please try again later.');
        }
    }, [shopid]);

    const fetchForums = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:5000/forums/${shopid}`);
            if (!response.ok) throw new Error('Error fetching forum data.');

            const data = await response.json();
            setForums(data);
        } catch (error) {
            console.error('Error fetching forum data:', error);
            setError('Error fetching forum data. Please try again later.');
        }
    }, [shopid]);

    useEffect(() => {
        const verifyUser = async () => {
            const username = localStorage.getItem('username');
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
    }, [navigate, userid, usertype]);

    useEffect(() => {
        if (isVerified) {
            fetchShopDetails();
            fetchForums();
        }
    }, [isVerified, shopid, fetchForums, fetchShopDetails]);

    const verifyAndExecute = async (action) => {
        const username = localStorage.getItem('username');
        const userhashedpassword = localStorage.getItem('userhashedpassword');

        try {
            const response = await axios.post('http://localhost:5000/verify', {
                userid,
                username,
                usertype,
                userhashedpassword,
            });

            if (response.data.isValid) {
                await action(); // Execute the action (add, edit, delete)
            } else {
                setError('User verification failed. Please try again.');
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            setError('Error verifying user. Please try again later.');
        }
    };

    const handleAddForum = async () => {
        if (!newForumText.trim()) {
            setError('Forum text cannot be empty.');
            return;
        }

        setLoading(true);
        await verifyAndExecute(async () => {
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
        });
    };

    const handleEditForum = async (forumid) => {
        setLoading(true);
        await verifyAndExecute(async () => {
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
        });
    };

    const handleDeleteForum = async (forumid) => {
        await verifyAndExecute(async () => {
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
        });
    };

    const handleRemoveShop = async () => {
        const confirmRemoval = window.confirm('Are you sure you want to remove this shop? This action cannot be undone.');
        if (!confirmRemoval) return;

        try {
            const response = await axios.post('http://localhost:5000/remove-shop', { shopid });
            if (response.data.message) {
                alert('Shop removed successfully!');
                navigate('/'); // Redirect after removal
            }
        } catch (error) {
            console.error('Error removing shop:', error);
            setError('Failed to remove shop. Please try again later.');
        }
    };

    return (
        <div className="forums-container">
            {isVerified ? (
                <>
                    <h2 className="forums-title">
                        Forums for {shopDetails.actiontype} waste {shopDetails.shopname}
                    </h2>
                    <div className="shop-details">
                        <p>Address: {shopDetails.addressname}</p>
                        <p>
                            Website: <span style={{ marginRight: '1px' }}></span>
                            <a 
                                href={shopDetails && shopDetails.website ? 
                                    (shopDetails.website.startsWith('http') ? shopDetails.website : `http://${shopDetails.website}`) 
                                    : '#'} // Fallback to a placeholder if shopDetails is undefined
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                {shopDetails && shopDetails.website ? shopDetails.website : 'N/A'}
                            </a>
                        </p>
                        <p>Owner: {username}</p>
                    </div>

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

                    {/* Conditional rendering of "Update shop details" button */}
                    {userid === shopid && usertype === 'shop' && (
                        <>
                            <button onClick={() => navigate('/signup-shop')} className="update-shop-details-button">
                                Update Shop Details
                            </button>
                            <button onClick={handleRemoveShop} className="remove-shop-button">
                                Remove Shop
                            </button>
                        </>
                    )}
                </>
            ) : (
                <p>Verifying user...</p>
            )}
        </div>
    );
};

export default Forums;