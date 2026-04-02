import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useProjects } from '../hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ProjectStatus } from '../types';
import { FileText, Download } from 'lucide-react';

const Projects: React.FC = () => {
  const { data: projects = [], isLoading, error } = useProjects();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all');

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

  const filteredProjects =
    filter === 'all' ? projects : projects.filter((p: { status: string }) => p.status === filter);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center text-destructive">
          <p>Error loading projects. Please try again.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your FYP projects</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === ProjectStatus.Pending ? 'default' : 'outline'}
            onClick={() => setFilter(ProjectStatus.Pending)}
          >
            Pending
          </Button>
          <Button
            variant={filter === ProjectStatus.InProgress ? 'default' : 'outline'}
            onClick={() => setFilter(ProjectStatus.InProgress)}
          >
            In Progress
          </Button>
          <Button
            variant={filter === ProjectStatus.Completed ? 'default' : 'outline'}
            onClick={() => setFilter(ProjectStatus.Completed)}
          >
            Completed
          </Button>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project: { _id: string; title: string; status: ProjectStatus; supervisor?: { name: string }; student?: { name: string }; description: string; files?: unknown[] }) => (
              <Card key={project._id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.supervisor?.name}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {project.description}
                  </p>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Student: {project.student?.name || 'Unassigned'}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      Files: {project.files?.length || 0}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Projects;
