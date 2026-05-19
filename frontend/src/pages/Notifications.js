// Purpose: Dedicated page to view and manage all notifications.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { notificationService } from '../services/notificationService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import { formatDateTime } from '../utils/dateFormat';
import '../styles/notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  usePageTitle('Notifications | FYP Management');

  const fetchNotifications = useCallback(async () => {
    try {
      setError('');
      const readFilter = filter === 'all' ? undefined : String(filter === 'read');
      const data = await notificationService.getNotifications({ page, limit: 20, read: readFilter });
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      setError(error.response?.data?.message || 'Error loading notifications');
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((current) => current.map((item) => (
        item._id === notificationId ? { ...item, isRead: true } : item
      )));
    } catch (error) {
      toast.error('Error marking notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success('All notifications marked as read');
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      toast.error('Error marking all as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      toast.success('Notification deleted');
      setNotifications((current) => current.filter((item) => item._id !== notificationId));
    } catch (error) {
      toast.error('Error deleting notification');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await notificationService.deleteAllNotifications();
      toast.success('All notifications deleted');
      setShowDeleteAllConfirm(false);
      setNotifications([]);
    } catch (error) {
      toast.error('Error deleting notifications');
    }
  };

  const filteredNotifications = notifications;

  const getStatusBadgeColor = (eventType) => {
    const colors = {
      team_invited: '#007bff',
      team_invite_accepted: '#28a745',
      team_invite_rejected: '#dc3545',
      phase_submitted: '#17a2b8',
      phase_approved: '#28a745',
      phase_rejected: '#dc3545',
      code_review_submitted: '#6f42c1',
      code_review_approved: '#28a745',
      code_review_rejected: '#dc3545',
      supervisor_requested: '#ffc107',
      supervisor_accepted: '#28a745',
      supervisor_rejected: '#dc3545',
      admin_approved: '#28a745',
      admin_rejected: '#dc3545',
      feedback_received: '#17a2b8',
      document_uploaded: '#6c757d',
      project_submitted: '#007bff',
      general: '#6c757d'
    };
    return colors[eventType] || '#6c757d';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="notifications-page">
        <div className="notifications-container">
          <div className="notifications-header-bar">
            <button className="btn btn-outline" onClick={() => navigate(-1)}>
              <FiArrowLeft /> Back
            </button>
          </div>

          <div className="card notifications-card">
            <div className="card-header">
              <div className="flex-between">
                <h2 className="card-title">Notifications</h2>
                <div className="notification-actions">
                  {notifications.some((n) => !n.isRead) && (
                    <button className="btn btn-sm btn-outline" onClick={handleMarkAllAsRead}>
                      <FiCheckCircle /> Mark all as read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button className="btn btn-sm btn-outline" onClick={() => setShowDeleteAllConfirm(true)}>
                      <FiTrash2 /> Delete all
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="notification-filters">
                <button
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => { setFilter('all'); setPage(1); }}
                >
                  All ({notifications.length})
                </button>
                <button
                  className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => { setFilter('unread'); setPage(1); }}
                >
                  Unread ({notifications.filter((n) => !n.isRead).length})
                </button>
                <button
                  className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                  onClick={() => { setFilter('read'); setPage(1); }}
                >
                  Read ({notifications.filter((n) => n.isRead).length})
                </button>
              </div>

              {error && (
                <div className="empty-state">
                  <p>{error}</p>
                </div>
              )}

              {!error && filteredNotifications.length === 0 ? (
                <div className="empty-state">
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {filteredNotifications.map((notif) => (
                    <div key={notif._id} className={`notification-card ${notif.isRead ? 'read' : 'unread'}`}>
                      <div className="notification-card-body">
                        <div className="notification-header-row">
                          <div className="notification-info">
                            <div className="notification-title-row">
                              <span
                                className="event-badge"
                                style={{ backgroundColor: getStatusBadgeColor(notif.type) }}
                              >
                                {notif.type.replace(/_/g, ' ')}
                              </span>
                              <h3 className="notification-card-title">{notif.title}</h3>
                            </div>
                            <p className="notification-card-message">{notif.message}</p>
                            <small className="notification-card-time">
                              {formatDateTime(notif.createdAt)}
                            </small>
                          </div>
                          {!notif.isRead && <div className="unread-dot"></div>}
                        </div>
                        <div className="notification-card-actions">
                          {!notif.isRead && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleMarkAsRead(notif._id)}
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteNotification(notif._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!error && totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Previous
                  </button>
                  <small>Page {page} of {totalPages}</small>
                  <button className="btn btn-sm btn-outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteAllConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#ef4444' }}>Delete All Notifications</h2>
              <button className="modal-close" onClick={() => setShowDeleteAllConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>This will remove all notifications permanently. Do you want to continue?</p>
              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => setShowDeleteAllConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDeleteAll}>
                  Yes, Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications;
