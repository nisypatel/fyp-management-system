# Final Year Project Management System - Complete Setup Guide

## Project Overview
A full-stack MERN application for managing final year projects with role-based access control (Student, Teacher, Admin), file management, and real-time notifications.

## System Requirements
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- 8GB RAM minimum
- 10GB free disk space

## BACKEND SETUP

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the backend directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/fyp_management
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_xyz123
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Step 3: Start MongoDB
Make sure MongoDB is running:
```bash
# On Linux/Mac
sudo systemctl start mongod

# On Windows
net start MongoDB

# Or use MongoDB Compass/Atlas
```

### Step 4: Create Uploads Directory
```bash
mkdir uploads
```

### Step 5: Start Backend Server
```bash
# Development mode with auto-restart
npm run dev

# OR Production mode
npm start
```

The backend will run on http://localhost:5000

### Step 6: Create Admin User (First Time Setup)
Use Postman or any API client to create the first admin user:

**Endpoint:** POST http://localhost:5000/api/auth/register

**Body (JSON):**
```json
{
  "name": "Admin User",
  "email": "admin@fyp.com",
  "password": "admin123",
  "role": "admin",
  "phone": "9876543210"
}
```

## FRONTEND SETUP

### Step 1: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 3: Start Frontend Development Server
```bash
npm start
```

The frontend will run on http://localhost:3000

## REMAINING FRONTEND FILES

I've created the core backend completely. Now you need these additional frontend page files:

### 1. Login Page (frontend/src/pages/Login.js)
```javascript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">FYP Management</h1>
        <p className="auth-subtitle">Sign in to your account</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-2">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### 2. Register Page (frontend/src/pages/Register.js)
```javascript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    enrollmentNumber: '',
    employeeId: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(formData);
    
    if (result.success) {
      toast.success('Registration successful!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Register for FYP Management</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <input
              type="text"
              name="department"
              className="form-input"
              value={formData.department}
              onChange={handleChange}
              required
            />
          </div>

          {formData.role === 'student' && (
            <div className="form-group">
              <label className="form-label">Enrollment Number</label>
              <input
                type="text"
                name="enrollmentNumber"
                className="form-input"
                value={formData.enrollmentNumber}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {formData.role === 'teacher' && (
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input
                type="text"
                name="employeeId"
                className="form-input"
                value={formData.employeeId}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              pattern="[0-9]{10}"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-2">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
```

(CONTINUED IN NEXT FILE - Character limit approaching)
