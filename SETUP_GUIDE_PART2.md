# Setup Guide Part 2 - Personal Testing and Viva Checklist

## Purpose
This file is now a short companion note.
The complete technical setup, API references, and architecture details are maintained in README.md.

## Canonical Source
- Full installation, configuration, and API guide: README.md

## Personal API Smoke Test Order
1. Register admin
2. Register one faculty user
3. Register one student user
4. Student creates project
5. Student requests supervisor
6. Faculty accepts request
7. Admin approves project
8. Student submits phase evidence

## Viva Demo Flow (Quick Sequence)
1. Login as student and show project creation
2. Login as faculty and review/accept
3. Login as admin and approve
4. Return to student and show progress + notifications

## Quick Troubleshooting
- If login fails: verify backend env and JWT secret.
- If data not showing: check MongoDB running and MONGO_URI value.
- If uploads fail: verify size/type and backend uploads permissions.
- If API calls fail from UI: verify REACT_APP_API_URL value.

## Notes
- Keep this file for your personal revision flow.
- README.md remains the single source of truth for project setup details.

## NEXT STEPS

1. Create all the remaining frontend page files (Student/Faculty/Admin Dashboards)
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
