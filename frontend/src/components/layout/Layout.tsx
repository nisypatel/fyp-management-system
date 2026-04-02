import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { UserRole } from '../../types';
import { LayoutDashboard, FileText, Settings, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student],
    },
    {
      label: 'Projects',
      icon: FileText,
      href: '/projects',
      roles: [UserRole.Admin, UserRole.Teacher, UserRole.Student],
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      roles: [UserRole.Admin],
    },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const handleNavigate = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">Menu</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-muted rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {visibleMenuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
