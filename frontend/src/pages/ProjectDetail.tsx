import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useProject, useUpdateProject, useUploadFile, useProjectFiles } from '../hooks/useProjects';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import FileUpload from '../components/common/FileUpload';
import { ProjectStatus } from '../types';
import { Download, Trash2, ArrowLeft } from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id || '');
  const { data: files = [], isLoading: filesLoading } = useProjectFiles(id || '');
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { mutate: uploadFile, isPending: isUploading } = useUploadFile();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: ProjectStatus.Pending,
  });
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  React.useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description,
        status: project.status,
      });
    }
  }, [project]);

  if (projectLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (projectError || !project) {
    return (
      <Layout>
        <div className="text-center text-destructive">
          <p>Project not found or error loading. Please try again.</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Completed:
        return 'success';
      case ProjectStatus.InProgress:
        return 'info';
      case ProjectStatus.Pending:
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleSave = () => {
    updateProject(
      { id: project._id, data: formData },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleFileUpload = (file: File) => {
    setUploadError('');
    setUploadSuccess('');

    uploadFile(
      { file, projectId: project._id },
      {
        onSuccess: () => {
          setUploadSuccess('File uploaded successfully!');
          setTimeout(() => setUploadSuccess(''), 3000);
        },
        onError: (error: Error) => {
          setUploadError(error.message || 'Failed to upload file');
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <p className="text-muted-foreground">
              {project.supervisor?.name} • {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Project Information</CardTitle>
            <Button
              variant={isEditing ? 'default' : 'outline'}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-2"
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ProjectStatus.Pending || value === ProjectStatus.InProgress || value === ProjectStatus.Completed) {
                        setFormData({ ...formData, status: value });
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                  >
                    <option value={ProjectStatus.Pending}>Pending</option>
                    <option value={ProjectStatus.InProgress}>In Progress</option>
                    <option value={ProjectStatus.Completed}>Completed</option>
                  </select>
                </div>

                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Title</p>
                  <p className="mt-1 text-lg">{project.title}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1 whitespace-pre-wrap">{project.description}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={getStatusColor(project.status)} className="mt-2">
                      {project.status}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Supervisor</p>
                    <p className="mt-1 font-medium">{project.supervisor?.name}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Student</p>
                    <p className="mt-1 font-medium">{project.student?.name || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Upload project reports, documents, or resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadSuccess && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                {uploadSuccess}
              </div>
            )}
            {uploadError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {uploadError}
              </div>
            )}

            <FileUpload
              onFileSelect={handleFileUpload}
              disabled={isUploading}
            />
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle>Project Files</CardTitle>
            <CardDescription>{files.length} file(s) uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file: { _id: string; originalName: string; size: number; uploadedBy?: { name: string }; createdAt: string }) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{file.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB • Uploaded by {file.uploadedBy?.name || 'Unknown'} •{' '}
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
