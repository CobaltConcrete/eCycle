import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Comments.css';

const Comment = ({ comment, replies, depth = 0, onEdit, onDelete, onReply }) => {
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
                    {comment.postername} · <span className="comment-time">{comment.time}</span>
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
                    {comment.postername} · <span className="comment-time">{comment.time}</span>
                </p>
                {isEditing ? (
                    <div>
                        <textarea 
                            value={editText} 
                            onChange={(e) => setEditText(e.target.value)} 
                            placeholder="Edit your comment..." 
                            className="edit-input"
                        />
                        <button onClick={handleEdit} className="btn save-button">Save Edit</button>
                        <button onClick={() => setIsEditing(false)} className="btn cancel-button">Cancel Edit</button>
                    </div>
                ) : (
                    <div>
                        <p className="comment-text">{comment.commenttext}</p>
                        {comment.encodedimage && <img src={`data:image/jpeg;base64,${comment.encodedimage}`} alt="Comment Attachment" />}
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
                </div>

                {isReplying && (
                    <div className="reply-container">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply..."
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
                const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/verify`, {
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
    }, [navigate]);

    useEffect(() => {
        if (isVerified) {
            fetchComments();
            fetchForumDetails();
        }
    }, [isVerified, forumid]);

    const fetchComments = async () => {
        try {
            const response = await axios.get(`http://${process.env.REACT_APP_localhost}:5000/comments/${forumid}`);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
            setError('Error fetching comments. Please try again later.');
        }
    };

    const fetchForumDetails = async () => {
        try {
            const response = await axios.get(`http://${process.env.REACT_APP_localhost}:5000/forums/details/${forumid}`);
            setForumDetails(response.data);
        } catch (error) {
            console.error('Error fetching forum details:', error);
            setError('Error fetching forum details. Please try again later.');
        }
    };

    const verifyAndExecute = async (action) => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');
        const userhashedpassword = localStorage.getItem('userhashedpassword');

        try {
            const response = await axios.post(`http://${process.env.REACT_APP_localhost}:5000/verify`, {
                userid,
                username,
                usertype,
                userhashedpassword,
            });

            if (response.data.isValid) {
                await action();
            } else {
                setError('User verification failed. Please try again.');
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            setError('Error verifying user. Please try again later.');
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            setError('Comment text cannot be empty.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const encodedImage = reader.result.split(',')[1];

            await verifyAndExecute(async () => {
                try {
                    const userid = localStorage.getItem('userid');
                    await axios.post(`http://${process.env.REACT_APP_localhost}:5000/comments/add`, {
                        forumid,
                        commenttext: newComment,
                        posterid: userid,
                        encodedimage: encodedImage,
                    });
                    setNewComment('');
                    setImageFile(null);
                    fetchComments();
                } catch (error) {
                    console.error('Error adding comment:', error);
                    setError('Error adding comment. Please try again later.');
                }
            });
        };

        if (imageFile) {
            reader.readAsDataURL(imageFile);
        } else {
            await verifyAndExecute(async () => {
                try {
                    const userid = localStorage.getItem('userid');
                    await axios.post(`http://${process.env.REACT_APP_localhost}:5000/comments/add`, {
                        forumid,
                        commenttext: newComment,
                        posterid: userid,
                    });
                    setNewComment('');
                    setImageFile(null);
                    fetchComments();
                } catch (error) {
                    console.error('Error adding comment:', error);
                    setError('Error adding comment. Please try again later.');
                }
            });
        }
    };

    const handleEditComment = async (commentid, newText) => {
        await verifyAndExecute(async () => {
            try {
                await axios.put(`http://${process.env.REACT_APP_localhost}:5000/comments/edit/${commentid}`, { commenttext: newText });
                fetchComments();
            } catch (error) {
                console.error('Error editing comment:', error);
                setError('Error editing comment. Please try again later.');
            }
        });
    };

    const handleDeleteComment = async (commentid) => {
        await verifyAndExecute(async () => {
            try {
                await axios.put(`http://${process.env.REACT_APP_localhost}:5000/comments/delete/${commentid}`);
                fetchComments();
            } catch (error) {
                console.error('Error deleting comment:', error);
                setError('Error deleting comment. Please try again later.');
            }
        });
    };

    const handleReplyComment = async (commentid, replyText, replyImage) => {
        if (!replyText.trim()) {
            setError('Reply text cannot be empty.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const encodedImage = reader.result.split(',')[1];
            await verifyAndExecute(async () => {
                try {
                    const userid = localStorage.getItem('userid');
                    await axios.post(`http://${process.env.REACT_APP_localhost}:5000/comments/reply/${commentid}`, {
                        forumid,
                        commenttext: replyText,
                        posterid: userid,
                        encodedimage: encodedImage,
                    });
                    fetchComments();
                } catch (error) {
                    console.error('Error replying to comment:', error);
                    setError('Error replying to comment. Please try again later.');
                }
            });
        };

        if (replyImage) {
            reader.readAsDataURL(replyImage);
        } else {
            await verifyAndExecute(async () => {
                try {
                    const userid = localStorage.getItem('userid');
                    await axios.post(`http://${process.env.REACT_APP_localhost}:5000/comments/reply/${commentid}`, {
                        forumid,
                        commenttext: replyText,
                        posterid: userid,
                    });
                    fetchComments();
                } catch (error) {
                    console.error('Error replying to comment:', error);
                    setError('Error replying to comment. Please try again later.');
                }
            });
        }
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
            const response = await axios.get(`http://${process.env.REACT_APP_localhost}:5000/get-shopid-from-forumid/${forumid}`);
            const shopid = response.data.shopid;
            navigate(`/forums/${shopid}`);
        } catch (error) {
            console.error('Error retrieving shopid:', error);
            setError('Error retrieving shop information. Please try again later.');
        }
    };


    return (
        <div className="comments-container">
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
                    placeholder="Write a comment..."
                    className="comment-input"
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
                            />
                        ))
                    ) : (
                        <p className="no-comments">No comments available.</p>
                    )}
                </div>
            </div>
            
            <button onClick={handleBackClick} className="back-button">
                Back to Forum
            </button>
        </div>
    );
};

export default Comments;
