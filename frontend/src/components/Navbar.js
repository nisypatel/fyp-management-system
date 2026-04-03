// Purpose: Top navigation shared across all protected pages.
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiUser, FiLogOut, FiHome } from 'react-icons/fi';
import { notificationService } from '../services/notificationService';
import '../styles/navbar.css';

const Navbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notificationId) => {
    handleMarkAsRead(notificationId);
    navigate('/notifications');
    setShowDropdown(false);
  };

  const handleLogout = async () => {
    // Wait for cookie logout API so UI and backend session stay in sync.
    await logout();
    navigate('/login');
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">FYP Management System</Link>
      <div className="navbar-user">
        <div className="navbar-icon-group">
          <Link to="/" className="navbar-icon-link" title="Dashboard" aria-label="Go to dashboard">
            <FiHome size={18} />
          </Link>
          <div className="notification-container">
            <button 
              className="notification-badge"
              onClick={() => setShowDropdown(!showDropdown)}
              title="Notifications"
              aria-label="Open notifications"
            >
              <FiBell size={18} />
              {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </button>
            
            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  <Link to="/notifications" className="view-all-link">View All</Link>
                </div>
                <div className="notification-list">
                  {recentNotifications.length === 0 ? (
                    <p className="no-notifications">No notifications</p>
                  ) : (
                    recentNotifications.map((notif) => (
                      <div 
                        key={notif._id}
                        className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                        onClick={() => handleNotificationClick(notif._id)}
                      >
                        <div className="notification-content">
                          <p className="notification-title">{notif.title}</p>
                          <p className="notification-message">{notif.message}</p>
                          <small className="notification-time">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        {!notif.isRead && <div className="unread-indicator"></div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <Link to="/profile" className="navbar-icon-link" title="Profile" aria-label="Go to profile">
            <FiUser size={18} />
          </Link>
        </div>
        <button onClick={handleLogout} className="btn btn-sm btn-outline">
          <FiLogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
