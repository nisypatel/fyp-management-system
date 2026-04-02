# Final Year Project Management System
## Complete MERN Stack Application for GTU Viva

A professional, production-ready Final Year Project Management System built with MongoDB, Express.js, React.js, and Node.js.

---

## 🎯 Project Overview

This is a comprehensive web-based application designed to streamline the management of academic final year projects. The system supports three user roles (Student, Teacher, Admin) with complete CRUD operations, file management, and real-time notifications.

### Key Features
- ✅ Secure JWT-based authentication
- ✅ Role-based access control (Student, Teacher, Admin)
- ✅ Project proposal submission and tracking
- ✅ Supervisor request and approval workflow
- ✅ Admin approval system
- ✅ File upload and download system
- ✅ Real-time notification system
- ✅ Project progress tracking
- ✅ Feedback and communication system
- ✅ Responsive modern UI
- ✅ Complete user management (Admin)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)
- **Postman** (for API testing) - [Download](https://www.postman.com/)

---

## 🚀 Complete Setup Instructions

### STEP 1: Extract and Navigate to Project

```bash
# Extract the zip file and navigate to project directory
cd fyp-management-system
```

### STEP 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Edit the `.env` file with your configuration:**
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/fyp_management
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

```bash
# Create uploads directory
mkdir uploads

# Start the backend server
npm run dev
```

The backend will run on **http://localhost:5000**

### STEP 3: Frontend Setup

Open a **NEW TERMINAL** window:

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Edit the `.env` file:**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
# Start the frontend development server
npm start
```

The frontend will run on **http://localhost:3000**

### STEP 4: Start MongoDB

**On Windows:**
```bash
net start MongoDB
```

**On Mac/Linux:**
```bash
sudo systemctl start mongod
# OR
brew services start mongodb-community
```

**Using MongoDB Compass:**
- Connect to `mongodb://localhost:27017`
- Database `fyp_management` will be created automatically

---

## 👥 Initial User Setup

### Create Admin User

Use Postman or any API client:

**Request:**
```
POST http://localhost:5000/api/auth/register
```

**Headers:**
```
Content-Type: application/json
```

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

**Response:** You'll receive a token and user object

### Create Sample Teacher

```json
{
  "name": "Dr. John Smith",
  "email": "john.smith@fyp.com",
  "password": "teacher123",
  "role": "teacher",
  "department": "Computer Science",
  "employeeId": "EMP001",
  "phone": "9876543211"
}
```

### Create Sample Student

```json
{
  "name": "Student Name",
  "email": "student@fyp.com",
  "password": "student123",
  "role": "student",
  "department": "Computer Science",
  "enrollmentNumber": "20CS001",
  "phone": "9876543212"
}
```

---

## 🔐 Login Credentials

After creating users, you can login with:

**Admin:**
- Email: `admin@fyp.com`
- Password: `admin123`

**Teacher:**
- Email: `john.smith@fyp.com`
- Password: `teacher123`

**Student:**
- Email: `student@fyp.com`
- Password: `student123`

---

## 📱 Testing the Application

### As a Student:
1. Login with student credentials
2. Click "Submit New Project"
3. Fill in project details and upload proposal document
4. Select a supervisor from the dropdown
5. View project status and progress

### As a Teacher:
1. Login with teacher credentials
2. View "Supervision Requests" tab
3. Accept or reject student requests
4. View assigned projects
5. Add feedback and track progress

### As an Admin:
1. Login with admin credentials
2. View all statistics
3. Approve or reject projects
4. Manage users (Create, Update, Delete)
5. Monitor system-wide activities

---

## 📝 API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updateprofile` - Update profile
- `PUT /api/auth/updatepassword` - Change password

### Projects
- `GET /api/projects` - Get all projects (filtered by role)
- `POST /api/projects` - Create new project (Student)
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id/request-supervisor` - Request supervisor
- `PUT /api/projects/:id/supervisor-response` - Accept/Reject (Teacher)
- `PUT /api/projects/:id/admin-approval` - Approve/Reject (Admin)
- `POST /api/projects/:id/feedback` - Add feedback
- `POST /api/projects/:id/documents` - Upload document
- `PUT /api/projects/:id/progress` - Update progress

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/teachers` - Get all teachers
- `GET /api/users/stats/dashboard` - Get dashboard stats

### Files
- `GET /api/files/download/:filename` - Download file
- `DELETE /api/files/:projectId/:documentId` - Delete file

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

---

## 🗂️ Project Structure

```
fyp-management-system/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── projectController.js     # Project operations
│   │   ├── userController.js        # User management
│   │   ├── notificationController.js# Notifications
│   │   └── fileController.js        # File operations
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── upload.js                # File upload (Multer)
│   │   └── error.js                 # Error handling
│   ├── models/
│   │   ├── User.js                  # User schema
│   │   ├── Project.js               # Project schema
│   │   └── Notification.js          # Notification schema
│   ├── routes/
│   │   ├── auth.js                  # Auth routes
│   │   ├── projects.js              # Project routes
│   │   ├── users.js                 # User routes
│   │   ├── notifications.js         # Notification routes
│   │   └── files.js                 # File routes
│   ├── uploads/                     # File storage
│   ├── .env                         # Environment variables
│   ├── package.json                 # Dependencies
│   └── server.js                    # Entry point
│
└── frontend/
    ├── public/
    │   └── index.html               # HTML template
    ├── src/
    │   ├── components/
    │   │   └── Navbar.js            # Navigation bar
    │   ├── context/
    │   │   └── AuthContext.js       # Auth state management
    │   ├── pages/
    │   │   ├── Login.js             # Login page
    │   │   ├── Register.js          # Registration page
    │   │   ├── StudentDashboard.js  # Student dashboard
    │   │   ├── TeacherDashboard.js  # Teacher dashboard
    │   │   ├── AdminDashboard.js    # Admin dashboard
    │   │   ├── ProjectDetails.js    # Project details
    │   │   └── Profile.js           # User profile
    │   ├── utils/
    │   │   └── api.js               # Axios configuration
    │   ├── App.js                   # Main app component
    │   ├── App.css                  # Global styles
    │   ├── index.js                 # React entry point
    │   └── index.css                # Base styles
    ├── .env                         # Environment variables
    └── package.json                 # Dependencies
```

---

## 🧪 Testing with Postman

### 1. Import Collection

Create a new Postman collection and add these requests:

### 2. Sample Requests

**Login:**
```
POST http://localhost:5000/api/auth/login
Body: {
  "email": "student@fyp.com",
  "password": "student123"
}
```

**Create Project:**
```
POST http://localhost:5000/api/projects
Headers: Authorization: Bearer YOUR_TOKEN
Form-data:
- title: "AI-Based Chatbot System"
- description: "Building an intelligent chatbot using NLP"
- category: "AI/ML"
- technologies: ["Python", "TensorFlow", "NLP"]
- proposalFile: (attach file)
```

---

## 🎓 For GTU Viva Preparation

### Technical Highlights:
1. **Full MERN Stack Implementation**
2. **RESTful API Design** with proper HTTP methods
3. **JWT Authentication** with token-based security
4. **Role-Based Access Control** (RBAC)
5. **File Management System** with Multer
6. **MongoDB Indexing** for performance
7. **React Hooks** for state management
8. **Responsive Design** with modern CSS
9. **Error Handling** and validation
10. **Production-ready** code structure

### Key Points to Explain:
- **Security**: bcrypt for passwords, JWT for sessions
- **Scalability**: Modular code, MongoDB indexes
- **UX**: Toast notifications, loading states, error messages
- **File Storage**: Server-side with role-based access
- **Database Design**: Normalized schema with references
- **API Structure**: Controllers, routes, middleware pattern

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: MongoNetworkError
Solution: Ensure MongoDB is running and MONGO_URI is correct
```

### Port Already in Use
```
Error: EADDRINUSE
Solution: Kill the process using the port or change PORT in .env
```

### CORS Error
```
Error: CORS policy blocked
Solution: Verify CLIENT_URL in backend .env matches frontend URL
```

### Token Expired
```
Error: jwt expired
Solution: Clear localStorage and login again
```

### File Upload Failed
```
Error: File too large
Solution: Check MAX_FILE_SIZE in .env (default 10MB)
```

---

## 📦 Deployment (Optional)

### Backend Deployment (Render/Heroku)
1. Push code to GitHub
2. Connect repository to Render/Heroku
3. Set environment variables
4. Deploy

### Frontend Deployment (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy build folder
3. Set REACT_APP_API_URL to deployed backend URL

### Database (MongoDB Atlas)
1. Create cluster on MongoDB Atlas
2. Get connection string
3. Update MONGO_URI in backend .env

---

## 📄 License

This project is created for educational purposes as a Final Year Project.

---

## 👨‍💻 Developer

**Your Name**
- University: Gujarat Technological University
- Department: Computer Engineering
- Year: 2025

---

## 📞 Support

For any issues or questions during setup:
1. Check the troubleshooting section
2. Review the error logs in terminal
3. Verify all environment variables are set correctly
4. Ensure MongoDB is running

---

## ✅ Final Checklist Before Viva

- [ ] Backend server running without errors
- [ ] Frontend application accessible
- [ ] MongoDB connected successfully
- [ ] Admin user created and can login
- [ ] Sample student and teacher accounts created
- [ ] Test project submission workflow
- [ ] Test supervisor request/approval
- [ ] Test admin approval
- [ ] Test file upload/download
- [ ] All CRUD operations working
- [ ] Understand the code architecture
- [ ] Prepared to explain technical decisions

---

## 🎉 You're All Set!

The application is now fully functional and ready for demonstration. Good luck with your GTU viva! 🚀
