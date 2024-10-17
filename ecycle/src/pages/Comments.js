import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Comments.css';

const Comment = ({ comment, replies, depth = 0, onEdit, onDelete, onReply }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commenttext);
  const [isReplying, setIsReplying] = useState(false); // State to control reply visibility
  const [replyText, setReplyText] = useState(''); // State for reply text

  const userid = localStorage.getItem('userid');

  const handleEdit = () => {
    onEdit(comment.commentid, editText);
    setIsEditing(false);
  };

  const handleReply = () => {
    onReply(comment.commentid, replyText); // Call the reply handler
    setReplyText(''); // Clear reply text after submission
    setIsReplying(false); // Hide the reply input
  };

  return (
    <div className={`comment-box ${depth % 2 === 0 ? 'even' : 'odd'}`} style={{ marginLeft: depth * 20 }}>
      <div>
        <p className="comment-header">
          {comment.postername} · <span className="comment-time">{comment.time}</span>
        </p>
        {isEditing ? (
          <div>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
            <button onClick={handleEdit}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <p className="comment-text">{comment.commenttext}</p>
        )}
        {parseInt(userid) === comment.posterid && (
          <div className="comment-actions">
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={() => onDelete(comment.commentid)}>Delete</button>
          </div>
        )}
        
        {/* Reply Button and Reply Input */}
        <div className="reply-container">
          <button onClick={() => setIsReplying(!isReplying)}>Reply</button>
          {isReplying && (
            <div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
              />
              <button onClick={handleReply}>Submit Reply</button>
            </div>
          )}
        </div>

        {/* Display Replies */}
        {replies && replies.length > 0 && (
          <div className="reply-list">
            {replies.map((reply) => (
              <Comment key={reply.commentid} comment={reply} replies={reply.replies} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onReply={onReply} />
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

  useEffect(() => {
    fetchComments();
    fetchForumDetails();
  }, [forumid]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`http://localhost:5000/comments/${forumid}`);
      if (!response.ok) throw new Error('Error fetching comments.');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Error fetching comments. Please try again later.');
    }
  };

  const fetchForumDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/forums/details/${forumid}`);
      if (!response.ok) throw new Error('Error fetching forum details.');
      const data = await response.json();
      setForumDetails(data);
    } catch (error) {
      console.error('Error fetching forum details:', error);
      setError('Error fetching forum details. Please try again later.');
    }
  };

  const handleAddComment = async () => {
    const userid = localStorage.getItem('userid');
    try {
      await axios.post(`http://localhost:5000/comments/add`, {
        forumid,
        commenttext: newComment,
        posterid: userid,
      });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Error adding comment. Please try again later.');
    }
  };

  const handleEditComment = async (commentid, newText) => {
    try {
      await axios.put(`http://localhost:5000/comments/edit/${commentid}`, { commenttext: newText });
      fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
      setError('Error editing comment. Please try again later.');
    }
  };

  const handleDeleteComment = async (commentid) => {
    try {
      await axios.delete(`http://localhost:5000/comments/delete/${commentid}`);
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Error deleting comment. Please try again later.');
    }
  };

  const handleReplyComment = async (commentid, replyText) => {
    const userid = localStorage.getItem('userid');
    try {
      await axios.post(`http://localhost:5000/comments/reply/${commentid}`, {
        forumid,
		commenttext: replyText,
        posterid: userid,
      });
      fetchComments(); // Refresh comments to include the new reply
    } catch (error) {
      console.error('Error replying to comment:', error);
      setError('Error replying to comment. Please try again later.');
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
          placeholder="Add your comment here..."
        />
        <button onClick={handleAddComment}>Add Comment</button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="comments-list">
        {organizedComments.length > 0 ? (
          organizedComments.map((comment) => (
            <Comment key={comment.commentid} comment={comment} replies={comment.replies} onEdit={handleEditComment} onDelete={handleDeleteComment} onReply={handleReplyComment} />
          ))
        ) : (
          <p className="no-comments">No comments yet.</p>
        )}
      </div>
    </div>
  );
};

export default Comments;
