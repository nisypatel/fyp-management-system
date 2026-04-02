import React from 'react';
import LoginForm from '../components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">FYP Management</h1>
          <p className="text-muted-foreground">Final Year Project Management System</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
