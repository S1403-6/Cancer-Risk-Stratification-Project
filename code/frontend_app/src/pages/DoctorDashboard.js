import React, { useEffect, useState } from 'react';
import API from '../api/api';
import './DoctorDashboard.css';

function DoctorDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get('/doctor/reports');
      setReports(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyReport = async (reportId) => {
    const doctorComments = prompt('Enter your comments:');
    if (!doctorComments) return;

    const doctorScore = prompt('Enter risk score (0-1):');
    if (!doctorScore || isNaN(doctorScore)) {
      alert('Invalid score');
      return;
    }

    try {
      await API.put(`/doctor/verify/${reportId}`, {
        doctorComments,
        doctorScore: parseFloat(doctorScore),
      });
      alert('Report verified successfully');
      
      setReports(prev =>
        prev.map(r =>
          r.reportId === reportId 
            ? { ...r, isReviewed: true, status: 'Completed', doctorScore: parseFloat(doctorScore), doctorComments } 
            : r
        )
      );
    } catch (err) {
      console.error('Error verifying report:', err);
      alert('Failed to verify report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="doctor-dashboard">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">
      <div className="dashboard-header">
        <h2>🩺 Doctor Dashboard</h2>
        <button onClick={fetchReports} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {reports.length === 0 ? (
        <div className="no-reports">No reports available</div>
      ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>AI Risk Score</th>
                <th>Status</th>
                <th>Doctor Verified</th>
                <th>Doctor Score</th>
                <th>Comments</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.reportId} className={r.isReviewed ? 'verified' : 'pending'}>
                  <td>{r.patientName}</td>
                  <td>
                    <span className={`score ${r.score > 0.7 ? 'high' : r.score > 0.4 ? 'medium' : 'low'}`}>
                      {r.score?.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="verified-cell">
                    {r.isReviewed ? '✅ Yes' : '❌ No'}
                  </td>
                  <td>{r.doctorScore ? r.doctorScore.toFixed(2) : '-'}</td>
                  <td className="comments-cell">
                    {r.doctorComments || '-'}
                  </td>
                  <td>
                    {!r.isReviewed && (
                      <button 
                        onClick={() => verifyReport(r.reportId)}
                        className="verify-btn"
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;