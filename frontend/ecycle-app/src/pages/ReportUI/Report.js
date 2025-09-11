import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Report.css';

const Report = () => {
    const [reports, setReports] = useState([]);
    const [error, setError] = useState('');
    const [sortCriteria, setSortCriteria] = useState('report_count');
    const [sortDirection, setSortDirection] = useState('desc');
    const navigate = useNavigate();
    const current_role = localStorage.getItem('usertype');
    const current_username = localStorage.getItem('username');
    const current_points = localStorage.getItem('points');

    const verifyUser = useCallback(async () => {
        const userid = localStorage.getItem('userid');
        const username = localStorage.getItem('username');
        const usertype = localStorage.getItem('usertype');
        const userhashedpassword = localStorage.getItem('userhashedpassword');

        if (!userid || !username || !usertype || !userhashedpassword || usertype !== 'admin') {
            navigate('/');
            return;
        }

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify-admin`, {
                userid,
                username,
                usertype,
                userhashedpassword,
            });

            if (!response.data.isValid) {
                navigate('/');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/comments/reported`);
                setReports(response.data);
            } catch (error) {
                console.error('Error fetching report data:', error);
                setError('Error fetching report data. Please try again later.');
            }
        };

        fetchReports();
    }, []);

    const sortedReports = () => {
        const sorted = [...reports].sort((a, b) => {
            if (sortCriteria === 'report_count') {
                return sortDirection === 'desc' ? b.report_count - a.report_count : a.report_count - b.report_count;
            } else if (sortCriteria === 'latest_report_time') {
                const dateA = new Date(a.latest_report_time);
                const dateB = new Date(b.latest_report_time);
                return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            } else if (sortCriteria === 'dangerscore') {
                return sortDirection === 'desc' ? b.dangerscore - a.dangerscore : a.dangerscore - b.dangerscore;
            }
            return 0;
        });
        return sorted;
    };

    const handleSortChange = (criteria) => {
        if (criteria === sortCriteria) {
            setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortCriteria(criteria);
            setSortDirection('desc');
        }
    };

    const getDangerScoreIcon = (dangerScore) => {
        switch (dangerScore) {
            case 1:
                return '🟢';
            case 2:
                return '🟡';
            case 3:
                return '🔴';
            default:
                return '⚪';
        }
    };

    return (
        <div className="report-container">
            <div className="user-info">
                <p>Role: <u>{current_role}</u> | Username: <u>{current_username}</u> | Points: <u>{current_points}</u></p>
            </div>
            <h2>Reported Comments</h2>
            {error && <p className="error-message">{error}</p>}

            <div className="sorting-controls">
                <button onClick={() => handleSortChange('report_count')}>
                    Sort by Number of Reports {sortCriteria === 'report_count' && (sortDirection === 'asc' ? '▲' : '▼')}
                </button>
                <button onClick={() => handleSortChange('latest_report_time')}>
                    Sort by Latest Report Time {sortCriteria === 'latest_report_time' && (sortDirection === 'asc' ? '▲' : '▼')}
                </button>
                <button onClick={() => handleSortChange('dangerscore')}>
                    Sort by Danger Score {sortCriteria === 'dangerscore' && (sortDirection === 'asc' ? '▲' : '▼')}
                </button>
            </div>

            <table className="report-table">
                <thead>
                    <tr>
                        <th>Report ID</th>
                        <th>Comment ID</th>
                        <th>Comment Text</th>
                        <th>Number of Reports</th>
                        <th>Latest Report Time</th>
                        <th>Danger Score</th>
                        <th>Forum Link</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedReports().map((report) => (
                        <tr key={report.reportid}>
                            <td>{report.reportid}</td>
                            <td>{report.commentid}</td>
                            <td>{report.commenttext}</td>
                            <td>{report.report_count}</td>
                            <td>{report.latest_report_time}</td>
                            <td>{getDangerScoreIcon(report.dangerscore)}</td>
                            <td>
                                <button
                                    onClick={() => window.open(`/comments/${report.forumid}`, '_blank')}
                                    className="btn link-button"
                                >
                                    View Forum
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <button 
                type="button" 
                onClick={() => navigate('/select-waste')} 
                className="selectwaste-button"
            >
                Go to Select Waste Service
            </button>
        </div>
    );
};

export default Report;
