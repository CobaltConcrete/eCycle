import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Comments.css';

const Comment = ({ comment, replies, depth = 0, onEdit, onDelete, onReply, onReport }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.commenttext);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [imageFile, setImageFile] = useState(null);

    const userid = localStorage.getItem('userid');
    const usertype = localStorage.getItem('usertype');

    const handleEdit = () => {
        onEdit(comment.commentid, editText);
        setIsEditing(false);
    };

    const handleReply = () => {
        onReply(comment.commentid, replyText, imageFile);
        setReplyText('');
        setIsReplying(false);
        setImageFile(null);
    };

    if (comment.deleted) {
        return (
            <div className={`comment-box ${depth % 2 === 0 ? 'even' : 'odd'}`} style={{ marginLeft: depth * 20 }}>
                <p className="comment-header">
                    {comment.postername} <span className="comment-points">  ·  {comment.userpoints} points  ·  </span> <span className="comment-time">{comment.time}</span>
                </p>

                <p className="comment-text deleted">[deleted]</p>
                {replies && replies.length > 0 && (
                    <div className="reply-list">
                        {replies.map((reply) => (
                            <Comment
                                key={reply.commentid}
                                comment={reply}
                                replies={reply.replies}
                                depth={depth + 1}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onReply={onReply}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`comment-box ${depth % 2 === 0 ? 'even' : 'odd'}`} style={{ marginLeft: 0 }}>
            <div>
                <p className="comment-header">
                    {comment.postername} <span className="comment-points">  ·  {comment.userpoints} points  ·  </span> <span className="comment-time">{comment.time}</span>
                </p>
                {isEditing ? (
                    <div>
                        <textarea 
                            value={editText} 
                            onChange={(e) => setEditText(e.target.value)} 
                            placeholder="Edit your comment... (10 chars)" 
                            className="edit-input"
                        />
                        <button onClick={handleEdit} className="btn save-button">Save Edit</button>
                        <button onClick={() => setIsEditing(false)} className="btn cancel-button">Cancel Edit</button>
                    </div>
                ) : (
                    <div>
                        <p className="comment-text">{comment.commenttext}</p>
                        {comment.encodedimage && (
                        <img src={`data:image/jpeg;base64,${comment.encodedimage}`} alt="Comment Attachment" className="comment-image" />)}
                    </div>
                )}

                <div className="comment-actions">
                    {/* Admin can edit only their own comment */}
                    {parseInt(userid) === comment.posterid && (
                        <>
                            <button onClick={() => setIsEditing(true)} className="btn edit-button">Edit</button>
                        </>
                    )}

                    {/* Admin can delete anyone's comment */}
                    {(usertype === 'admin' || parseInt(userid) === comment.posterid) && (
                        <button onClick={() => onDelete(comment.commentid)} className="btn delete-button">Delete</button>
                    )}
                    
                    <button onClick={() => setIsReplying(!isReplying)} className="btn reply-button">Reply</button>
                    <button onClick={() => onReport(comment.commentid)} className="btn report-button">Report</button>
                </div>

                {isReplying && (
                    <div className="reply-container">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply... (10 chars)"
                            className="reply-input"
                        />
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => setImageFile(e.target.files[0])} 
                        />
                        {imageFile && (
                            <div>
                                <img 
                                    src={URL.createObjectURL(imageFile)} 
                                    alt="Preview" 
                                    style={{ width: '100px', height: 'auto' }} 
                                />
                                <button onClick={() => setImageFile(null)} className="btn cancel-button">Remove Image</button>
                            </div>
                        )}
                        <button onClick={handleReply} className="btn save-button">Submit Reply</button>
                        <button onClick={() => { setIsReplying(false); setReplyText(''); setImageFile(null); }} className="btn cancel-button">Cancel Reply</button>
                    </div>
                )}

                {replies && replies.length > 0 && (
                    <div className="reply-list">
                        {replies.map((reply) => (
                            <Comment
                                key={reply.commentid}
                                comment={reply}
                                replies={reply.replies}
                                depth={depth + 1}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onReply={onReply}
                                onReport={onReport}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Comments = () => {
    const { forumid } = useParams();
    const [comments, setComments] = useState([]);
    const [error, setError] = useState('');
    const [forumDetails, setForumDetails] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const navigate = useNavigate();
    const usertype = localStorage.getItem('usertype');
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

    useEffect(() => {
        const verifyUser = async () => {
            const userid = localStorage.getItem('userid');
            const username = localStorage.getItem('username');
            const usertype = localStorage.getItem('usertype');
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
                    localStorage.setItem('points', response.data.points);
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
    }, [navigate]);

    useEffect(() => {
        if (isVerified) {
            fetchComments();
            fetchForumDetails();
        }
    }, [isVerified, forumid]);

    const fetchComments = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/comments/${forumid}`);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
            window.alert('Error fetching comments. Please try again later.');
        }
    };

    const fetchForumDetails = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/forums/details/${forumid}`);
            setForumDetails(response.data);
        } catch (error) {
            console.error('Error fetching forum details:', error);
            window.alert('Error fetching forum details. Please try again later.');
        }
    };

    const verifyAndExecute = async (action) => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');
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

    const compressImage = async (file, maxWidth = 320, maxHeight = 320) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        resolve(blob);
                    },
                    'image/jpeg',
                    0.8
                );
            };

            img.onerror = (error) => reject(error);
        });
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            window.alert('Comment text cannot be empty.');
            return;
        }
        if (newComment.trim().length < 10) {
            window.alert('Comment must be at least 10 characters.');
            return;
        }

        const processImage = async () => {
            if (imageFile) {
                const compressedImage = await compressImage(imageFile);
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const encodedImage = reader.result.split(',')[1];
                    await addComment(encodedImage);
                };
                reader.readAsDataURL(compressedImage);
            } else {
                await addComment(null);
            }
        };

        const addComment = async (encodedImage) => {
            await verifyAndExecute(async () => {
                try {
                    const userid = localStorage.getItem('userid');
                    await axios.post(`${process.env.REACT_APP_API_URL}/comments/add`, {
                        forumid,
                        commenttext: newComment,
                        posterid: userid,
                        encodedimage: encodedImage,
                    });
                    setNewComment('');
                    setImageFile(null);
                    window.alert('Comment posted successfully.');
                    await updateAllUserPoints();
                    await fetchComments();
                } catch (error) {
                    console.error('Error adding comment:', error);
                    window.alert('Error adding comment. Please try again later.');
                }
            });
        };

        await processImage();
    };

    const handleEditComment = async (commentid, newText) => {
        if (!newText.trim()) {
            window.alert('Comment text cannot be empty.');
            return;
        }

        if (newText.trim().length < 10) {
            window.alert('Comment must be at least 10 characters.');
            return;
        }

        await verifyAndExecute(async () => {
            try {
                await axios.put(`${process.env.REACT_APP_API_URL}/comments/edit/${commentid}`, { commenttext: newText });
                fetchComments();
                window.alert('Comment edited successfully.');
                await updateAllUserPoints();
                await fetchComments();
            } catch (error) {
                console.error('Error editing comment:', error);
                window.alert('Error editing comment. Please try again later.');
            }
        });
    };

    const handleDeleteComment = async (commentid) => {
        await verifyAndExecute(async () => {
            try {
                await axios.put(`${process.env.REACT_APP_API_URL}/comments/delete/${commentid}`);
                fetchComments();
                window.alert('Comment deleted successfully.');
                await updateAllUserPoints();
                await fetchComments();
            } catch (error) {
                console.error('Error deleting comment:', error);
                window.alert('Error deleting comment. Please try again later.');
            }
        });
    };

    const handleReplyComment = async (commentid, replyText, replyImage) => {
        if (!replyText.trim()) {
            window.alert('Reply text cannot be empty.');
            return;
        }
        if (newComment.trim().length < 10) {
            window.alert('Comment must be at least 10 characters.');
            return;
        }

        const processImage = async () => {
            if (replyImage) {
                const compressedImage = await compressImage(replyImage);
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const encodedImage = reader.result.split(',')[1];
                    await addReply(encodedImage);
                };
                reader.readAsDataURL(compressedImage);
            } else {
                await addReply(null);
            }
        };

        const addReply = async (encodedImage) => {
            await verifyAndExecute(async () => {
                try {
                    const userid = localStorage.getItem('userid');
                    await axios.post(`${process.env.REACT_APP_API_URL}/comments/reply/${commentid}`, {
                        forumid,
                        commenttext: replyText,
                        posterid: userid,
                        encodedimage: encodedImage,
                    });
                    window.alert('Reply posted successfully.');
                    await updateAllUserPoints();
                    await fetchComments();
                } catch (error) {
                    console.error('Error replying to comment:', error);
                    window.alert('Error replying to comment. Please try again later.');
                }
            });
        };

        await processImage();
    };

    const handleReportComment = async (commentid) => {
        await verifyAndExecute(async () => {
            try {
                const userid = localStorage.getItem('userid');
                await axios.post(`${process.env.REACT_APP_API_URL}/comments/report-azure/${commentid}`, {
                    reporterid: userid
                });
                window.alert('Comment reported successfully.');
            } catch (error) {
                console.error('Error reporting comment:', error);
                window.alert('Error reporting comment. Please try again later.');
            }
        });
    };

    const organizeComments = (comments) => {
        const commentMap = new Map();
        const topLevelComments = [];

        comments.forEach(comment => {
            commentMap.set(comment.commentid, { ...comment, replies: [] });
        });

        comments.forEach(comment => {
            if (comment.replyid) {
                const parentComment = commentMap.get(comment.replyid);
                if (parentComment) {
                    parentComment.replies.push(commentMap.get(comment.commentid));
                }
            } else {
                topLevelComments.push(commentMap.get(comment.commentid));
            }
        });

        return topLevelComments;
    };

    const organizedComments = organizeComments(comments);

    const handleBackClick = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-shopid-from-forumid/${forumid}`);
            const shopid = response.data.shopid;
            navigate(`/forums/${shopid}`);
        } catch (error) {
            console.error('Error retrieving shopid:', error);
            window.alert('Error retrieving shop information. Please try again later.');
        }
    };


    return (
        <div className="comments-container">
            <div className="user-info">
                <p>Role: <u>{current_role}</u> | Username: <u>{current_username}</u> | Points: <u>{current_points}</u></p>
            </div>
            {forumDetails && (
                <div className="forum-details">
                    <h2 className="forum-title">{forumDetails.forumtext}</h2>
                    <p className="forum-meta">Posted by {forumDetails.postername} at {forumDetails.time}</p>
                </div>
            )}
            
            <div className="new-comment">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... (min 10 chars)"
                    className="comment-input"
                    maxLength={2000}
                />
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setImageFile(e.target.files[0])} 
                />
                {imageFile && (
                    <div>
                        <img 
                            src={URL.createObjectURL(imageFile)} 
                            alt="Preview" 
                            style={{ width: '100px', height: 'auto' }} 
                        />
                        <button onClick={() => setImageFile(null)}>Remove Image</button>
                    </div>
                )}
                <button onClick={handleAddComment} className="btn add-comment-button">Add Comment</button>
            </div>
            
            {error && <p className="error-message">{error}</p>}
            
            <div className={`comments-scrollable ${organizedComments.length === 0 ? 'no-comments-bg' : ''}`}>
                <div className={`comments-list ${organizedComments.length === 0 ? 'no-comments-bg' : ''}`}>
                    {organizedComments.length > 0 ? (
                        organizedComments.map((comment) => (
                            <Comment 
                                key={comment.commentid} 
                                comment={comment} 
                                replies={comment.replies} 
                                onEdit={handleEditComment} 
                                onDelete={handleDeleteComment} 
                                onReply={handleReplyComment}
                                onReport={handleReportComment} 
                            />
                        ))
                    ) : (
                        <p className="no-comments">No comments available.</p>
                    )}
                </div>
            </div>
            
            <div className="button-container">
                <button onClick={handleBackClick} className="button back-button">
                    Back to Forum
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

export default Comments;
