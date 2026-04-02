import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiFolder, FiClock, FiCheckCircle, FiUpload } from 'react-icons/fi';
import API from '../utils/api';
import Navbar from '../components/Navbar';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    technologies: '',
    teamMembers: '',
    proposalFile: null
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, projectsRes, teachersRes] = await Promise.all([
        API.get('/users/stats/dashboard'),
        API.get('/projects'),
        API.get('/users/teachers')
      ]);
      setStats(statsRes.data.stats);
      setProjects(projectsRes.data.projects);
      setTeachers(teachersRes.data.teachers);
    } catch (error) {
      toast.error('Error loading dashboard data');
    }
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
      
      if (formData.teamMembers) {
        const members = formData.teamMembers.split('\n').map(m => {
          const [name, enrollmentNumber] = m.split(',').map(s => s.trim());
          return { name, enrollmentNumber };
        });
        data.append('teamMembers', JSON.stringify(members));
      }
      
      if (formData.proposalFile) {
        data.append('proposalFile', formData.proposalFile);
      }

      await API.post('/projects', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Project proposal submitted successfully!');
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'Web Development',
        technologies: '',
        teamMembers: '',
        proposalFile: null
      });
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting project');
    }
    setLoading(false);
  };

  const handleRequestSupervisor = async (projectId, supervisorId) => {
    try {
      await API.put(`/projects/${projectId}/request-supervisor`, { supervisorId });
      toast.success('Supervisor request sent!');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error requesting supervisor');
    }
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
            <p className="dashboard-subtitle">Student Dashboard</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> Submit New Project
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <FiFolder />
            </div>
            <div className="stat-info">
              <h3>{stats.myProjects || 0}</h3>
              <p>My Projects</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon warning">
              <FiClock />
            </div>
            <div className="stat-info">
              <h3>{stats.pending || 0}</h3>
              <p>Pending Approval</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon primary">
              <FiClock />
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

        {/* Projects List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">My Projects</h2>
          </div>
          <div className="card-body">
            {projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FiFolder size={48} />
                </div>
                <p>No projects yet. Submit your first project proposal!</p>
              </div>
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
                    {projects.map(project => (
                      <tr key={project._id}>
                        <td>{project.title}</td>
                        <td>{project.category}</td>
                        <td>
                          {project.supervisor ? (
                            <>
                              {project.supervisor.name}
                              <br />
                              <span className={`badge badge-${project.supervisorStatus === 'accepted' ? 'success' : project.supervisorStatus === 'pending' ? 'warning' : 'danger'}`}>
                                {project.supervisorStatus}
                              </span>
                            </>
                          ) : (
                            <select
                              className="form-select"
                              onChange={(e) => handleRequestSupervisor(project._id, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Select Supervisor</option>
                              {teachers.map(teacher => (
                                <option key={teacher._id} value={teacher._id}>
                                  {teacher.name} ({teacher.department})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(project.status)}`}>
                            {project.status}
                          </span>
                          <br />
                          <span className={`badge badge-${project.adminStatus === 'approved' ? 'success' : project.adminStatus === 'pending' ? 'warning' : 'danger'}`}>
                            Admin: {project.adminStatus}
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

                  <div className="form-group">
                    <label className="form-label">Team Members (optional)</label>
                    <textarea
                      name="teamMembers"
                      className="form-textarea"
                      placeholder="Format: Name, Enrollment Number (one per line)"
                      value={formData.teamMembers}
                      onChange={handleInputChange}
                    />
                  </div>

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
