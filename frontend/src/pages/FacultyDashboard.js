// Purpose: Faculty dashboard for assigned projects and supervision requests.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUsers, FiClock, FiCheckCircle, FiFolder } from 'react-icons/fi';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import DashboardHeader from '../components/ui/DashboardHeader';
import StatsCard from '../components/ui/StatsCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  // Add filter logic for assigned projects
  const filteredProjects = projects.filter(project => {
    if (statusFilter === 'All') return true;
    
    const filterLower = statusFilter.toLowerCase();
    return project.status.toLowerCase() === filterLower;
  });

  usePageTitle('Faculty Dashboard | FYP Management');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardStats, allProjects, supervisorRequests] = await Promise.all([
        userService.getDashboardStats(),
        projectService.getProjects(),
        projectService.getSupervisorRequests()
      ]);
      setStats(dashboardStats);
      setProjects(allProjects);
      setRequests(supervisorRequests);
    } catch (error) {
      // During logout, protected APIs return 401; avoid unnecessary red toasts.
      if (error.response && error.response.status !== 401) {
        toast.error('Error loading dashboard data');
      }
    }
  };

  const handleSupervisorResponse = async (projectId, status) => {
    setLoading(true);
    try {
      await projectService.supervisorResponse(projectId, status);
      toast.success(`Request ${status} successfully!`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing request');
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <DashboardHeader title={`Welcome, ${user?.name || 'Faculty'}!`} subtitle="Faculty Dashboard" />

        {/* Stats Cards */}
        <div className="stats-grid">
          <StatsCard 
            onClick={() => { setActiveTab('assigned'); setStatusFilter('All'); }} 
            icon={FiUsers} variant="primary" value={stats.totalAssigned} label="Assigned Projects" />
          <StatsCard 
            onClick={() => setActiveTab('requests')} 
            icon={FiClock} variant="warning" value={stats.pendingRequests} label="Pending Requests" />
          <StatsCard 
            onClick={() => { setActiveTab('assigned'); setStatusFilter('in-progress'); }} 
            icon={FiFolder} variant="primary" value={stats.inProgress} label="In Progress" />
          <StatsCard 
            onClick={() => { setActiveTab('assigned'); setStatusFilter('completed'); }} 
            icon={FiCheckCircle} variant="success" value={stats.completed} label="Completed" />
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <select 
                    className="form-select" 
                    style={{ width: '200px' }} 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Projects</option>
                    <option value="proposal">Proposals</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                {filteredProjects.length === 0 ? (
                  <EmptyState icon={FiFolder} message="No assigned projects found for this filter." />
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
                        {filteredProjects.map(project => (
                          <tr key={project._id}>
                            <td>{project.title}</td>
                            <td>
                              {project.student.name}
                              <br />
                              <small>{project.student.enrollmentNumber}</small>
                            </td>
                            <td>{project.category}</td>
                            <td>
                              <StatusBadge status={project.status} />
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
                  <EmptyState icon={FiClock} message="No pending supervision requests." />
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

export default FacultyDashboard;
