import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import Layout from '../components/layout/Layout';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import TeacherDashboard from '../components/dashboard/TeacherDashboard';
import StudentDashboard from '../components/dashboard/StudentDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case UserRole.Admin:
        return <AdminDashboard />;
      case UserRole.Teacher:
        return <TeacherDashboard />;
      case UserRole.Student:
        return <StudentDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return <Layout>{renderDashboard()}</Layout>;
};

export default Dashboard;
