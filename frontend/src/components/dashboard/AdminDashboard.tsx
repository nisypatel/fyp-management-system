import React from 'react';
import { useProjects } from '../../hooks/useProjects';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { ProjectStatus } from '../../types';

interface AdminDashboardProps {
  onCreateProject?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onCreateProject }) => {
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

  const totalProjects = projects.length;
  const completedProjects = projects.filter((p: { status: string }) => p.status === ProjectStatus.Completed).length;
  const assignedProjects = projects.filter((p: { student: unknown }) => p.student).length;

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
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">All projects in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedProjects}</div>
            <p className="text-xs text-muted-foreground">Projects with students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects}</div>
            <p className="text-xs text-muted-foreground">Finished projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Projects</CardTitle>
          <Button onClick={onCreateProject}>Create Project</Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No projects found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project: { _id: string; title: string; status: ProjectStatus; supervisor?: { name: string }; student?: { name: string }; createdAt: string }) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>{project.supervisor?.name || 'N/A'}</TableCell>
                    <TableCell>{project.student?.name || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(project.status)}>{project.status}</Badge>
                    </TableCell>
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

export default AdminDashboard;
