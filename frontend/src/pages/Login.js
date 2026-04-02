// Purpose: Login page for existing users.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import usePageTitle from '../hooks/usePageTitle';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  usePageTitle('Login | FYP Management');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Call context login: backend sets secure cookie, then we route to dashboard.
    const result = await login(formData.email, formData.password);
    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-split-container">
        {/* Left side: visual context + short message */}
        <div className="auth-left-pane">
          <div className="auth-image-content">
            <h2>Welcome Back!</h2>
            <p>Access your FYP Management dashboard to manage projects and track your progress efficiently.</p>
          </div>
        </div>
        {/* Right side: simple, focused login form */}
        <div className="auth-right-pane">
          <div className="auth-card">
            <h1 className="auth-title">FYP Management</h1>
            <p className="auth-subtitle">Sign in to your account</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    className="form-input" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} title="Toggle Password Visibility">
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className="text-center mt-2"><Link to="/forgot-password">Forgot Password?</Link></p>
            <p className="text-center mt-1">Don't have an account? <Link to="/register">Register</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
