import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUsers, FiFolder, FiCheckCircle, FiClock, FiPlus, FiEdit, FiTrash } from 'react-icons/fi';
import API from '../utils/api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    enrollmentNumber: '',
    employeeId: '',
    phone: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await API.get('/users/stats/dashboard');
      setStats(statsRes.data.stats);

      if (activeTab === 'projects') {
        const projectsRes = await API.get('/projects');
        setProjects(projectsRes.data.projects);
      } else if (activeTab === 'users') {
        const usersRes = await API.get('/users');
        setUsers(usersRes.data.users);
      }
    } catch (error) {
      toast.error('Error loading dashboard data');
    }
  };

  const handleProjectApproval = async (projectId, status) => {
    setLoading(true);
    try {
      await API.put(`/projects/${projectId}/admin-approval`, { status });
      toast.success(`Project ${status} successfully!`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating project');
    }
    setLoading(false);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editUser) {
        await API.put(`/users/${editUser._id}`, userForm);
        toast.success('User updated successfully!');
      } else {
        await API.post('/users', userForm);
        toast.success('User created successfully!');
      }
      setShowUserModal(false);
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving user');
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await API.delete(`/users/${userId}`);
      toast.success('User deleted successfully!');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting user');
    }
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      enrollmentNumber: user.enrollmentNumber || '',
      employeeId: user.employeeId || '',
      phone: user.phone || ''
    });
    setShowUserModal(true);
  };

  const resetUserForm = () => {
    setEditUser(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'student',
      department: '',
      enrollmentNumber: '',
      employeeId: '',
      phone: ''
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      proposal: 'badge-warning',
      'in-progress': 'badge-primary',
      completed: 'badge-success',
      rejected: 'badge-danger',
      pending: 'badge-warning',
      approved: 'badge-success'
    };
    return badges[status] || 'badge-secondary';
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Admin Dashboard</h1>
            <p className="dashboard-subtitle">Manage users and projects</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <FiUsers />
            </div>
            <div className="stat-info">
              <h3>{stats.totalStudents || 0}</h3>
              <p>Total Students</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon success">
              <FiUsers />
            </div>
            <div className="stat-info">
              <h3>{stats.totalTeachers || 0}</h3>
              <p>Total Teachers</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon primary">
              <FiFolder />
            </div>
            <div className="stat-info">
              <h3>{stats.totalProjects || 0}</h3>
              <p>Total Projects</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon warning">
              <FiClock />
            </div>
            <div className="stat-info">
              <h3>{stats.pendingProjects || 0}</h3>
              <p>Pending Approval</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="card-header">
            <div className="flex-between">
              <div className="flex gap-2">
                <button
                  className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('projects')}
                >
                  Projects
                </button>
                <button
                  className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('users')}
                >
                  Users
                </button>
              </div>
              {activeTab === 'users' && (
                <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                  <FiPlus /> Add User
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            {activeTab === 'overview' && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon success">
                    <FiCheckCircle />
                  </div>
                  <div className="stat-info">
                    <h3>{stats.approvedProjects || 0}</h3>
                    <p>Approved Projects</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon primary">
                    <FiFolder />
                  </div>
                  <div className="stat-info">
                    <h3>{stats.inProgressProjects || 0}</h3>
                    <p>In Progress</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon success">
                    <FiCheckCircle />
                  </div>
                  <div className="stat-info">
                    <h3>{stats.completedProjects || 0}</h3>
                    <p>Completed</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Student</th>
                      <th>Supervisor</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Admin Status</th>
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
                        <td>
                          {project.supervisor ? (
                            <>
                              {project.supervisor.name}
                              <br />
                              <span className={`badge ${getStatusBadge(project.supervisorStatus)}`}>
                                {project.supervisorStatus}
                              </span>
                            </>
                          ) : (
                            <span className="badge badge-secondary">No Supervisor</span>
                          )}
                        </td>
                        <td>{project.category}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(project.status)}`}>
                            {project.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(project.adminStatus)}`}>
                            {project.adminStatus}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {project.adminStatus === 'pending' && (
                              <>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleProjectApproval(project._id, 'approved')}
                                  disabled={loading}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleProjectApproval(project._id, 'rejected')}
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                              </>
                            )}
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

            {activeTab === 'users' && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>ID Number</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className="badge badge-primary">
                            {user.role}
                          </span>
                        </td>
                        <td>{user.department}</td>
                        <td>
                          {user.enrollmentNumber || user.employeeId || '-'}
                        </td>
                        <td>
                          <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleEditUser(user)}
                            >
                              <FiEdit />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              <FiTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* User Modal */}
        {showUserModal && (
          <div className="modal-overlay" onClick={() => { setShowUserModal(false); resetUserForm(); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editUser ? 'Edit User' : 'Create New User'}</h2>
                <button className="modal-close" onClick={() => { setShowUserModal(false); resetUserForm(); }}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUserSubmit}>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                    />
                  </div>

                  {!editUser && (
                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select
                      className="form-select"
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      required
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {(userForm.role === 'student' || userForm.role === 'teacher') && (
                    <div className="form-group">
                      <label className="form-label">Department *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={userForm.department}
                        onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {userForm.role === 'student' && (
                    <div className="form-group">
                      <label className="form-label">Enrollment Number *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={userForm.enrollmentNumber}
                        onChange={(e) => setUserForm({ ...userForm, enrollmentNumber: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {userForm.role === 'teacher' && (
                    <div className="form-group">
                      <label className="form-label">Employee ID *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={userForm.employeeId}
                        onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      pattern="[0-9]{10}"
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setShowUserModal(false); resetUserForm(); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : (editUser ? 'Update User' : 'Create User')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;
