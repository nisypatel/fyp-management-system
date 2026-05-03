// Purpose: Admin dashboard for project approvals and user management.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUsers, FiFolder, FiCheckCircle, FiClock, FiPlus, FiEdit, FiTrash } from 'react-icons/fi';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import { presetService } from '../services/presetService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import DashboardHeader from '../components/ui/DashboardHeader';
import StatsCard from '../components/ui/StatsCard';
import StatusBadge from '../components/ui/StatusBadge';

const DEPARTMENTS = [
  'Computer Science',
  'Electronics Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Business Administration',
  'Other'
];

const createPhaseRow = (title = '') => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title
});

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('projects');
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
  const [projectSearch, setProjectSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [phaseTemplate, setPhaseTemplate] = useState([]);
  const [phaseTemplateLoading, setPhaseTemplateLoading] = useState(false);
  const [savingPhaseTemplate, setSavingPhaseTemplate] = useState(false);
  const [presets, setPresets] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [verificationDomain, setVerificationDomain] = useState('');
  const [savingVerificationDomain, setSavingVerificationDomain] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetPhases, setPresetPhases] = useState([createPhaseRow('Phase 1')]);
  const [presetSaving, setPresetSaving] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  // Pagination state
  const [projectsPagination, setProjectsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Add the newly filtered projects logic here!
  const filteredProjects = projects.filter(project => {
    if (statusFilter === 'All') return true;
    const filterLower = statusFilter.toLowerCase();
    if (['pending', 'approved', 'rejected'].includes(filterLower)) {
      return project.adminStatus.toLowerCase() === filterLower;
    }
    return project.status.toLowerCase() === filterLower;
  });

  // Filter users logic
  const filteredUsers = users.filter(user => {
    if (userRoleFilter === 'All') return true;
    return user.role.toLowerCase() === userRoleFilter.toLowerCase();
  });

  usePageTitle('Admin Dashboard | FYP Management');

  const fetchDashboardData = useCallback(async () => {
    try {
      const dashboardStats = await userService.getDashboardStats();
      setStats(dashboardStats);

      if (activeTab === 'projects') {
        const projectsResponse = await projectService.getProjects({
          page: projectsPagination.page,
          limit: projectsPagination.limit,
          q: projectSearch.trim() || undefined
        });
        setProjects(projectsResponse.projects || []);
        setProjectsPagination(prev => ({
          ...prev,
          total: projectsResponse.total || 0,
          totalPages: projectsResponse.totalPages || 0
        }));
      } else if (activeTab === 'users') {
        const usersResponse = await userService.getUsers({
          page: usersPagination.page,
          limit: usersPagination.limit,
          role: userRoleFilter !== 'All' ? userRoleFilter : undefined,
          q: userSearch.trim() || undefined
        });
        setUsers(usersResponse.users || []);
        setUsersPagination(prev => ({
          ...prev,
          total: usersResponse.total || 0,
          totalPages: usersResponse.totalPages || 0
        }));
      } else if (activeTab === 'phases') {
        setPhaseTemplateLoading(true);
        const response = await projectService.getPhaseTemplate();
        const rows = (response.phases || []).map((phase) => createPhaseRow(phase.title));
        setPhaseTemplate(rows.length ? rows : [createPhaseRow('Phase 1')]);
        setPhaseTemplateLoading(false);
      } else if (activeTab === 'presets') {
        const presetsData = await presetService.getPresets();
        setPresets(presetsData);
      } else if (activeTab === 'verification') {
        const [verifications, verificationConfig] = await Promise.all([
          userService.getPendingVerifications(),
          userService.getVerificationConfig()
        ]);
        setPendingVerifications(verifications);
        setVerificationDomain(verificationConfig.verificationDomain || '');
      }
    } catch (error) {
      if (activeTab === 'phases') {
        setPhaseTemplateLoading(false);
      }
      if (error.response && error.response.status !== 401) {
        toast.error('Error loading dashboard data');
      }
    }
  }, [activeTab, projectsPagination.page, projectsPagination.limit, usersPagination.page, usersPagination.limit, projectSearch, userSearch, userRoleFilter]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [activeTab, user, fetchDashboardData]);

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

  const openPresetModal = () => {
    setEditingPreset(null);
    setPresetName('');
    setPresetPhases([createPhaseRow('Phase 1')]);
    setShowPresetModal(true);
  };

  const openPresetViewModal = (preset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetPhases(
      (preset.phases || []).map((phase, index) =>
        createPhaseRow(phase.title || `Phase ${index + 1}`)
      )
    );
    setShowPresetModal(true);
  };

  const closePresetModal = () => {
    setEditingPreset(null);
    setShowPresetModal(false);
  };

  const addPresetPhaseRow = () => {
    setPresetPhases(prev => [...prev, createPhaseRow(`Phase ${prev.length + 1}`)]);
  };

  const removePresetPhaseRow = (id) => {
    if (presetPhases.length <= 1) return;
    setPresetPhases(prev => prev.filter((phase) => phase.id !== id));
  };

  const movePresetPhaseRow = (id, direction) => {
    setPresetPhases((prev) => {
      const index = prev.findIndex((phase) => phase.id === id);
      if (index === -1) return prev;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handlePresetPhaseChange = (id, value) => {
    setPresetPhases(prev => prev.map((phase) => (phase.id === id ? { ...phase, title: value } : phase)));
  };

  const handleSavePreset = async (e) => {
    e.preventDefault();
    if (!presetName.trim()) {
      toast.error('Preset name is required');
      return;
    }

    setPresetSaving(true);
    try {
      const payload = {
        name: presetName.trim(),
        phases: presetPhases.map((phase) => ({ title: phase.title || 'Untitled Phase' }))
      };

      if (editingPreset) {
        await presetService.updatePreset(editingPreset._id, payload);
        toast.success('Preset updated successfully');
      } else {
        await presetService.createPreset(payload);
        toast.success('Preset created successfully');
      }

      setShowPresetModal(false);
      setEditingPreset(null);
      setPresetName('');
      setPresetPhases([createPhaseRow('Phase 1')]);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save preset');
    } finally {
      setPresetSaving(false);
    }
  };

  // Pagination handlers
  const handleProjectsPageChange = (newPage) => {
    setProjectsPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleUsersPageChange = (newPage) => {
    setUsersPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleProjectsLimitChange = (newLimit) => {
    setProjectsPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleUsersLimitChange = (newLimit) => {
    setUsersPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const renderPaginationControls = (pagination, onPageChange, onLimitChange) => {
    const totalPages = pagination.totalPages || 1;
    const currentPage = Math.min(pagination.page, totalPages);

    return (
      <div
        className="flex-between"
        style={{
          marginTop: '12px',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Showing page {currentPage} of {totalPages} ({pagination.total || 0} records)
        </div>

        <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor={`limit-${activeTab}`} style={{ fontSize: '0.9rem', color: '#475569' }}>
            Rows:
          </label>
          <select
            id={`limit-${activeTab}`}
            className="form-select"
            style={{ width: '90px' }}
            value={pagination.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <button
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const updatePhaseTitle = (id, title) => {
    setPhaseTemplate((current) => current.map((phase) => (phase.id === id ? { ...phase, title } : phase)));
  };

  const addPhaseRow = () => {
    setPhaseTemplate((current) => [...current, createPhaseRow(`Phase ${current.length + 1}`)]);
  };

  const removePhaseRow = (id) => {
    setPhaseTemplate((current) => {
      if (current.length <= 1) {
        toast.error('At least one phase is required');
        return current;
      }
      return current.filter((phase) => phase.id !== id);
    });
  };

  const movePhaseRow = (index, direction) => {
    setPhaseTemplate((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const reordered = [...current];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
  };

  const savePhaseTemplate = async () => {
    const payload = phaseTemplate.map((phase) => ({ title: phase.title.trim() })).filter((phase) => phase.title);

    if (!payload.length) {
      toast.error('Please keep at least one valid phase title');
      return;
    }

    const hasDuplicate = new Set(payload.map((phase) => phase.title.toLowerCase())).size !== payload.length;
    if (hasDuplicate) {
      toast.error('Phase titles must be unique');
      return;
    }

    setSavingPhaseTemplate(true);
    try {
      const response = await projectService.updatePhaseTemplate(payload);
      const rows = (response.phases || []).map((phase) => createPhaseRow(phase.title));
      setPhaseTemplate(rows);
      toast.success('Phase template updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating phase template');
    }
    setSavingPhaseTemplate(false);
  };

  // Preset handlers
  const handleActivatePreset = async (presetId) => {
    try {
      await presetService.activatePreset(presetId);
      toast.success('Preset activated successfully');
      // Refresh presets
      const updatedPresets = await presetService.getPresets();
      setPresets(updatedPresets);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error activating preset');
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (!window.confirm('Are you sure you want to delete this preset?')) return;
    
    try {
      await presetService.deletePreset(presetId);
      toast.success('Preset deleted successfully');
      // Refresh presets
      const updatedPresets = await presetService.getPresets();
      setPresets(updatedPresets);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting preset');
    }
  };

  // Verification handlers
  const handleReviewVerification = async (userId, status, notes) => {
    try {
      await userService.reviewIDCardVerification(userId, status, notes);
      toast.success(`Verification ${status} successfully`);
      // Refresh pending verifications
      const updatedVerifications = await userService.getPendingVerifications();
      setPendingVerifications(updatedVerifications);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error reviewing verification');
    }
  };

  const handleSaveVerificationDomain = async () => {
    if (!verificationDomain.trim()) {
      toast.error('Please enter a verification domain');
      return;
    }

    try {
      setSavingVerificationDomain(true);
      const response = await userService.updateVerificationConfig(verificationDomain.trim());
      setVerificationDomain(response.verificationDomain || verificationDomain.trim());
      toast.success('Verification domain updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update verification domain');
    } finally {
      setSavingVerificationDomain(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <DashboardHeader title="Admin Dashboard" subtitle="Manage users and projects" />

        {/* Stats Cards */}
        <div className="stats-grid">
          <StatsCard 
            onClick={() => { setActiveTab('users'); setUserRoleFilter('All'); }} 
            icon={FiUsers} variant="warning" value={stats.totalUsers} label="Total Users" />
          <StatsCard 
            onClick={() => { setActiveTab('users'); setUserRoleFilter('student'); }} 
            icon={FiUsers} variant="primary" value={stats.totalStudents} label="Total Students" />
          <StatsCard 
            onClick={() => { setActiveTab('users'); setUserRoleFilter('faculty'); }} 
            icon={FiUsers} variant="success" value={stats.totalFaculty} label="Total Faculty" />
          <StatsCard 
            onClick={() => { setActiveTab('projects'); setStatusFilter('All'); }} 
            icon={FiFolder} variant="primary" value={stats.totalProjects} label="Total Projects" />
          <StatsCard 
            onClick={() => { setActiveTab('projects'); setStatusFilter('pending'); }} 
            icon={FiClock} variant="warning" value={stats.pendingProjects} label="Pending Approval" />
          <StatsCard 
            onClick={() => { setActiveTab('projects'); setStatusFilter('rejected'); }} 
            icon={FiClock} variant="danger" value={stats.rejectedProjects} label="Rejected Projects" />
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
                <button
                  className={`btn ${activeTab === 'phases' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('phases')}
                >
                  Phase Template
                </button>
                <button
                  className={`btn ${activeTab === 'presets' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('presets')}
                >
                  Presets
                </button>
                <button
                  className={`btn ${activeTab === 'verification' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('verification')}
                >
                  Verification
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
              <>
                <div className="stats-grid">
                  <StatsCard onClick={() => { setActiveTab('projects'); setStatusFilter('approved'); }} icon={FiCheckCircle} variant="success" value={stats.approvedProjects} label="Approved Projects" />
                  <StatsCard onClick={() => { setActiveTab('projects'); setStatusFilter('in-progress'); }} icon={FiFolder} variant="primary" value={stats.inProgressProjects} label="In Progress" />
                  <StatsCard onClick={() => { setActiveTab('projects'); setStatusFilter('completed'); }} icon={FiCheckCircle} variant="success" value={stats.completedProjects} label="Completed" />
                  <StatsCard onClick={() => { setActiveTab('projects'); setStatusFilter('in-progress'); }} icon={FiClock} variant="danger" value={stats.delayedProjects || 0} label="Delayed Projects" />
                  <StatsCard icon={FiClock} variant="warning" value={stats.avgPhaseReviewHours || 0} label="Avg Review (hrs)" />
                  <StatsCard icon={FiClock} variant="danger" value={stats.phaseRejections || 0} label="Phase Rejections" />
                </div>

                <div className="card" style={{ marginTop: '16px', border: '1px solid #e5e7eb' }}>
                  <div className="card-header">
                    <h3 style={{ margin: 0 }}>Delayed Phase Alerts</h3>
                  </div>
                  <div className="card-body">
                    {!stats.delayedAlerts || stats.delayedAlerts.length === 0 ? (
                      <p style={{ margin: 0, color: '#64748b' }}>No delayed phase alerts right now.</p>
                    ) : (
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Project</th>
                              <th>Student</th>
                              <th>Current Phase</th>
                              <th>Status</th>
                              <th>Inactive (days)</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.delayedAlerts.map((alert) => (
                              <tr key={alert.projectId}>
                                <td>{alert.title}</td>
                                <td>{alert.studentName}</td>
                                <td>{alert.currentPhaseTitle}</td>
                                <td><StatusBadge status={alert.currentPhaseStatus} prefix="Phase" /></td>
                                <td>{alert.inactiveDays}</td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => navigate(`/project/${alert.projectId}`)}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ marginTop: '16px', border: '1px solid #e5e7eb' }}>
                  <div className="card-header">
                    <h3 style={{ margin: 0 }}>Rejection Hotspots</h3>
                  </div>
                  <div className="card-body">
                    {!stats.topRejectionPhases || stats.topRejectionPhases.length === 0 ? (
                      <p style={{ margin: 0, color: '#64748b' }}>No rejection trend data yet.</p>
                    ) : (
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {stats.topRejectionPhases.map((item) => (
                          <span key={item.phaseTitle} className="badge badge-danger">
                            {item.phaseTitle}: {item.count}
                          </span>
                        ))}
                      </div>
                    )}
                    <p style={{ marginTop: '12px', marginBottom: 0, color: '#64748b' }}>
                      Screen Review Rejections: <strong>{stats.screenReviewRejections || 0}</strong>
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'projects' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '260px', marginRight: '10px' }}
                    placeholder="Search by title or description"
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setProjectsPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
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
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
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
                        <th className="action-cell">Actions</th>
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
                          <td className="action-cell">
                            <div className="action-group">
                              {project.adminStatus === 'pending' && (
                                <>
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleProjectApproval(project._id, 'approved')}
                                    disabled={loading}
                                    style={{ minWidth: '70px' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleProjectApproval(project._id, 'rejected')}
                                    disabled={loading}
                                    style={{ minWidth: '60px' }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => navigate(`/project/${project._id}`)}
                                style={{ minWidth: '50px' }}
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
                {renderPaginationControls(projectsPagination, handleProjectsPageChange, handleProjectsLimitChange)}
              </>
            )}

            {activeTab === 'users' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '240px', marginRight: '10px' }}
                    placeholder="Search by name or email"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUsersPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                  <select 
                    className="form-select" 
                    style={{ width: '200px' }} 
                    value={userRoleFilter} 
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                      setUsersPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <option value="All">All Users</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
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
                        <th className="action-cell">Actions</th>
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
                          <td style={{ width: '120px', textAlign: 'right' }}>
                            <div className="flex" style={{ gap: '0.25rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleEditUser(user)}
                                style={{ minWidth: '32px', padding: '0.25rem' }}
                              >
                                <FiEdit />
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteUser(user)}
                                style={{ minWidth: '32px', padding: '0.25rem' }}
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
                {renderPaginationControls(usersPagination, handleUsersPageChange, handleUsersLimitChange)}
              </>
            )}

            {activeTab === 'phases' && (
              <div className="card" style={{ border: '1px solid #e5e7eb' }}>
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Project Phase Template</h3>
                </div>
                <div className="card-body">
                  <p className="text-secondary" style={{ marginTop: 0 }}>
                    Admin controls the number of phases and their order. New projects use this template.
                  </p>

                  {phaseTemplateLoading ? (
                    <p>Loading phase template...</p>
                  ) : (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Total phases: {phaseTemplate.length}</strong>
                      </div>

                      {phaseTemplate.map((phase, index) => (
                        <div key={phase.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="badge badge-secondary">{index + 1}</span>
                          <input
                            type="text"
                            className="form-input"
                            value={phase.title}
                            onChange={(e) => updatePhaseTitle(phase.id, e.target.value)}
                            placeholder={`Phase ${index + 1} title`}
                            maxLength={100}
                          />
                          <div className="flex gap-1" style={{ flexWrap: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => movePhaseRow(index, -1)}
                              disabled={index === 0}
                              title="Move up"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => movePhaseRow(index, 1)}
                              disabled={index === phaseTemplate.length - 1}
                              title="Move down"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removePhaseRow(phase.id)}
                              disabled={phaseTemplate.length <= 1}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2" style={{ marginTop: '14px' }}>
                        <button type="button" className="btn btn-outline" onClick={addPhaseRow}>
                          Add Phase
                        </button>
                        <button type="button" className="btn btn-primary" onClick={savePhaseTemplate} disabled={savingPhaseTemplate}>
                          {savingPhaseTemplate ? 'Saving...' : 'Save Template'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'presets' && (
              <div className="card" style={{ border: '1px solid #e5e7eb' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Project Presets</h3>
                  <button className="btn btn-primary" onClick={openPresetModal}>
                    Create Preset
                  </button>
                </div>
                <div className="card-body">
                  <p className="text-secondary" style={{ marginTop: 0 }}>
                    Manage project presets. At least one preset must be active. New projects use the active preset.
                  </p>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phases</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th className="action-cell">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presets.map((preset) => (
                          <tr key={preset._id}>
                            <td>{preset.name}</td>
                            <td>{preset.phases?.length || 0} phases</td>
                            <td>
                              <StatusBadge status={preset.isActive ? 'active' : 'inactive'} />
                            </td>
                            <td>{new Date(preset.createdAt).toLocaleDateString()}</td>
                            <td className="action-cell">
                              <div className="action-group">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => openPresetViewModal(preset)}
                                  style={{ minWidth: '60px' }}
                                >
                                  View
                                </button>
                                {!preset.isActive && (
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleActivatePreset(preset._id)}
                                    style={{ minWidth: '80px' }}
                                  >
                                    Activate
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeletePreset(preset._id)}
                                  disabled={presets.length <= 1}
                                  style={{ minWidth: '70px' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="card" style={{ border: '1px solid #e5e7eb' }}>
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Student Verification Queue</h3>
                </div>
                <div className="card-body">
                  <p className="text-secondary" style={{ marginTop: 0 }}>
                    Review ID card verification requests from students.
                  </p>
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    border: '1px solid #dbe3ef',
                    borderRadius: '12px',
                    background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <div>
                        <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>College Email Domain</label>
                        <p className="text-secondary" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                          Students enter only the part before @. We append this domain automatically.
                        </p>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b', alignSelf: 'flex-start' }}>
                        Preview: <strong>{`student.name@${verificationDomain || 'college.edu'}`}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: '#64748b', fontWeight: 700, padding: '0.7rem 0.9rem', border: '1px solid #dbe3ef', borderRadius: '10px', background: '#f8fafc' }}>@</span>
                      <input
                        type="text"
                        className="form-input"
                        value={verificationDomain}
                        onChange={(e) => setVerificationDomain(e.target.value.replace(/^@+/, '').trim())}
                        placeholder="college.edu"
                        style={{ maxWidth: '320px', flex: '1 1 280px' }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveVerificationDomain}
                        disabled={savingVerificationDomain}
                      >
                        {savingVerificationDomain ? 'Saving...' : 'Save Domain'}
                      </button>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Email</th>
                          <th>Enrollment</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th className="action-cell">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingVerifications.map((user) => (
                          <tr key={user._id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.enrollmentNumber}</td>
                            <td>
                              <StatusBadge status={user.verificationStatus} />
                            </td>
                            <td>{user.idCardFile ? new Date(user.idCardFile.uploadedAt).toLocaleDateString() : 'N/A'}</td>
                            <td className="action-cell">
                              <div className="action-group">
                                {user.idCardFile && (
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => window.open(`/api/files/download/${user.idCardFile.filename}`, '_blank')}
                                    style={{ minWidth: '60px' }}
                                  >
                                    View ID
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleReviewVerification(user._id, 'verified', 'Approved by admin')}
                                  style={{ minWidth: '70px' }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleReviewVerification(user._id, 'rejected', 'Rejected by admin')}
                                  style={{ minWidth: '60px' }}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Modal */}
        {showPresetModal && (
          <div className="modal-overlay" onClick={() => { closePresetModal(); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editingPreset ? 'View / Edit Preset' : 'Create New Preset'}</h2>
                <button className="modal-close" onClick={() => { closePresetModal(); }}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSavePreset}>
                  <div className="form-group">
                    <label className="form-label">Preset Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      required
                    />
                  </div>

                  {presetPhases.map((phase, index) => (
                    <div className="form-group" key={phase.id}>
                      <label className="form-label">Phase Title</label>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={phase.title}
                          onChange={(e) => handlePresetPhaseChange(phase.id, e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => movePresetPhaseRow(phase.id, -1)}
                          disabled={index === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => movePresetPhaseRow(phase.id, 1)}
                          disabled={index === presetPhases.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => removePresetPhaseRow(phase.id)}
                          disabled={presetPhases.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2" style={{ marginTop: '16px' }}>
                    <button type="button" className="btn btn-outline" onClick={addPresetPhaseRow}>
                      Add Phase
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={presetSaving}>
                      {presetSaving ? 'Saving...' : editingPreset ? 'Update Preset' : 'Create Preset'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {(userForm.role === 'student' || userForm.role === 'faculty') && (
                    <div className="form-group">
                      <label className="form-label">Department *</label>
                      <select
                        className="form-select"
                        value={userForm.department}
                        onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                        required
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
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

                  {userForm.role === 'faculty' && (
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
