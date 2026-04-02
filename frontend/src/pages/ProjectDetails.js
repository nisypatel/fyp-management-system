import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiDownload, FiUpload, FiSend, FiArrowLeft } from 'react-icons/fi';
import API from '../utils/api';
import Navbar from '../components/Navbar';

const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await API.get(`/projects/${id}`);
      setProject(response.data.project);
      setProgress(response.data.project.progress);
    } catch (error) {
      toast.error('Error loading project details');
      navigate('/');
    }
    setLoading(false);
  };

  const handleDownloadFile = async (filename) => {
    try {
      const response = await API.get(`/files/download/${filename}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error downloading file');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/projects/${id}/feedback`, { message: feedback });
      toast.success('Feedback added successfully!');
      setFeedback('');
      fetchProject();
    } catch (error) {
      toast.error('Error adding feedback');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('title', uploadTitle);

      await API.post(`/projects/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Document uploaded successfully!');
      setUploadFile(null);
      setUploadTitle('');
      fetchProject();
    } catch (error) {
      toast.error('Error uploading document');
    }
  };

  const handleProgressUpdate = async () => {
    try {
      await API.put(`/projects/${id}/progress`, { progress });
      toast.success('Progress updated!');
      fetchProject();
    } catch (error) {
      toast.error('Error updating progress');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <button className="btn btn-outline mb-2" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{project.title}</h2>
            <div className="flex gap-1">
              <span className={`badge badge-${project.status === 'completed' ? 'success' : project.status === 'in-progress' ? 'primary' : 'warning'}`}>
                {project.status}
              </span>
              <span className={`badge badge-${project.adminStatus === 'approved' ? 'success' : project.adminStatus === 'pending' ? 'warning' : 'danger'}`}>
                Admin: {project.adminStatus}
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="flex-between mb-2">
              <div>
                <p><strong>Student:</strong> {project.student.name} ({project.student.enrollmentNumber})</p>
                <p><strong>Email:</strong> {project.student.email}</p>
                <p><strong>Department:</strong> {project.student.department}</p>
              </div>
              {project.supervisor && (
                <div>
                  <p><strong>Supervisor:</strong> {project.supervisor.name}</p>
                  <p><strong>Email:</strong> {project.supervisor.email}</p>
                  <p><strong>Status:</strong> 
                    <span className={`badge badge-${project.supervisorStatus === 'accepted' ? 'success' : project.supervisorStatus === 'pending' ? 'warning' : 'danger'}`}>
                      {project.supervisorStatus}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <hr />

            <div className="mb-2">
              <h3>Description</h3>
              <p>{project.description}</p>
            </div>

            <div className="mb-2">
              <h3>Details</h3>
              <p><strong>Category:</strong> {project.category}</p>
              <p><strong>Technologies:</strong> {project.technologies.join(', ')}</p>
              {project.teamMembers && project.teamMembers.length > 0 && (
                <div>
                  <strong>Team Members:</strong>
                  <ul>
                    {project.teamMembers.map((member, idx) => (
                      <li key={idx}>{member.name} ({member.enrollmentNumber})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mb-2">
              <h3>Progress</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${project.progress}%` }} />
              </div>
              <p>{project.progress}%</p>
              {(user.role === 'student' || user.role === 'teacher') && (
                <div className="flex gap-1 mt-1">
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '100px' }}
                    value={progress}
                    onChange={(e) => setProgress(Math.min(100, Math.max(0, e.target.value)))}
                    min="0"
                    max="100"
                  />
                  <button className="btn btn-primary" onClick={handleProgressUpdate}>
                    Update Progress
                  </button>
                </div>
              )}
            </div>

            {project.proposalFile && (
              <div className="mb-2">
                <h3>Proposal Document</h3>
                <button
                  className="btn btn-outline"
                  onClick={() => handleDownloadFile(project.proposalFile.filename)}
                >
                  <FiDownload /> Download Proposal
                </button>
              </div>
            )}

            <div className="mb-2">
              <h3>Documents ({project.documents.length})</h3>
              {project.documents.length === 0 ? (
                <p>No documents uploaded yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.documents.map((doc) => (
                      <tr key={doc._id}>
                        <td>{doc.title}</td>
                        <td>{doc.uploadedBy.name}</td>
                        <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleDownloadFile(doc.filename)}
                          >
                            <FiDownload /> Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {/* Upload Document */}
              <div className="mt-2">
                <h4>Upload New Document</h4>
                <form onSubmit={handleFileUpload} className="flex gap-1">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Document title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                  />
                  <input
                    type="file"
                    className="form-input"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    <FiUpload /> Upload
                  </button>
                </form>
              </div>
            </div>

            <div className="mb-2">
              <h3>Feedback ({project.feedback.length})</h3>
              {project.feedback.length === 0 ? (
                <p>No feedback yet.</p>
              ) : (
                <div>
                  {project.feedback.map((fb, idx) => (
                    <div key={idx} className="card mb-1">
                      <div className="card-body">
                        <div className="flex-between">
                          <strong>{fb.from.name} ({fb.from.role})</strong>
                          <small>{new Date(fb.createdAt).toLocaleString()}</small>
                        </div>
                        <p>{fb.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Feedback (Teacher/Admin only) */}
              {(user.role === 'teacher' || user.role === 'admin') && (
                <form onSubmit={handleFeedbackSubmit} className="mt-2">
                  <textarea
                    className="form-textarea"
                    placeholder="Add your feedback..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary mt-1">
                    <FiSend /> Submit Feedback
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectDetails;
