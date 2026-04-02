# FYP Management System

A comprehensive, enterprise-grade **Final Year Project Management System** built with modern web technologies, featuring secure authentication, role-based access control, project management, and file upload capabilities.

## 🎯 Overview

This system is designed for educational institutions to manage Final Year Projects (FYP) across multiple stakeholders: Administrators, Teachers (Supervisors), and Students. The application implements professional-grade security practices, clean architecture, and an intuitive user interface.

---

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3
- **Database**: MongoDB 6.0+ with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs (12-round salt)
- **Security**:
  - Helmet.js (security headers)
  - CORS configuration
  - Express Rate Limiter
  - Input validation & sanitization

### Frontend
- **Build Tool**: Vite 5.0
- **Framework**: React 18
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.3
- **UI Components**: Shadcn/UI (custom component library)
- **State Management**: React Context API + React Query
- **HTTP Client**: Axios with interceptors
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **Routing**: React Router v6

### Infrastructure
- **Local Database**: MongoDB community edition
- **Package Manager**: npm
- **Development**: ts-node-dev

---

## 📋 System Architecture

```
FYP Management System
├── Backend (Port 5000)
│   ├── Authentication API
│   ├── Project Management API
│   ├── File Upload API
│   └── MongoDB Database
│
└── Frontend (Port 5173)
    ├── Auth Pages (Login/Register)
    ├── Role-Based Dashboards
    ├── Project Management UI
    └── File Upload Interface
```

---

## 🔐 Security Features

### Authentication & Authorization
✅ JWT with dual-token system:
- **Access Token**: 15-minute expiry (short-lived)
- **Refresh Token**: 7-day expiry (stored in MongoDB with TTL)

✅ Password Security:
- Bcrypt hashing with 12 salt rounds
- Password strength validation
- Secure password comparison

✅ Role-Based Access Control (RBAC):
- Route-level middleware protection
- Frontend UI role-based rendering
- Three distinct roles with specific permissions

### API Security
✅ Rate Limiting:
- Auth endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes

✅ Data Validation:
- Express-validator for all inputs
- XSS prevention through sanitization
- MongoDB parameterized queries
- Email format validation
- Password strength requirements

✅ Network Security:
- Helmet.js security headers
- CORS with origin whitelist
- Request body size limits (10MB)
- Secure token storage (httpOnly consideration)

✅ File Upload Security:
- MIME type whitelist (PDF, Word, Images only)
- File size limit: 10MB maximum
- Filename sanitization (prevent path traversal)
- Files stored outside webroot
- Authorization checks before download

---

## 👥 User Roles & Permissions

### 1. **Admin** 👨‍💼
**Permissions:**
- ✅ View all projects in the system
- ✅ Create new projects
- ✅ Edit any project
- ✅ Delete any project
- ✅ Assign students to projects
- ✅ Access admin dashboard with system statistics
- ✅ View all users
- ✅ Manage project status and assignments

**Dashboard Features:**
- System-wide project statistics
- Total projects, assigned projects, completed projects
- All projects table with supervisors and students
- Quick actions for project management

**API Access:**
- `GET /api/projects` → All projects
- `POST /api/projects` → Create project
- `PUT /api/projects/:id` → Edit project
- `DELETE /api/projects/:id` → Delete project (Admin only)

---

### 2. **Teacher** (Supervisor) 👨‍🏫
**Permissions:**
- ✅ View only supervised projects
- ✅ Create new projects
- ✅ Edit supervised projects only
- ✅ Assign students to supervised projects
- ✅ View and manage files in supervised projects
- ✅ Access teacher-specific dashboard
- ❌ Cannot delete projects
- ❌ Cannot access other teachers' projects

**Dashboard Features:**
- My Projects statistics (total, assigned, pending)
- List of supervised projects with student assignments
- File upload tracking per project
- Project status overview

**API Access:**
- `GET /api/projects` → Supervised projects only
- `POST /api/projects` → Create project
- `PUT /api/projects/:id` → Edit own projects
- `POST /api/projects/:id/assign` → Assign students
- `POST /api/files/upload` → Upload files

---

### 3. **Student** 🎓
**Permissions:**
- ✅ View only assigned project
- ✅ Upload files to assigned project
- ✅ Download files from assigned project
- ✅ View project details and supervisor info
- ✅ Access student-specific dashboard
- ❌ Cannot create or edit projects
- ❌ Cannot assign themselves to projects
- ❌ Cannot delete files uploaded by others

**Dashboard Features:**
- My Project card with status
- Supervisor information display
- Project description
- File upload section with drag-n-drop
- List of uploaded files with download options

**API Access:**
- `GET /api/projects` → Assigned project only
- `POST /api/files/upload` → Upload files
- `GET /api/files/project/:projectId` → View project files
- `GET /api/files/:fileId/download` → Download files

---

## 🔒 RBAC Implementation

### Route-Level Protection
```typescript
// Admin only
DELETE /api/projects/:id → requireAdmin middleware

// Admin or Teacher
POST /api/projects → requireTeacher middleware
POST /api/projects/:id/assign → requireTeacher middleware

// All authenticated users
GET /api/projects → authenticate middleware
POST /api/files/upload → authenticate middleware
```

### Frontend Protection
- ProtectedRoute component checks authentication
- Role-based UI rendering (components only show for authorized roles)
- Dashboard differentiation based on user role
- Menu items filtered by user permissions

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- MongoDB Community Edition (local or Atlas)
- Git

### Environment Setup

#### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your configuration
# MongoDB URI: mongodb://localhost:27017/fyp_management
# JWT_ACCESS_SECRET: your-secret-key
# JWT_REFRESH_SECRET: your-secret-key
# CORS_ORIGIN: http://localhost:5173
```

4. **Verify .env file**
```bash
cat .env
```

5. **Start the backend server**
```bash
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 5000
✅ MongoDB connected successfully
📊 Database: fyp_management
🌍 Environment: development
📡 CORS enabled for: http://localhost:5173
```

---

#### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Copy or edit .env
cat .env
# Should contain: VITE_API_URL=http://localhost:5000/api
```

4. **Start the frontend development server**
```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

5. **Access the application**
```
http://localhost:5173
```

---

### Verification Steps

#### 1. Health Check
```bash
# Test backend is running
curl http://localhost:5000/health

# Response:
# {
#   "success": true,
#   "message": "Server is healthy",
#   "timestamp": "2026-03-25T12:00:00.000Z"
# }
```

#### 2. Create Test Users

**Register as Admin:**
1. Go to http://localhost:5173/register
2. Enter:
   - Name: Admin User
   - Email: admin@example.com
   - Password: Admin@123
   - Role: Admin
3. Click "Sign Up"

**Register as Teacher:**
1. Go to http://localhost:5173/register
2. Enter:
   - Name: Teacher User
   - Email: teacher@example.com
   - Password: Teacher@123
   - Role: Teacher
3. Click "Sign Up"

**Register as Student:**
1. Go to http://localhost:5173/register
2. Enter:
   - Name: Student User
   - Email: student@example.com
   - Password: Student@123
   - Role: Student
3. Click "Sign Up"

#### 3. Test Project Creation (Admin/Teacher)
1. Login as Teacher
2. Dashboard → "Create Project"
3. Fill in:
   - Title: "Advanced AI System"
   - Description: "Development of..."
   - Supervisor: (auto-filled)
   - Student: Select student user
4. Submit → Project created

#### 4. Test File Upload (Student)
1. Login as Student
2. Dashboard → "Upload File"
3. Drag and drop or select a PDF/image
4. File uploaded successfully

#### 5. Test RBAC Restrictions
- Student tries to access /projects → Only sees assigned project
- Student tries to delete project → 403 Forbidden
- Teacher tries to delete project → 403 Forbidden (Admin only)

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password@123",
  "role": "Student"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "Student" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password@123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": { ... }
}
```

### Project Endpoints

#### Get All Projects
```
GET /projects
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "FYP Project",
      "description": "...",
      "status": "Pending",
      "student": {...},
      "supervisor": {...},
      "files": [...],
      "createdAt": "2026-03-25T..."
    }
  ]
}
```

#### Create Project
```
POST /projects
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Project Title",
  "description": "Project description",
  "supervisorId": "supervisor-user-id",
  "studentId": "student-user-id"
}

Response (201): Created project object
```

### File Endpoints

#### Upload File
```
POST /files/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

Form Data:
- file: (binary file)
- projectId: "project-id"

Response (201): File upload record
```

#### Get Project Files
```
GET /files/project/{projectId}
Authorization: Bearer {accessToken}

Response (200): Array of file records
```

#### Download File
```
GET /files/{fileId}/download
Authorization: Bearer {accessToken}

Response (200): File binary (with headers for download)
```

#### Delete File
```
DELETE /files/{fileId}
Authorization: Bearer {accessToken}

Response (200):
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## 📦 Postman Collection

A complete Postman collection is included: `postman_collection.json`

### Importing to Postman
1. Open Postman
2. Click "Import" → Select `postman_collection.json`
3. Set variables:
   - `base_url`: http://localhost:5000/api
   - `access_token`: (auto-populated after login)
   - `refresh_token`: (auto-populated after login)
4. Test all endpoints

---

## 🧪 Testing RBAC Restrictions

### Test Matrix
| Action | Admin | Teacher | Student |
|--------|-------|---------|---------|
| Create Project | ✅ | ✅ | ❌ |
| Edit Project | ✅ | ✅* | ❌ |
| Delete Project | ✅ | ❌ | ❌ |
| Assign Student | ✅ | ✅* | ❌ |
| Upload File | ✅ | ✅ | ✅ |
| View All Projects | ✅ | ❌ | ❌ |
| View Supervised | ✅ | ✅ | ❌ |
| View Assigned | ✅ | ✅ | ✅ |

*Teacher can only manage their own supervised projects

### Test Commands
```bash
# 1. Register and get tokens
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test@123","role":"Student"}'

# 2. Try to delete project as Student (should fail)
curl -X DELETE http://localhost:5000/api/projects/PROJECT_ID \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Expected: 403 Forbidden
```

---

## 📂 Project Structure

```
FYP/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── jwt.config.ts
│   │   │   └── multer.config.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   ├── errorHandler.middleware.ts
│   │   │   ├── rateLimiter.middleware.ts
│   │   │   └── fileValidation.middleware.ts
│   │   ├── models/
│   │   │   ├── User.model.ts
│   │   │   ├── Project.model.ts
│   │   │   ├── RefreshToken.model.ts
│   │   │   └── FileUpload.model.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   └── file.controller.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── project.routes.ts
│   │   │   └── file.routes.ts
│   │   ├── utils/
│   │   │   ├── hashPassword.ts
│   │   │   ├── generateTokens.ts
│   │   │   └── validators.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── server.ts
│   ├── uploads/ (file storage)
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/ (Shadcn components)
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── layout/
│   │   │   └── common/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   └── ProjectDetail.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx
│   │   │   └── useProjects.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env
│   ├── .gitignore
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── components.json
│   ├── package.json
│   └── tsconfig.json
│
├── postman_collection.json
├── README.md (this file)
└── build-plan.md
```

---

## 🔧 Troubleshooting

### Backend Issues

**Port 5000 already in use:**
```bash
# Kill process using port 5000
lsof -i :5000
kill -9 <PID>

# Or change PORT in .env
PORT=5001
```

**MongoDB connection error:**
```bash
# Ensure MongoDB is running
mongod

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/fyp_management
```

**JWT errors:**
```bash
# Verify JWT secrets are set in .env
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
```

### Frontend Issues

**CORS error:**
```bash
# Ensure backend CORS_ORIGIN matches frontend URL
CORS_ORIGIN=http://localhost:5173
```

**Token not persisting:**
```bash
# Check browser LocalStorage
# DevTools → Application → Local Storage
# Should contain: accessToken, refreshToken, user
```

---

## 📝 Development Notes

### Git Workflow
```bash
# Clone repository
git clone <repo-url>
cd FYP

# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature
```

### Environment Variables Checklist

**Backend (.env):**
- [ ] PORT=5000
- [ ] NODE_ENV=development
- [ ] MONGODB_URI=mongodb://localhost:27017/fyp_management
- [ ] JWT_ACCESS_SECRET=<unique-secret>
- [ ] JWT_REFRESH_SECRET=<unique-secret>
- [ ] CORS_ORIGIN=http://localhost:5173

**Frontend (.env):**
- [ ] VITE_API_URL=http://localhost:5000/api

---

## 📄 License

This project is part of a Final Year Project implementation exercise.

---

## 👥 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the GitHub issues
3. Contact the development team

---

## 🎓 Educational Notes

This system demonstrates:
- ✅ Full-stack TypeScript application
- ✅ Enterprise-grade security practices
- ✅ Role-Based Access Control (RBAC)
- ✅ JWT authentication with refresh tokens
- ✅ RESTful API design
- ✅ React best practices with hooks
- ✅ MongoDB schema design
- ✅ Professional UI/UX with Shadcn/UI
- ✅ Comprehensive error handling
- ✅ Input validation and sanitization

---

**Happy Coding! 🚀**
