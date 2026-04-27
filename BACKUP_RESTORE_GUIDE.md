# Backup and Restore Guide

## Scope
This guide covers database and uploaded project files for the FYP Management System.

## What to backup
1. MongoDB database: fyp_management
2. Uploaded files folder: backend/uploads
3. Environment files: backend/.env and frontend/.env (store securely)

## Recommended schedule
1. Daily backups during active submission periods
2. Weekly backups otherwise
3. Keep at least 3 recent backup snapshots

## Database backup
Run from any terminal where mongodump is available:

```bash
mongodump --uri="mongodb://localhost:27017/fyp_management" --out="./backups/fyp_management_backup"
```

## Database restore
Restore from a known backup snapshot:

```bash
mongorestore --uri="mongodb://localhost:27017/fyp_management" --drop "./backups/fyp_management_backup/fyp_management"
```

## Uploads backup
Create an archive of user uploads:

1. Archive folder: backend/uploads
2. Store archive with date in filename
3. Keep archive with matching database backup snapshot

## Restore checklist
1. Stop backend server
2. Restore MongoDB backup
3. Restore backend/uploads archive
4. Start backend server
5. Verify:
   - login works
   - projects list loads
   - file downloads are accessible
   - notifications appear

## Operational note
Run one full restore rehearsal before production/demo use to ensure backups are actually recoverable.
