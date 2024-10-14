import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './Comments.css'; // Import the CSS file

const Comment = ({ comment, replies, depth = 0 }) => {
  return (
    <div className={`comment-box ${depth % 2 === 0 ? 'even' : 'odd'}`} style={{ marginLeft: depth * 20 }}>
      <div>
        <p className="comment-header">
          {comment.postername} · <span className="comment-time">{comment.time}</span>
        </p>
        <p className="comment-text">{comment.commenttext}</p>
        {replies && replies.length > 0 && (
          <div className="reply-container">
            {replies.map((reply) => (
              <Comment key={reply.commentid} comment={reply} replies={reply.replies} depth={depth + 1} />
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
  const [forumDetails, setForumDetails] = useState(null); // State for storing forum details

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`http://localhost:5000/comments/${forumid}`);
        if (!response.ok) {
          throw new Error('Error fetching comments.');
        }
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Error fetching comments. Please try again later.');
      }
    };

    const fetchForumDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/forums/details/${forumid}`); // Assuming this endpoint exists
        if (!response.ok) {
          throw new Error('Error fetching forum details.');
        }
        const data = await response.json();
        setForumDetails(data);
      } catch (error) {
        console.error('Error fetching forum details:', error);
        setError('Error fetching forum details. Please try again later.');
      }
    };

    fetchComments();
    fetchForumDetails();
  }, [forumid]);

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
      {error && <p className="error-message">{error}</p>}
      <div className="comments-list">
        {organizedComments.length > 0 ? (
          organizedComments.map((comment) => (
            <Comment key={comment.commentid} comment={comment} replies={comment.replies} />
          ))
        ) : (
          <p className="no-comments">No comments yet.</p> // Message for no comments
        )}
      </div>
    </div>
  );
};

export default Comments;
