// Purpose: Detailed single-project view with files, feedback, and progress updates.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiDownload, FiUpload, FiSend, FiArrowLeft } from 'react-icons/fi';
import { projectService } from '../services/projectService';
import { fileService } from '../services/fileService';
import usePageTitle from '../hooks/usePageTitle';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/ui/StatusBadge';
import '../styles/project-details.css';

const getFriendlyInviteStatus = (status) => {
  if (status === 'pending') return 'Awaiting Response';
  if (status === 'accepted') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  return status;
};

const getFriendlyPhaseStatus = (status) => {
  if (status === 'pending') return 'Awaiting Response';
  if (status === 'submitted') return 'Submitted';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return status;
};

const isZipArchive = (file) => {
  if (!file) return false;
  const name = file.name || '';
  return /\.(zip|rar)$/i.test(name);
};

const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [screenRecordingFile, setScreenRecordingFile] = useState(null);
  const [screenRecordingFeedback, setScreenRecordingFeedback] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [phaseFile, setPhaseFile] = useState(null);
  const [phaseVideo, setPhaseVideo] = useState(null);
  const [phaseLink, setPhaseLink] = useState('');
  const [phaseComments, setPhaseComments] = useState('');
  const [phaseSubmitting, setPhaseSubmitting] = useState(false);
  const [phaseReviewFeedback, setPhaseReviewFeedback] = useState({});
  const [phaseReviewBusyId, setPhaseReviewBusyId] = useState(null);
  const handlePhaseSubmit = async (e) => {
    e.preventDefault();

    const projectPhases = project?.phases || [];
    const selectedPhase = projectPhases.find((phase) => phase._id === selectedPhaseId);

    if (!selectedPhase) {
      toast.error('Please select a valid phase');
      return;
    }

    if (!phaseFile) {
      toast.error('Please upload a file for this phase');
      return;
    }

    if (isZipArchive(phaseFile) && !phaseVideo) {
      toast.error('A walkthrough video is required for ZIP or RAR uploads');
      return;
    }

    setPhaseSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('document', phaseFile);

      if (phaseVideo) {
        formData.append('supportingVideo', phaseVideo);
      }

      if (phaseLink.trim()) {
        formData.append('link', phaseLink.trim());
      }

      if (phaseComments.trim()) {
        formData.append('comments', phaseComments.trim());
      }

      await projectService.submitPhase(id, selectedPhaseId, formData);
      toast.success(`${selectedPhase.title} submitted successfully!`);
      setPhaseFile(null);
      setPhaseVideo(null);
      setPhaseLink('');
      setPhaseComments('');
      fetchProject();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting phase');
    }
    setPhaseSubmitting(false);
  };

  const handlePhaseReview = async (phaseId, status) => {
    const feedback = phaseReviewFeedback[phaseId] || '';
    setPhaseReviewBusyId(phaseId);
    try {
      await projectService.evaluatePhase(id, phaseId, status, feedback);
      toast.success(`Phase ${status}`);
      setPhaseReviewFeedback((current) => ({ ...current, [phaseId]: '' }));
      fetchProject();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error reviewing phase');
    }
    setPhaseReviewBusyId(null);
  };

  usePageTitle('Project Details | FYP Management');

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (!project?.phases?.length) {
      return;
    }

    const nextActionablePhase = project.phases.find((phase) => phase.status !== 'approved') || project.phases[0];
    if (nextActionablePhase && nextActionablePhase._id) {
      setSelectedPhaseId(nextActionablePhase._id);
    }
  }, [project]);

  const fetchProject = async () => {
    try {
      const projectData = await projectService.getProjectById(id);
      setProject(projectData);
      setProgress(projectData.progress);
    } catch (error) {
      toast.error('Error loading project details');
      navigate('/');
    }
    setLoading(false);
  };

  const handleDownloadFile = async (filename) => {
    try {
      const fileBlob = await fileService.download(filename);
      const url = window.URL.createObjectURL(new Blob([fileBlob]));
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
      await projectService.addFeedback(id, feedback);
      toast.success('Feedback added successfully!');
      setFeedback('');
      fetchProject();
    } catch (error) {
      toast.error('Error adding feedback');
    }
  };

  const handleScreenRecordingUpload = async (e) => {
    e.preventDefault();
    if (!screenRecordingFile) {
      toast.error('Please select a file');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('screenRecording', screenRecordingFile);
      await projectService.uploadScreenRecording(id, formData);
      toast.success('Screen recording uploaded successfully!');
      setScreenRecordingFile(null);
      fetchProject();
    } catch (error) {
      toast.error('Error uploading screen recording');
    }
  };

  const handleScreenRecordingReview = async (status) => {
    try {
      await projectService.reviewScreenRecording(id, status, screenRecordingFeedback);
      toast.success(`Screen recording ${status}`);
      setScreenRecordingFeedback('');
      fetchProject();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error reviewing screen recording');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const canReviewScreenRecording =
    (user.role === 'faculty' || user.role === 'admin') &&
    project.codeReview?.status === 'submitted';

  const canUploadScreenRecording =
    user.role === 'student' &&
    user.id === project.student._id &&
    project.status === 'in-progress';

  const canAddFeedback = user.role === 'faculty' || user.role === 'admin';

  const submittedAt = project.codeReview?.submittedAt
    ? new Date(project.codeReview.submittedAt).toLocaleString()
    : 'Not submitted';
  const projectPhases = project?.phases || [];
  const approvedPhaseCount = projectPhases.filter((phase) => phase.status === 'approved').length;

  return (
    <>
      <Navbar />
      <div className="dashboard-container project-details-page">
        <button className="btn btn-outline mb-2" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        <section className="project-hero">
          <div>
            <p className="project-hero-kicker">Project Workspace</p>
            <h1 className="project-hero-title">{project.title}</h1>
            <p className="project-hero-meta">
              <span>{project.category}</span>
              <span>•</span>
              <span>{project.documents.length} documents</span>
              <span>•</span>
              <span>{project.feedback.length} feedback entries</span>
            </p>
          </div>
          <div className="project-hero-badges">
            <StatusBadge status={project.status} />
            <StatusBadge status={project.adminStatus} prefix="Admin" />
            {project.supervisorStatus && <StatusBadge status={project.supervisorStatus} prefix="Supervisor" />}
          </div>
        </section>

        <section className="project-card project-people">
          <div className="project-card-header">
            <h2>People</h2>
          </div>
          <div className="project-people-grid">
            <article className="project-person-tile">
              <h3>Student</h3>
              <p><strong>{project.student.name}</strong></p>
              <p>{project.student.email}</p>
              <p>{project.student.department}</p>
              <p>{project.student.enrollmentNumber}</p>
            </article>
            {project.supervisor ? (
              <article className="project-person-tile">
                <h3>Supervisor</h3>
                <p><strong>{project.supervisor.name}</strong></p>
                <p>{project.supervisor.email}</p>
                <p>
                  <StatusBadge status={project.supervisorStatus} />
                </p>
              </article>
            ) : (
              <article className="project-person-tile">
                <h3>Supervisor</h3>
                <p>No supervisor assigned yet.</p>
              </article>
            )}
          </div>
        </section>

        <div className="project-layout-grid">
          <section className="project-card">
            <div className="project-card-header">
              <h2>Technical Details</h2>
            </div>
            <div className="project-key-value">
              <span>Category</span>
              <strong>{project.category}</strong>
            </div>
            <div className="project-key-value">
              <span>Technologies</span>
              <strong>{project.technologies?.length ? project.technologies.join(', ') : 'Not specified'}</strong>
            </div>
            <div className="project-team-block">
              <span>Team Members</span>
              {project.teamMembers && project.teamMembers.length > 0 ? (
                <div className="project-team-grid">
                  {project.teamMembers.map((member, idx) => (
                    <article key={idx} className="project-team-member-card">
                      <div className="project-team-member-main">
                        <div className="project-team-avatar" aria-hidden="true">
                          {member.name?.trim()?.charAt(0)?.toUpperCase() || 'T'}
                        </div>
                        <div>
                          <p className="project-team-member-name">{member.name}</p>
                          <p className="project-team-member-id">{member.enrollmentNumber}</p>
                        </div>
                      </div>
                      <div className="project-team-status-wrap">
                        <span className={`project-team-status project-team-status-${member.inviteStatus || 'pending'}`}>
                          {getFriendlyInviteStatus(member.inviteStatus)}
                        </span>
                        {member.respondedAt && (
                          <small className="project-team-response-time">
                            {new Date(member.respondedAt).toLocaleDateString()}
                          </small>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No team members listed.</p>
              )}
            </div>
          </section>

          <section className="project-card">
            <div className="project-card-header">
              <h2>Description</h2>
            </div>
            <p className="project-copy">{project.description || 'No description provided.'}</p>
          </section>

          <section className="project-card project-card-wide">
            <div className="project-card-header">
              <h2>Phase Workflow</h2>
              <div className="project-phase-summary">
                <span>{project.progress}% complete</span>
                <span>{approvedPhaseCount}/{projectPhases.length || 5} approved</span>
              </div>
            </div>

            <div className="project-phase-submit-box">
              <div className="project-phase-submit-header">
                <div>
                  <h3>Submit Phase</h3>
                  <p>Select the next phase you want to submit. If you attach a ZIP or RAR file, a walkthrough video is required.</p>
                </div>
                <span className="project-phase-note">Phases unlock sequentially</span>
              </div>

              <form onSubmit={handlePhaseSubmit} className="project-phase-form">
                <div className="form-group">
                  <label className="form-label">Project Phase</label>
                  <select
                    className="form-select"
                    value={selectedPhaseId}
                    onChange={(e) => setSelectedPhaseId(e.target.value)}
                    required
                  >
                    {projectPhases.map((phase, index) => {
                      const isLocked = projectPhases.slice(0, index).some((item) => item.status !== 'approved');
                      const isAlreadyApproved = phase.status === 'approved';

                      return (
                        <option key={phase._id} value={phase._id} disabled={isLocked || isAlreadyApproved}>
                          {phase.title} - {getFriendlyPhaseStatus(phase.status)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Phase File</label>
                  <input
                    type="file"
                    className="form-input"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.png,.jpg,.jpeg"
                    onChange={(e) => setPhaseFile(e.target.files[0] || null)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supporting Video</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="video/*"
                    onChange={(e) => setPhaseVideo(e.target.files[0] || null)}
                  />
                  <p className="project-input-hint">Mandatory for ZIP or RAR submissions.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference Link</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="Optional demo, drive, or repo link"
                    value={phaseLink}
                    onChange={(e) => setPhaseLink(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Comments</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Short notes for your mentor"
                    value={phaseComments}
                    onChange={(e) => setPhaseComments(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={phaseSubmitting}>
                  {phaseSubmitting ? 'Submitting...' : 'Submit Phase'}
                </button>
              </form>
            </div>

            <div className="project-phase-grid">
              {projectPhases.map((phase, index) => {
                const isLocked = projectPhases.slice(0, index).some((item) => item.status !== 'approved');
                const canMentorReview = user.role === 'faculty' && project.supervisor && project.supervisor._id === user.id && phase.status === 'submitted';
                const submittedAtLabel = phase.submission?.submittedAt ? new Date(phase.submission.submittedAt).toLocaleString() : 'Not submitted';

                return (
                  <article key={phase._id} className={`project-phase-card ${isLocked ? 'project-phase-card-locked' : ''}`}>
                    <div className="project-phase-card-top">
                      <div>
                        <h3>{phase.title}</h3>
                        <p>{isLocked ? 'Locked until previous phase is approved' : 'Ready for submission'}</p>
                      </div>
                      <StatusBadge status={phase.status} prefix="Phase" />
                    </div>

                    {phase.submission ? (
                      <div className="project-phase-submission">
                        <div className="project-phase-meta-row">
                          <span>Submitted</span>
                          <strong>{submittedAtLabel}</strong>
                        </div>
                        <div className="project-phase-meta-row">
                          <span>File</span>
                          <strong>{phase.submission.fileName || 'N/A'}</strong>
                        </div>
                        {phase.submission.videoName && (
                          <div className="project-phase-meta-row">
                            <span>Video</span>
                            <strong>{phase.submission.videoName}</strong>
                          </div>
                        )}
                        {phase.submission.comments && (
                          <p className="project-phase-comments">{phase.submission.comments}</p>
                        )}
                        {phase.submission.link && (
                          <a href={phase.submission.link} target="_blank" rel="noreferrer">Open reference link</a>
                        )}
                      </div>
                    ) : (
                      <p className="project-muted">No submission yet.</p>
                    )}

                    {phase.feedback && (
                      <div className="project-phase-feedback">
                        <span>Mentor feedback</span>
                        <p>{phase.feedback}</p>
                      </div>
                    )}

                    {canMentorReview && (
                      <div className="project-phase-review-box">
                        <textarea
                          className="form-textarea"
                          placeholder="Optional review feedback..."
                          value={phaseReviewFeedback[phase._id] || ''}
                          onChange={(e) => setPhaseReviewFeedback((current) => ({ ...current, [phase._id]: e.target.value }))}
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            className="btn btn-success"
                            onClick={() => handlePhaseReview(phase._id, 'approved')}
                            disabled={phaseReviewBusyId === phase._id}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handlePhaseReview(phase._id, 'rejected')}
                            disabled={phaseReviewBusyId === phase._id}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!projectPhases.length && (
                <p className="project-muted">No phase structure available for this project yet.</p>
              )}
            </div>
          </section>

          <section className="project-card project-card-wide">
            <div className="project-card-header">
              <h2>Code Review - Screen Recording</h2>
            </div>
            <div className="project-review-status">
              <StatusBadge status={project.status} />
              <StatusBadge status={project.codeReview?.status || 'pending'} prefix="Review" />
            </div>
            <p className="project-muted"><strong>Submission Date:</strong> {submittedAt}</p>

            {project.codeReview?.feedback && (
              <div className="project-review-feedback">
                <h4>Review Feedback</h4>
                <p>{project.codeReview.feedback}</p>
              </div>
            )}

            {project.codeReview?.screenRecording && (
              <div className="mt-1">
                <button
                  className="btn btn-outline"
                  onClick={() => handleDownloadFile(project.codeReview.screenRecording.filename)}
                >
                  <FiDownload /> Download Screen Recording
                </button>
              </div>
            )}

            {canReviewScreenRecording && (
              <div className="project-action-box mt-2">
                <h4>Review Submission</h4>
                <textarea
                  className="form-textarea"
                  placeholder="Optional review feedback..."
                  value={screenRecordingFeedback}
                  onChange={(e) => setScreenRecordingFeedback(e.target.value)}
                />
                <div className="flex gap-1 mt-1">
                  <button
                    className="btn btn-success"
                    onClick={() => handleScreenRecordingReview('approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleScreenRecordingReview('rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {canUploadScreenRecording && (
              <div className="project-action-box mt-2">
                <h4>Submit Working Screen Recording</h4>
                <p className="project-muted">
                  Upload an end-to-end demo that clearly includes your team name and team ID.
                </p>
                <form onSubmit={handleScreenRecordingUpload} className="project-inline-form">
                  <input
                    type="file"
                    className="form-input"
                    accept="video/*"
                    onChange={(e) => setScreenRecordingFile(e.target.files[0])}
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    <FiUpload /> Submit Recording
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="project-card">
            <div className="project-card-header">
              <h2>Progress</h2>
            </div>
            <div className="project-progress-row">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${project.progress}%` }} />
              </div>
              <strong>{project.progress}%</strong>
            </div>
            <p className="project-muted mt-1">Progress is now driven by approved phases.</p>
          </section>

          {project.proposalFile && (
            <section className="project-card">
              <div className="project-card-header">
                <h2>Proposal Document</h2>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => handleDownloadFile(project.proposalFile.filename)}
              >
                <FiDownload /> Download Proposal
              </button>
            </section>
          )}

          <section className="project-card project-card-wide">
            <div className="project-card-header">
              <h2>Documents ({project.documents.length})</h2>
            </div>
            {project.documents.length === 0 ? (
              <p className="project-muted">No documents uploaded yet.</p>
            ) : (
              <div className="project-table-wrap">
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
              </div>
            )}

          </section>

          <section className="project-card project-card-wide">
            <div className="project-card-header">
              <h2>Feedback ({project.feedback.length})</h2>
            </div>
            {project.feedback.length === 0 ? (
              <p className="project-muted">No feedback yet.</p>
            ) : (
              <div className="project-feedback-list">
                {project.feedback.map((fb, idx) => (
                  <article key={idx} className="project-feedback-item">
                    <div className="flex-between">
                      <strong>{fb.from.name} ({fb.from.role})</strong>
                      <small>{new Date(fb.createdAt).toLocaleString()}</small>
                    </div>
                    <p>{fb.message}</p>
                  </article>
                ))}
              </div>
            )}

            {canAddFeedback && (
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
          </section>
        </div>
      </div>
    </>
  );
};

export default ProjectDetails;
