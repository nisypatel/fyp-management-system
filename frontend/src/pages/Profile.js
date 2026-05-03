// Purpose: User profile screen for viewing/updating account and password.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import { isStrongPassword, isValidPhone } from '../utils/validation';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
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
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const avatarInitial = (user?.name || 'U').trim().charAt(0).toUpperCase();
  const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='#e2e8f0'/><text x='50%' y='55%' font-family='Arial, sans-serif' font-size='64' fill='#1e293b' text-anchor='middle'>${avatarInitial}</text></svg>`)}`;

  usePageTitle('Profile | FYP Management');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!isValidPhone(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    setShowProfileConfirm(true);
  };

  const confirmProfileUpdate = async () => {

    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(formData);
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
      setShowProfileConfirm(false);
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

    if (!isStrongPassword(passwordData.newPassword)) {
      toast.error('Password must be at least 8 characters and include letters and numbers');
      return;
    }

    setShowPasswordConfirm(true);
  };

  const handleDeactivateAccount = async () => {
    const shouldDeactivate = window.confirm('Are you sure you want to deactivate your account? This will log you out immediately.');
    if (!shouldDeactivate) return;

    setDeactivating(true);
    try {
      await authService.deactivateMyAccount();
      navigate('/login');
      toast.success('Your account has been deactivated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not deactivate account');
    }
    setDeactivating(false);
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP images are allowed');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile image must be 5MB or smaller');
      event.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const updatedUser = await authService.uploadProfileImage(file);
      updateUser(updatedUser);
      toast.success('Profile image updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload profile image');
    }
    setUploadingImage(false);
    event.target.value = '';
  };

  const confirmPasswordUpdate = async () => {

    setLoading(true);
    try {
      await authService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordConfirm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating password');
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <button className="btn btn-outline mb-2" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <h1 className="dashboard-title">Profile</h1>
        
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">User Information</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <img
                src={user?.avatar?.url || defaultAvatar}
                alt="Profile"
                style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
              />
              <div>
                <label className="btn btn-sm btn-outline" style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.7 : 1 }}>
                  {uploadingImage ? 'Uploading...' : 'Change Profile Photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleProfileImageChange}
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                  />
                </label>
                <small style={{ display: 'block', color: '#64748b', marginTop: '8px' }}>
                  JPG, PNG, WEBP up to 5MB
                </small>
              </div>
            </div>
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
            <div style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <span><strong>Note:</strong> Institutional details like your Email, Role, Department, and ID are locked. Please contact your administrator or coordinator to change them.</span>
            </div>
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

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Privacy</h2>
          </div>
          <div className="card-body">
            <p style={{ marginBottom: '12px', color: '#475569' }}>
              You can deactivate your account if you no longer need access. An admin can reactivate it later if required.
            </p>
            <button className="btn btn-danger" onClick={handleDeactivateAccount} disabled={deactivating}>
              {deactivating ? 'Deactivating...' : 'Deactivate My Account'}
            </button>
          </div>
        </div>
      </div>

      {showProfileConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setShowProfileConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#eab308' }}>Confirm Profile Update</h2>
              <button className="modal-close" onClick={() => setShowProfileConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Apply the profile changes now?</p>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => setShowProfileConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={confirmProfileUpdate} disabled={loading}>
                  {loading ? 'Updating...' : 'Yes, Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setShowPasswordConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#eab308' }}>Confirm Password Change</h2>
              <button className="modal-close" onClick={() => setShowPasswordConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to change your password?</p>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => setShowPasswordConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={confirmPasswordUpdate} disabled={loading}>
                  {loading ? 'Updating...' : 'Yes, Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
