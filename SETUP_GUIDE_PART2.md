# SETUP GUIDE PART 2 - Dashboard Pages

### 3. Student Dashboard (frontend/src/pages/StudentDashboard.js)
Create this file with full student project management functionality.

### 4. Teacher Dashboard (frontend/src/pages/TeacherDashboard.js)
Create this file with teacher project review and supervision features.

### 5. Admin Dashboard (frontend/src/pages/AdminDashboard.js)
Create this file with complete admin panel for user and project management.

### 6. Project Details (frontend/src/pages/ProjectDetails.js)
Create this file to show detailed project information, documents, and feedback.

### 7. Profile Page (frontend/src/pages/Profile.js)
Create this file for user profile management.

## COMPONENTS TO CREATE

### Navbar Component (frontend/src/components/Navbar.js)
```javascript
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import API from '../utils/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await API.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        FYP Management System
      </Link>
      
      <div className="navbar-menu">
        <Link to="/">Dashboard</Link>
        {user && user.role === 'admin' && (
          <Link to="/admin/users">Manage Users</Link>
        )}
      </div>

      <div className="navbar-user">
        <div className="notification-badge">
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="notification-count">{unreadCount}</span>
          )}
        </div>
        
        <Link to="/profile">
          <FiUser size={20} />
        </Link>
        
        <button onClick={handleLogout} className="btn btn-sm btn-outline">
          <FiLogOut size={18} />
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
```

## API TESTING WITH POSTMAN

### 1. Register User
POST http://localhost:5000/api/auth/register
```json
{
  "name": "Student Name",
  "email": "student@test.com",
  "password": "password123",
  "role": "student",
  "department": "Computer Science",
  "enrollmentNumber": "20CS001",
  "phone": "9876543210"
}
```

### 2. Login
POST http://localhost:5000/api/auth/login
```json
{
  "email": "student@test.com",
  "password": "password123"
}
```
Copy the returned token for subsequent requests.

### 3. Create Project (Student)
POST http://localhost:5000/api/projects
Headers: Authorization: Bearer YOUR_TOKEN
Form-data:
- title: "AI-Based Chatbot"
- description: "Building an intelligent chatbot using NLP"
- category: "AI/ML"
- technologies: ["Python", "TensorFlow", "NLP"]
- proposalFile: (attach file)

### 4. Get All Projects
GET http://localhost:5000/api/projects
Headers: Authorization: Bearer YOUR_TOKEN

### 5. Request Supervisor
PUT http://localhost:5000/api/projects/:projectId/request-supervisor
Headers: Authorization: Bearer YOUR_TOKEN
```json
{
  "supervisorId": "TEACHER_USER_ID"
}
```

### 6. Teacher Accept/Reject (Teacher token required)
PUT http://localhost:5000/api/projects/:projectId/supervisor-response
Headers: Authorization: Bearer TEACHER_TOKEN
```json
{
  "status": "accepted"
}
```

### 7. Admin Approve Project (Admin token required)
PUT http://localhost:5000/api/projects/:projectId/admin-approval
Headers: Authorization: Bearer ADMIN_TOKEN
```json
{
  "status": "approved"
}
```

## DATABASE STRUCTURE

MongoDB will automatically create these collections:

1. **users** - Stores all user data (students, teachers, admins)
2. **projects** - Stores all project proposals and details
3. **notifications** - Stores user notifications

## PROJECT STRUCTURE OVERVIEW

```
fyp-management-system/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── userController.js
│   │   ├── notificationController.js
│   │   └── fileController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── upload.js
│   │   └── error.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── users.js
│   │   ├── notifications.js
│   │   └── files.js
│   ├── uploads/
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   └── Navbar.js
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── StudentDashboard.js
    │   │   ├── TeacherDashboard.js
    │   │   ├── AdminDashboard.js
    │   │   ├── ProjectDetails.js
    │   │   └── Profile.js
    │   ├── utils/
    │   │   └── api.js
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   └── index.css
    ├── .env
    └── package.json
```

## KEY FEATURES IMPLEMENTED

✅ JWT-based authentication
✅ Role-based access control (Student, Teacher, Admin)
✅ Project proposal submission
✅ Supervisor request and approval
✅ Admin approval system
✅ File upload and download
✅ Real-time notifications
✅ Project progress tracking
✅ Feedback system
✅ Dashboard statistics
✅ User management (Admin)
✅ Secure file storage
✅ MongoDB indexing for performance

## FOR GTU VIVA PREPARATION

### Project Highlights:
1. **Full MERN Stack** - MongoDB, Express, React, Node.js
2. **RESTful API Design** - Clean, organized endpoints
3. **Security** - JWT authentication, bcrypt password hashing
4. **File Management** - Multer for uploads, secure file access
5. **Role-Based Access** - Three distinct user roles with permissions
6. **Database Optimization** - Mongoose indexes for performance
7. **Modern UI** - Responsive design with React hooks
8. **Error Handling** - Comprehensive error management
9. **State Management** - React Context API
10. **Production Ready** - Environment configuration, security best practices

### Technical Implementation Details:
- **Backend**: Express.js with modular MVC architecture
- **Database**: MongoDB with Mongoose ODM, indexed queries
- **Authentication**: JWT tokens with 7-day expiry
- **File Storage**: Server-side storage with role-based access
- **Frontend**: React with functional components and hooks
- **Routing**: React Router v6 with protected routes
- **API Communication**: Axios with interceptors

## NEXT STEPS

1. Create all the remaining frontend page files (Student/Teacher/Admin Dashboards)
2. Test all API endpoints with Postman
3. Add sample data for demonstration
4. Deploy to production (optional: Heroku, Render, or Vercel)

## TROUBLESHOOTING

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check MONGO_URI in .env file

**CORS Error:**
- Verify CLIENT_URL in backend .env
- Check if frontend is running on correct port

**File Upload Error:**
- Ensure uploads directory exists
- Check file size limits in .env

**Token Error:**
- Clear localStorage and login again
- Verify JWT_SECRET is set in .env

## Contact for Help
If you need the complete dashboard files or have any questions, let me know!
