// Purpose: User profile screen for viewing/updating account and password.
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  usePageTitle('Profile | FYP Management');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to update your profile details?')) {
      return;
    }
    
    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(formData);
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Error updating profile');
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (!window.confirm('Are you sure you want to change your password? You will be required to use the new password on your next login.')) {
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating password');
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <h1 className="dashboard-title">Profile</h1>
        
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">User Information</h2>
          </div>
          <div className="card-body">
            <div className="user-details-grid">
              <div className="user-detail-item">
                <span className="user-detail-label">Name</span>
                <span className="user-detail-value">{user?.name}</span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Email</span>
                <span className="user-detail-value">{user?.email}</span>
              </div>
              <div className="user-detail-item">
                <span className="user-detail-label">Role</span>
                <span className="user-detail-value">
                  <span className="badge badge-primary">{user?.role?.toUpperCase()}</span>
                </span>
              </div>
              {user?.department && (
                <div className="user-detail-item">
                  <span className="user-detail-label">Department</span>
                  <span className="user-detail-value">{user.department}</span>
                </div>
              )}
              {user?.enrollmentNumber && (
                <div className="user-detail-item">
                  <span className="user-detail-label">Enrollment Number</span>
                  <span className="user-detail-value">{user.enrollmentNumber}</span>
                </div>
              )}
              {user?.employeeId && (
                <div className="user-detail-item">
                  <span className="user-detail-label">Employee ID</span>
                  <span className="user-detail-value">{user.employeeId}</span>
                </div>
              )}
              {user?.phone && (
                <div className="user-detail-item">
                  <span className="user-detail-label">Phone</span>
                  <span className="user-detail-value">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Update Profile</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  pattern="[0-9]{10}"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Change Password</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handlePasswordUpdate}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div className="password-wrapper">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="form-input"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="password-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-input"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    placeholder="Min 8 chars, letters & numbers"
                    minLength={8}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-input"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
