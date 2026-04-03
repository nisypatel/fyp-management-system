import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import usePageTitle from '../hooks/usePageTitle';

const ForgotPassword = () => {
  usePageTitle('Forgot Password | FYP System');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setMessage('An email has been sent with password reset instructions.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-split">
        <div className="auth-left-pane">
          <div className="auth-image-content">
            <h2>Account Recovery</h2>
            <p>Don't worry, we'll help you get back to your projects.</p>
          </div>
        </div>
        <div className="auth-right-pane">
          <div className="auth-card">
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">Enter your email to reset your password</p>

            {error && <div style={{ color: '#E11D48', marginBottom: '1rem', backgroundColor: '#FCE4E4', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #E11D48' }}>{error}</div>}
            {message && <div style={{ color: '#065F46', marginBottom: '1rem', backgroundColor: '#D1FAE5', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #10B981' }}>{message}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter your registered email"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="text-center mt-2">Remember your password? <Link to="/login">Login</Link></p>
            <p className="text-center mt-1">Don't have an account? <Link to="/register">Register</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;