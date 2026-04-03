// Purpose: Admin dashboard for project approvals and user management.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUsers, FiFolder, FiCheckCircle, FiClock, FiPlus, FiEdit, FiTrash } from 'react-icons/fi';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import { getStatusBadgeClass } from '../utils/statusUtils';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import DashboardHeader from '../components/ui/DashboardHeader';
import StatsCard from '../components/ui/StatsCard';
import StatusBadge from '../components/ui/StatusBadge';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
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

  const [statusFilter, setStatusFilter] = useState('All');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  // Add the newly filtered projects logic here!
  const filteredProjects = projects.filter(project => {
    if (statusFilter === 'All') return true;
    return project.adminStatus.toLowerCase() === statusFilter.toLowerCase();
  });

  // Filter users logic
  const filteredUsers = users.filter(user => {
    if (userRoleFilter === 'All') return true;
    return user.role.toLowerCase() === userRoleFilter.toLowerCase();
  });

  usePageTitle('Admin Dashboard | FYP Management');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [activeTab, user]);

  const fetchDashboardData = async () => {
    try {
      const dashboardStats = await userService.getDashboardStats();
      setStats(dashboardStats);

      if (activeTab === 'projects') {
        const allProjects = await projectService.getProjects();
        setProjects(allProjects);
      } else if (activeTab === 'users') {
        const allUsers = await userService.getUsers();
        setUsers(allUsers);
      }
    } catch (error) {
      if (error.response && error.response.status !== 401) {
        toast.error('Error loading dashboard data');
      }
    }
  };

  const handleProjectApproval = async (projectId, status) => {
    setLoading(true);
    try {
      await projectService.adminApprove(projectId, status);
      toast.success(`Project ${status} successfully!`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating project');
    }
    setLoading(false);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (editUser) {
      setShowUpdateConfirm(true);
      return;
    }
    
    setLoading(true);
    try {
      await userService.createUser(userForm);
      toast.success('User created successfully!');
      setShowUserModal(false);
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating user');
    }
    setLoading(false);
  };

  const confirmUpdateUser = async () => {
    setLoading(true);
    try {
      await userService.updateUser(editUser._id, userForm);
      toast.success('User updated successfully!');
      setShowUpdateConfirm(false);
      setShowUserModal(false);
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating user');
    }
    setLoading(false);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await userService.deleteUser(userToDelete._id);
      toast.success('User deleted successfully!');
      setUserToDelete(null);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting user');
    }
    setLoading(false);
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

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <DashboardHeader title="Admin Dashboard" subtitle="Manage users and projects" />

        {/* Stats Cards */}
        <div className="stats-grid">
          <StatsCard 
            onClick={() => { setActiveTab('users'); setUserRoleFilter('student'); }} 
            icon={FiUsers} variant="primary" value={stats.totalStudents} label="Total Students" />
          <StatsCard 
            onClick={() => { setActiveTab('users'); setUserRoleFilter('teacher'); }} 
            icon={FiUsers} variant="success" value={stats.totalTeachers} label="Total Teachers" />
          <StatsCard 
            onClick={() => { setActiveTab('projects'); setStatusFilter('All'); }} 
            icon={FiFolder} variant="primary" value={stats.totalProjects} label="Total Projects" />
          <StatsCard 
            onClick={() => { setActiveTab('projects'); setStatusFilter('pending'); }} 
            icon={FiClock} variant="warning" value={stats.pendingProjects} label="Pending Approval" />
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="card-header">
            <div className="flex-between" style={{ width: '100%' }}>
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
                  onClick={() => { setActiveTab('users'); setUserRoleFilter('All'); }}
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
                <StatsCard icon={FiCheckCircle} variant="success" value={stats.approvedProjects} label="Approved Projects" />
                <StatsCard icon={FiFolder} variant="primary" value={stats.inProgressProjects} label="In Progress" />
                <StatsCard icon={FiCheckCircle} variant="success" value={stats.completedProjects} label="Completed" />
              </div>
            )}

            {activeTab === 'projects' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <select 
                    className="form-select" 
                    style={{ width: '200px' }} 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Projects</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
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
                      {filteredProjects.length === 0 ? (
                        <tr><td colSpan="7" style={{textAlign: "center", padding: "2rem"}}>No projects found.</td></tr>
                      ) : filteredProjects.map(project => (
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
                                <StatusBadge status={project.supervisorStatus} />
                              </>
                            ) : (
                              <span className="badge badge-secondary">No Supervisor</span>
                            )}
                          </td>
                          <td>{project.category}</td>
                          <td>
                            <StatusBadge status={project.status} />
                          </td>
                          <td>
                            <StatusBadge status={project.adminStatus} />
                          </td>
                          <td>
                            <div className="flex gap-1" style={{ flexWrap: 'nowrap' }}>
                              {project.adminStatus === 'pending' && (
                                <>
                                  <button
                                    style={{ whiteSpace: 'nowrap' }}
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleProjectApproval(project._id, 'approved')}
                                    disabled={loading}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    style={{ whiteSpace: 'nowrap' }}
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleProjectApproval(project._id, 'rejected')}
                                    disabled={loading}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                style={{ whiteSpace: 'nowrap' }}
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
              </>
            )}

            {activeTab === 'users' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <select 
                    className="form-select" 
                    style={{ width: '200px' }} 
                    value={userRoleFilter} 
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                  >
                    <option value="All">All Users</option>
                    <option value="student">Students Only</option>
                    <option value="teacher">Teachers Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>
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
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan="7" style={{textAlign: "center", padding: "2rem"}}>No users found for this role.</td></tr>
                      ) : filteredUsers.map(user => (
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
                            <div className="flex gap-1" style={{ flexWrap: 'nowrap' }}>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleEditUser(user)}
                              >
                                <FiEdit />
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteUser(user)}
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
              </>
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

        {/* Update Confirmation Modal UI */}
        {showUpdateConfirm && (
          <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setShowUpdateConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: '#eab308' }}>Confirm Edit</h2>
                <button className="modal-close" onClick={() => setShowUpdateConfirm(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to apply these changes to <strong>{editUser?.name}</strong>?</p>
                <div className="modal-footer" style={{ marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowUpdateConfirm(false)}>
                    Go Back
                  </button>
                  <button className="btn btn-primary" onClick={confirmUpdateUser} disabled={loading}>
                    Yes, Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal UI */}
        {userToDelete && (
          <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setUserToDelete(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: '#ef4444' }}>Delete User!</h2>
                <button className="modal-close" onClick={() => setUserToDelete(null)}>×</button>
              </div>
              <div className="modal-body">
                <p>Delete <strong>{userToDelete?.name}</strong> forever? This action is not reversible.</p>
                <div className="modal-footer" style={{ marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setUserToDelete(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={confirmDeleteUser} disabled={loading}>
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;
