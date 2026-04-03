// Purpose: Student dashboard for submitting projects and tracking progress.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiFolder, FiClock, FiCheckCircle, FiUpload } from 'react-icons/fi';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import DashboardHeader from '../components/ui/DashboardHeader';
import StatsCard from '../components/ui/StatsCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);
  const [faculty, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    technologies: '',
    projectType: 'Individual Project',
    teamMembers: [],
    proposalFile: null
  });

  const [emailInput, setEmailInput] = useState('');

  const [statusFilter, setStatusFilter] = useState('All');
  
  // Add filter logic
  const filteredProjects = projects.filter(project => {
    if (statusFilter === 'All') return true;
    
    const filterLower = statusFilter.toLowerCase();
    // Check against adminStatus first
    if (['pending', 'approved', 'rejected'].includes(filterLower)) {
      return project.adminStatus.toLowerCase() === filterLower && project.status !== 'completed';
    }
    // Check against general status
    return project.status.toLowerCase() === filterLower;
  });

  usePageTitle('Student Dashboard | FYP Management');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardStats, allProjects, allTeachers, pendingInvites] = await Promise.all([
        userService.getDashboardStats(),
        projectService.getProjects(),
        userService.getFaculty(),
        projectService.getTeamInvites()
      ]);
      setStats(dashboardStats);
      setProjects(allProjects);
      setTeachers(allTeachers);
      setTeamInvites(pendingInvites);
    } catch (error) {
      // During logout, protected APIs return 401; avoid unnecessary red toasts.
      if (error.response && error.response.status !== 401) {
        toast.error('Error loading dashboard data');
      }
    }
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (email && !formData.teamMembers.includes(email)) {
      setFormData({ ...formData, teamMembers: [...formData.teamMembers, email] });
      setEmailInput('');
    }
  };

  const handleRemoveMember = (idx) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.filter((_, i) => i !== idx)
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      proposalFile: e.target.files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('technologies', JSON.stringify(formData.technologies.split(',').map(t => t.trim())));
      
      if (formData.projectType === 'Team Project' && formData.teamMembers.length > 0) {
        data.append('teamMembers', JSON.stringify(formData.teamMembers));
      }
      
      if (formData.proposalFile) {
        data.append('proposalFile', formData.proposalFile);
      }

      await projectService.createProject(data);

      toast.success('Project proposal submitted successfully!');
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'Web Development',
        technologies: '',
        projectType: 'Individual Project',
        teamMembers: [],
        proposalFile: null
      });
      setEmailInput('');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting project');
    }
    setLoading(false);
  };

  const handleRequestSupervisor = async (projectId, supervisorId) => {
    try {
      await projectService.requestSupervisor(projectId, supervisorId);
      toast.success('Supervisor request sent!');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error requesting supervisor');
    }
  };

  const handleTeamInviteResponse = async (projectId, responseStatus) => {
    try {
      await projectService.respondToTeamInvite(projectId, responseStatus);
      toast.success(`Invitation ${responseStatus} successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update invitation');
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <DashboardHeader title={`Welcome, ${user?.name || 'Student'}!`} subtitle="Student Dashboard">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> Submit New Project
          </button>
        </DashboardHeader>

        {/* Stats Cards */}
        <div className="stats-grid">
          <StatsCard 
            onClick={() => setStatusFilter('All')} 
            icon={FiFolder} variant="primary" value={stats.myProjects} label="My Projects" />
          <StatsCard 
            onClick={() => setStatusFilter('pending')} 
            icon={FiClock} variant="warning" value={stats.pending} label="Pending Approval" />
          <StatsCard 
            onClick={() => setStatusFilter('in-progress')} 
            icon={FiClock} variant="primary" value={stats.inProgress} label="In Progress" />
          <StatsCard 
            onClick={() => setStatusFilter('completed')} 
            icon={FiCheckCircle} variant="success" value={stats.completed} label="Completed" />
        </div>

        {teamInvites.length > 0 && (
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <h2 className="card-title">Team Invitations ({teamInvites.length})</h2>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Invited By</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamInvites.map((invite) => (
                      <tr key={invite.projectId}>
                        <td>{invite.projectTitle}</td>
                        <td>{invite.invitedBy?.name || 'Student'}</td>
                        <td>
                          <StatusBadge status="pending" />
                        </td>
                        <td>
                          <div className="flex gap-1" style={{ flexWrap: 'nowrap' }}>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleTeamInviteResponse(invite.projectId, 'accepted')}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleTeamInviteResponse(invite.projectId, 'rejected')}
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

        {/* Projects List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">My Projects</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                className="form-select" 
                style={{ width: '180px' }} 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            {filteredProjects.length === 0 ? (
              <EmptyState icon={FiFolder} message="No projects found matching your criteria. Submit your first project proposal!" />
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Project Title</th>
                      <th>Category</th>
                      <th>Supervisor</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map(project => (
                      <tr key={project._id}>
                        <td>{project.title}</td>
                        <td>{project.category}</td>
                        <td>
                          {project.supervisor ? (
                            <>
                              {project.supervisor.name}
                              <br />
                              <StatusBadge status={project.supervisorStatus} />
                            </>
                          ) : (
                            project.student?._id === user?._id ? (
                              <select
                                className="form-select"
                                onChange={(e) => handleRequestSupervisor(project._id, e.target.value)}
                                defaultValue=""
                              >
                                <option value="" disabled>Select Supervisor</option>
                                {faculty.map(faculty => (
                                  <option key={faculty._id} value={faculty._id}>
                                    {faculty.name} ({faculty.department})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <small>Project owner will request supervisor</small>
                            )
                          )}
                        </td>
                        <td>
                          <StatusBadge status={project.status} />
                          <br />
                          <StatusBadge status={project.adminStatus} prefix="Admin" />
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
          </div>
        </div>

        {/* New Project Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Submit New Project Proposal</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Project Title *</label>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description *</label>
                    <textarea
                      name="description"
                      className="form-textarea"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      name="category"
                      className="form-select"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile Development">Mobile Development</option>
                      <option value="AI/ML">AI/ML</option>
                      <option value="Data Science">Data Science</option>
                      <option value="IoT">IoT</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Technologies (comma-separated) *</label>
                    <input
                      type="text"
                      name="technologies"
                      className="form-input"
                      placeholder="e.g., React, Node.js, MongoDB"
                      value={formData.technologies}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Project Type *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="projectType"
                          value="Individual Project"
                          checked={formData.projectType === 'Individual Project'}
                          onChange={handleInputChange}
                        />
                        Individual Project
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="projectType"
                          value="Team Project"
                          checked={formData.projectType === 'Team Project'}
                          onChange={handleInputChange}
                        />
                        Team Project
                      </label>
                    </div>
                  </div>

                  {formData.projectType === 'Team Project' && (
                    <div className="form-group" style={{ 
                      padding: '12px', 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px'
                    }}>
                      <label className="form-label" style={{ color: '#4f46e5' }}>Team Members</label>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                         Add registered student emails. They will receive a join request and can accept or reject.
                      </p>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                          type="email"
                          className="form-input"
                          style={{ marginBottom: 0 }}
                          placeholder="example@student.college.edu"    
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMember(e);
                            }
                          }}
                        />
                        <button type="button" onClick={handleAddMember} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                          Add
                        </button>
                      </div>
                      
                      {formData.teamMembers.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                          {formData.teamMembers.map((email, idx) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', background: '#e0e7ff', color: '#3730a3',
                              padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 500
                            }}>
                              <span>{email}</span>
                              <button type="button" onClick={() => handleRemoveMember(idx)} style={{
                                background: 'transparent', border: 'none', color: '#3730a3', marginLeft: '8px',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1
                              }}>&times;</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Proposal Document (optional)</label>
                    <div className="file-upload">
                      <input
                        type="file"
                        id="proposalFile"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="proposalFile" style={{ cursor: 'pointer' }}>
                        <FiUpload size={24} />
                        <p>{formData.proposalFile ? formData.proposalFile.name : 'Click to upload file'}</p>
                        <small>PDF, DOC, DOCX (Max 10MB)</small>
                      </label>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Submitting...' : 'Submit Project'}
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

export default StudentDashboard;
