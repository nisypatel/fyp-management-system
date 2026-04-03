// Purpose: Registration page for new student/faculty users.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import usePageTitle from '../hooks/usePageTitle';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student',
    department: 'CSE', enrollmentNumber: '', employeeId: '', phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  usePageTitle('Register | FYP Management');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client-side validation before we call the backend.
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = await register(formData);
    if (result.success) {
      toast.success('Registration successful!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-split-container">
        {/* Left side: lightweight branding and context text */}
        <div className="auth-left-pane register-left-pane">
          <div className="auth-image-content">
            <h2>Join FYP Management</h2>
            <p>Create an account to streamline your final year projects, collaborate with peers, and track your evaluations.</p>
          </div>
        </div>
        {/* Right side: beginner-friendly form with grouped fields */}
        <div className="auth-right-pane scrollable-right-pane">
          <div className="auth-card">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Register for FYP Management</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-groups-row">
                <div className="form-group flex-1">
                  <label className="form-label">Role</label>
                  <select name="role" className="form-select" value={formData.role} onChange={handleChange}>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Department</label>
                  <select name="department" className="form-select" value={formData.department} onChange={handleChange} required>
                    <option value="CSE">CSE</option>
                    <option value="CSE-AIML">CSE-AIML</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
              </div>
              {formData.role === 'student' && (
                <div className="form-group">
                  <label className="form-label">Enrollment Number</label>
                  <input type="text" name="enrollmentNumber" className="form-input" value={formData.enrollmentNumber} onChange={handleChange} required />
                </div>
              )}
              {formData.role === 'faculty' && (
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input type="text" name="employeeId" className="form-input" value={formData.employeeId} onChange={handleChange} required />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" name="phone" className="form-input" value={formData.phone} onChange={handleChange} pattern="[0-9]{10}" />
              </div>
              <div className="form-groups-row">
                <div className="form-group flex-1">
                  <label className="form-label">Password</label>
                  <div className="password-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" 
                      className="form-input" 
                      value={formData.password} 
                      onChange={handleChange} 
                      required 
                      minLength={6} 
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} title="Toggle Password Visibility">
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-wrapper">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      name="confirmPassword" 
                      className="form-input" 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      required 
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} title="Toggle Password Visibility">
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </form>
            <p className="text-center mt-2">Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
