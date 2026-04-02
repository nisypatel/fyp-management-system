import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUsers, FiClock, FiCheckCircle, FiFolder } from 'react-icons/fi';
import API from '../utils/api';
import Navbar from '../components/Navbar';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('assigned');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, projectsRes, requestsRes] = await Promise.all([
        API.get('/users/stats/dashboard'),
        API.get('/projects'),
        API.get('/projects/supervisor/requests')
      ]);
      setStats(statsRes.data.stats);
      setProjects(projectsRes.data.projects);
      setRequests(requestsRes.data.projects);
    } catch (error) {
      toast.error('Error loading dashboard data');
    }
  };

  const handleSupervisorResponse = async (projectId, status) => {
    setLoading(true);
    try {
      await API.put(`/projects/${projectId}/supervisor-response`, { status });
      toast.success(`Request ${status} successfully!`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing request');
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      proposal: 'badge-warning',
      'in-progress': 'badge-primary',
      completed: 'badge-success',
      rejected: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Welcome, {user?.name}!</h1>
            <p className="dashboard-subtitle">Teacher Dashboard</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <FiUsers />
            </div>
            <div className="stat-info">
              <h3>{stats.totalAssigned || 0}</h3>
              <p>Assigned Projects</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon warning">
              <FiClock />
            </div>
            <div className="stat-info">
              <h3>{stats.pendingRequests || 0}</h3>
              <p>Pending Requests</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon primary">
              <FiFolder />
            </div>
            <div className="stat-info">
              <h3>{stats.inProgress || 0}</h3>
              <p>In Progress</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon success">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <h3>{stats.completed || 0}</h3>
              <p>Completed</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="card-header">
            <div className="flex gap-2">
              <button
                className={`btn ${activeTab === 'assigned' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('assigned')}
              >
                Assigned Projects ({projects.length})
              </button>
              <button
                className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab('requests')}
              >
                Supervision Requests ({requests.length})
              </button>
            </div>
          </div>
          <div className="card-body">
            {activeTab === 'assigned' && (
              <>
                {projects.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FiFolder size={48} />
                    </div>
                    <p>No assigned projects yet.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Project Title</th>
                          <th>Student</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map(project => (
                          <tr key={project._id}>
                            <td>{project.title}</td>
                            <td>
                              {project.student.name}
                              <br />
                              <small>{project.student.enrollmentNumber}</small>
                            </td>
                            <td>{project.category}</td>
                            <td>
                              <span className={`badge ${getStatusBadge(project.status)}`}>
                                {project.status}
                              </span>
                            </td>
                            <td>
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                              <small>{project.progress}%</small>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(`/project/${project._id}`)}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'requests' && (
              <>
                {requests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FiClock size={48} />
                    </div>
                    <p>No pending supervision requests.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Project Title</th>
                          <th>Student</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map(project => (
                          <tr key={project._id}>
                            <td>{project.title}</td>
                            <td>
                              {project.student.name}
                              <br />
                              <small>{project.student.enrollmentNumber}</small>
                              <br />
                              <small>{project.student.email}</small>
                            </td>
                            <td>{project.category}</td>
                            <td>
                              <small>{project.description.substring(0, 100)}...</small>
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleSupervisorResponse(project._id, 'accepted')}
                                  disabled={loading}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleSupervisorResponse(project._id, 'rejected')}
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => navigate(`/project/${project._id}`)}
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TeacherDashboard;
