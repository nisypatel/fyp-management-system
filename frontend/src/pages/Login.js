// Purpose: Login page for existing users.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import usePageTitle from '../hooks/usePageTitle';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  usePageTitle('Login | FYP Management');

  useEffect(() => {
    const clearLoginForm = () => {
      setFormData({ email: '', password: '' });
      setShowPassword(false);

      const clearDomValues = () => {
        if (emailRef.current) {
          emailRef.current.value = '';
        }
        if (passwordRef.current) {
          passwordRef.current.value = '';
        }
      };

      clearDomValues();
      requestAnimationFrame(clearDomValues);
      requestAnimationFrame(() => requestAnimationFrame(clearDomValues));
    };

    clearLoginForm();

    const handlePageShow = () => {
      clearLoginForm();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = formData.email.trim().toLowerCase();
    setLoading(true);

    const result = await login(email, formData.password);
    if (result.success) {
      toast.success('Login successful!');
      setFormData({ email: '', password: '' });
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
            <form onSubmit={handleSubmit} autoComplete="on" name="login-form">
              <input
                type="email"
                name="username"
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                value=""
                readOnly
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                tabIndex={-1}
                aria-hidden="true"
                value=""
                readOnly
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  ref={emailRef}
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password"
                    ref={passwordRef}
                    className="form-input" 
                    value={formData.password} 
                    onChange={handleChange}
                    autoComplete="new-password"
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
