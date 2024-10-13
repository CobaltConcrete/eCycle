import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const Comment = ({ comment, replies, depth = 0 }) => {
  const getBackgroundColor = (depth) => {
    switch (depth) {
      case 0: return '#2D6A4F'; // Dark green for main comments
      case 1: return '#40916C'; // Slightly lighter green for replies
      case 2: return '#52B788'; // Lighter green for further nested replies
      default: return '#74C69D'; // Lightest green for deeper replies
    }
  };

  return (
    <div
      style={{
        backgroundColor: getBackgroundColor(depth),
        maxHeight: depth === 0 ? '240px' : '160px',
        overflowY: 'auto',
        color: 'white', // Ensure text color is readable on green background
      }}
      className="comment-box border border-gray-300 p-4 mb-4 rounded-lg"
    >
      <p className={`${depth === 0 ? 'text-lg font-semibold' : 'text-base'} mb-2`}>{comment.commenttext}</p>
      <small className="text-gray-200">Posted by {comment.postername} at {comment.time}</small>
      {replies && replies.length > 0 && (
        <div
          style={{
            maxHeight: '120px',
            overflowY: 'auto',
            paddingLeft: '1rem',
            borderLeft: '2px solid #D3D3D3', // Grey border for replies
            marginTop: '1rem',
          }}
          className="replies space-y-3"
        >
          {replies.map((reply) => (
            <Comment key={reply.commentid} comment={reply} replies={reply.replies} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const Comments = () => {
  const { forumid } = useParams();
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

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
    fetchComments();
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
    <div style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1rem' }} className="comments-container max-w-3xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Comments for Forum {forumid}</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div style={{ maxHeight: '100%', overflowY: 'auto', border: '1px solid #ddd', padding: '1rem' }}>
        {organizedComments.map((comment) => (
          <Comment key={comment.commentid} comment={comment} replies={comment.replies} />
        ))}
      </div>
    </div>
  );
};

export default Comments;
