import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">FYP Management</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;
