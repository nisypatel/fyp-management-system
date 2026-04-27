# Final Year Project Management System - Setup Guide (Part 1)

## Purpose
This file is now a compact personal setup checklist.
The canonical and fully up-to-date setup instructions are maintained in README.md.

## Canonical Source
- Main setup, API list, test flow, and deployment notes: README.md

## Quick Start Checklist
1. Install backend dependencies
```bash
cd backend
npm install
```

2. Configure backend environment
```bash
copy .env.example .env
```

3. Install frontend dependencies
```bash
cd ..\frontend
npm install
```

4. Configure frontend environment
```bash
copy .env.example .env
```

5. Start services
```bash
cd ..\backend
npm run dev
```
Open a second terminal:
```bash
cd frontend
npm start
```

6. Verify basic health
- API health: GET /api/health
- Frontend opens at localhost:3000
- Backend opens at localhost:5000

## Notes
- Keep this file for your own quick reminders.
- If any instruction here conflicts with README.md, follow README.md.
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
              <option value="faculty">Faculty</option>
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

          {formData.role === 'faculty' && (
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
