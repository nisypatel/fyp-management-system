import React from 'react';
import { useProjects, useProjectFiles } from '../../hooks/useProjects';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ProjectStatus, type FileUpload } from '../../types';
import { Download } from 'lucide-react';

interface StudentDashboardProps {
  onUploadFile?: (projectId: string) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onUploadFile }) => {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  // Get student's project(s)
  const myProject = projects.length > 0 ? projects[0] : null;

  const { data: files = [], isLoading: filesLoading } = useProjectFiles(myProject?._id || '');

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

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {myProject ? (
        <>
          {/* Project Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{myProject.title}</CardTitle>
              <CardDescription>{myProject.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusColor(myProject.status)} className="mt-2">
                    {myProject.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supervisor</p>
                  <p className="font-medium mt-2">{myProject.supervisor?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium mt-2">
                    {new Date(myProject.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Project Files</CardTitle>
              <Button onClick={() => onUploadFile?.(myProject._id)} size="sm">
                Upload File
              </Button>
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
                  <p className="text-sm mt-2">Upload your project report or documents here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file: FileUpload) => (
                    <div
                      key={file._id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB • Uploaded{' '}
                          {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">No project assigned yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact your supervisor to assign you a project
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
