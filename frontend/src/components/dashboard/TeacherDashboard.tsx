import React from 'react';
import { useProjects } from '../../hooks/useProjects';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { ProjectStatus } from '../../types';

interface TeacherDashboardProps {
  onCreateProject?: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onCreateProject }) => {
  const { data: projects = [], isLoading, error } = useProjects();

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

  const supervisedProjects = projects.filter((p: { supervisor: unknown }) => p.supervisor);
  const assignedProjects = supervisedProjects.filter((p: { student: unknown }) => p.student);
  const pendingProjects = supervisedProjects.filter((p: { status: string }) => p.status === ProjectStatus.Pending);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        <p>Error loading dashboard. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supervisedProjects.length}</div>
            <p className="text-xs text-muted-foreground">Total supervised projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedProjects.length}</div>
            <p className="text-xs text-muted-foreground">Projects with students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProjects.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Supervised Projects</CardTitle>
          <Button onClick={onCreateProject}>Create Project</Button>
        </CardHeader>
        <CardContent>
          {supervisedProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No supervised projects yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisedProjects.map((project: { _id: string; title: string; status: ProjectStatus; student?: { name: string }; files?: unknown[]; createdAt: string }) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>{project.student?.name || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(project.status)}>{project.status}</Badge>
                    </TableCell>
                    <TableCell>{project.files?.length || 0} files</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
