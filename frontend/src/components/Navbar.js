import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import API from '../utils/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await API.get('/notifications');
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">FYP Management System</Link>
      <div className="navbar-menu">
        <Link to="/">Dashboard</Link>
      </div>
      <div className="navbar-user">
        <div className="notification-badge">
          <FiBell size={20} />
          {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
        </div>
        <Link to="/profile"><FiUser size={20} /></Link>
        <button onClick={handleLogout} className="btn btn-sm btn-outline">
          <FiLogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
