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
    const [actionType, setActionType] = useState('');
    const navigate = useNavigate();
    const userid = localStorage.getItem('userid');
    const usertype = localStorage.getItem('usertype');
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

    const fetchShopDetails = useCallback(async () => {
        try {
            const shopResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-shop-details/${shopid}`);
            setShopDetails(shopResponse.data);

            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-username/${shopid}`);
            setUsername(userResponse.data.username);
        } catch (error) {
            console.error('Error fetching shop or user data:', error);
            window.alert('Error fetching shop or user data. Please try again later.');
        }
    }, [shopid]);

    const fetchActionType = useCallback(async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-actiontype/${shopid}`);
            setActionType(response.data.actiontype);
        } catch (error) {
            console.error('Error fetching action type:', error);
            window.alert('Error fetching action type. Please try again later.');
        }
    }, [shopid]);

    const fetchForums = useCallback(async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/forums/${shopid}`);
            setForums(response.data);
        } catch (error) {
            console.error('Error fetching forum data:', error);
            window.alert('Error fetching forum data. Please try again later.');
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
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify`, {
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
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify`, {
                userid,
                username,
                usertype,
                userhashedpassword,
            });

            if (response.data.isValid) {
                await action();
            } else {
                window.alert('User verification failed. Please try again.');
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            window.alert('Error verifying user. Please try again later.');
        }
    };

    const updateAllUserPoints = async () => {
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/update-all-user-points`, {});
        } catch (error) {
            console.error('Error updating user points:', error);
            window.alert('Error updating user points. Please try again later.');
        }
    };

    const handleAddForum = async () => {
        if (!newForumText.trim()) {
            window.alert('Comment text cannot be empty.');
            return;
        }

        if (newForumText.trim().length < 10) {
            window.alert('Comment must be at least 10 characters.');
            return;
        }

        setLoading(true);
        await verifyAndExecute(async () => {
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/forums/add`, {
                    forumtext: newForumText,
                    shopid,
                    posterid: userid,
                    time: new Date().toLocaleString(),
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.status !== 201) throw new Error('Error adding new forum.');
                setNewForumText('');
                window.alert('Forum posted successfully.');
                fetchForums();
                await updateAllUserPoints();
            } catch (error) {
                console.error('Error adding new forum:', error);
                window.alert('Error adding new forum. Please try again later.');
            } finally {
                setLoading(false);
            }
        });
    };

    const handleEditForum = async (forumid) => {
        if (!editMode.forumtext.trim()) {
            window.alert('Forum text cannot be empty.');
            return;
        }

        if (editMode.forumtext.trim().length < 10) {
            window.alert('Forum text must be at least 10 characters.');
            return;
        }

        setLoading(true);
        await verifyAndExecute(async () => {
            try {
                const response = await axios.put(`${process.env.REACT_APP_API_URL}/forums/edit/${forumid}`, {
                    forumtext: editMode.forumtext,
                });

                if (response.status !== 200) throw new Error('Error editing forum.');
                setEditMode({ status: false, forumid: null, forumtext: '' });
                window.alert('Forum edited successfully.');
                fetchForums();
                await updateAllUserPoints();
            } catch (error) {
                console.error('Error editing forum:', error);
                window.alert('Error editing forum. Please try again later.');
            } finally {
                setLoading(false);
            }
        });
    };

    const handleDeleteForum = async (forumid) => {
        await verifyAndExecute(async () => {
            try {
                const response = await axios.delete(`${process.env.REACT_APP_API_URL}/forums/delete/${forumid}`);

                if (response.status !== 200) throw new Error('Error deleting forum.');
                window.alert('Forum deleted successfully.');
                fetchForums();
                await updateAllUserPoints();
            } catch (error) {
                console.error('Error deleting forum:', error);
                window.alert('Error deleting forum. Please try again later.');
            }
        });
    };

    const handleRemoveShop = async () => {
        const confirmRemoval = window.confirm('Are you sure you want to remove this shop? This action cannot be undone.');
        if (!confirmRemoval) return;

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/remove-shop`, { shopid });
            if (response.data.message) {
                alert('Shop removed successfully!');
                navigate('/');
                await updateAllUserPoints();
            }
        } catch (error) {
            console.error('Error removing shop:', error);
            window.alert('Failed to remove shop. Please try again later.');
        }
    };

    return (
        <div className="forums-container">
            <div className="user-info">
                <p>Role: <u>{current_role}</u> | Username: <u>{current_username}</u> | Points: <u>{current_points}</u></p>
            </div>
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
                    : '#'}
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    {shopDetails && shopDetails.website ? shopDetails.website : 'N/A'}
                </a>
                </p>
                <p>Owner: {username}</p>
            </div>

            {userid === shopid && usertype === 'shop' && (
                <div className="shop-buttons-container">
                    <button onClick={() => navigate('/checklist')} className="btn checklist-button">
                        Update Checklist
                    </button>
                    <button onClick={() => navigate('/signup-shop')} className="btn update-shop-details-button">
                        Update Shop Details
                    </button>
                    <button onClick={handleRemoveShop} className="btn remove-shop-button">
                        Remove Shop
                    </button>
                </div>
            )}

            {error && <p className="error-message">{error}</p>}

            <div className="add-forum">
                <textarea
                value={newForumText}
                onChange={(e) => setNewForumText(e.target.value)}
                placeholder="Write a forum... (min 10 chars)"
                className="forum-input"
                ></textarea>
                <button onClick={handleAddForum} disabled={loading} className="btn add-forum-button">
                {loading ? 'Submitting...' : 'Submit Forum'}
                </button>
            </div>

            <ul className={`forums-list ${forums.length === 0 ? 'no-forums-bg' : ''}`}>
                {forums.length > 0 ? (
                forums.map((forum) => (
                    <li key={forum.forumid} className="forum-item">
                    {editMode.status && editMode.forumid === forum.forumid ? (
                        <>
                            <textarea
                                value={editMode.forumtext}
                                onChange={(e) => setEditMode({ ...editMode, forumtext: e.target.value })}
                                placeholder="Edit your forum... (min 10 chars)"
                                className="forum-input"
                            />
                            <button onClick={() => handleEditForum(forum.forumid)} disabled={loading} className="btn save-button">
                                Save
                            </button>
                            <button onClick={() => setEditMode({ status: false, forumid: null, forumtext: '' })} className="btn cancel-button">
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to={`/comments/${forum.forumid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <p className="forum-text">{forum.forumtext}</p>
                                <small className="forum-meta">Posted by {forum.postername} at {forum.time}</small>
                            </Link>
                            <div className="forum-actions">
                                {forum.posterid === parseInt(userid) && (
                                    <button onClick={() => setEditMode({ status: true, forumid: forum.forumid, forumtext: forum.forumtext })} className="btn edit-button">
                                        Edit
                                    </button>
                                )}
                                {(forum.posterid === parseInt(userid) || usertype === 'admin') && (
                                    <button onClick={() => handleDeleteForum(forum.forumid)} className="btn delete-button">
                                        Delete
                                    </button>
                                )}
                            </div>
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
        
            <div className="button-container">
                <button 
                    onClick={() => navigate(`/map/${shopDetails.actiontype}`)} 
                    className="button back-button"
                >
                    Back to Map
                </button>

                {usertype === 'admin' && (
                    <button 
                        type="button" 
                        onClick={() => navigate('/report')} 
                        className="button reportpage-button"
                    >
                        Go to Report Page 
                    </button>
                )}
            </div>
        </div>
    );
};

export default Forums;