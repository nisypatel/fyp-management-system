import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import usePageTitle from '../hooks/usePageTitle';

const ResetPassword = () => {
  usePageTitle('Reset Password | FYP System');
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password);
      setMessage('Password reset successful. You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link might be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-split">
        <div className="auth-left-pane">
          <div className="auth-image-content">
            <h2>Secure Access</h2>
            <p>Update your credentials safely.</p>
          </div>
        </div>
        <div className="auth-right-pane">
          <div className="auth-card">
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter your new strong password</p>

            {error && <div style={{ color: '#E11D48', marginBottom: '1rem', backgroundColor: '#FCE4E4', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #E11D48' }}>{error}</div>}
            {message && <div style={{ color: '#065F46', marginBottom: '1rem', backgroundColor: '#D1FAE5', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #10B981' }}>{message}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Minimum 8 chars, letters and numbers"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Re-enter your new password"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;