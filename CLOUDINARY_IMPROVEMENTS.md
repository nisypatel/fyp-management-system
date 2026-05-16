# Cloudinary File Organization & Preview System - Implementation Guide

## Overview

This document describes the improvements made to Cloudinary file organization and the document preview system in the FYP Management System.

## Changes Summary

### 1. **Enhanced Cloudinary File Organization**

#### Dynamic Folder Structure
Files are now organized in a meaningful, hierarchical structure based on user role and context:

```
fyp-management/
├── student/
│   ├── [user-id]/
│   │   └── projects/
│   │       ├── [project-title]/
│   │       │   ├── proposal/
│   │       │   ├── documents/
│   │       │   ├── phases/
│   │       │   └── code-review/
├── faculty/
│   ├── supervised/
│   │   └── [project-title]/
│   │       ├── documents/
│   │       └── code-review/
└── admin/
    └── project-review/
        └── [project-id]/
            ├── documents/
            └── code-review/
```

#### Readable File Naming
- Files are named readably with timestamps for uniqueness
- Format: `{sanitized-filename}_{timestamp}.{ext}`
- Example: `project-proposal_1715785200.pdf`
- Benefits:
  - Easy to identify files manually in Cloudinary console
  - Prevents naming conflicts
  - Maintains original filename information

### 2. **Backend Changes**

#### Updated Cloudinary Utilities (`backend/utils/cloudinary.js`)

**New Functions:**

- `buildDynamicCloudinaryFolder(context)` - Generates folder path from context
  ```javascript
  buildDynamicCloudinaryFolder({
    userRole: 'student',
    userId: '507f1f77bcf86cd799439011',
    projectTitle: 'AI Chatbot',
    fileType: 'documents'
  });
  // Returns: 'fyp-management/student/507f1f77bcf86cd799439011/projects/ai-chatbot/documents'
  ```

- `generateReadableFilename(originalName)` - Creates readable, unique filenames
  - Sanitizes special characters
  - Adds timestamp suffix
  - Preserves file extension

- `buildCloudinaryPreviewUrl(file)` - Generates preview URLs without attachment flag
  - Used for in-browser preview
  - Returns optimized Cloudinary URL

- `buildCloudinaryOptimizedPreviewUrl(secureUrl, fileType)` - Adds optimization transforms
  - Images: auto quality and format
  - PDFs: page preview optimization
  - Videos: native preview URL

#### Updated Controllers (`backend/controllers/projectController.js`)

All file uploads now use Cloudinary:

- **uploadDocument()** - Documents uploaded with project context
- **submitPhase()** - Phase submissions upload both file and video to Cloudinary
- **uploadScreenRecording()** - Screen recordings with organized structure

All uploads include:
- Dynamic folder organization
- Readable filenames
- Resource type detection
- Metadata preservation

### 3. **Frontend Changes**

#### Enhanced File Utilities (`frontend/src/utils/fileUtils.js`)

**New Functions:**

- `getDocumentPreviewUrl(file)` - Gets optimized preview URL
  - Prioritizes Cloudinary secure URLs
  - Applies file-type specific optimizations
  - Falls back to download URL if needed

- `buildCloudinaryPreviewUrl(secureUrl, fileKind)` - Adds optimizations
  - Image optimization: `q_auto,f_auto`
  - PDF optimization: `page_1,q_auto`

**Updated Functions:**

- `getDocumentDownloadUrl()` - Enhanced to handle Cloudinary URLs properly
- `resolveDocumentSource()` - Uses new preview URL builder

#### New Preview Modal Component (`frontend/src/components/ui/PreviewModal.js`)

Modern modal-based preview with:
- Image preview with native browser rendering
- PDF preview via iframe
- Video preview with native player
- Error states and loading indicators
- Responsive design for mobile
- Download button alongside preview
- Clean, professional UI

**Features:**
- Inline preview without opening new windows
- Automatic file type detection
- Graceful fallback for unsupported types
- Mobile-optimized layout

**Usage:**
```jsx
<PreviewModal
  file={document}
  isOpen={showPreview}
  onClose={() => setShowPreview(false)}
/>
```

#### Updated DocumentActions Component (`frontend/src/components/ui/DocumentActions.js`)

- Integrated PreviewModal for better UX
- Falls back to new window if needed
- Separate download action
- Cleaner UI/UX

#### New Styles (`frontend/src/styles/preview-modal.css`)

- Modern modal styling
- Smooth animations
- Responsive design
- Mobile-friendly layout
- Accessibility-focused

#### Updated File Service (`frontend/src/services/fileService.js`)

- Added `getPreviewUrl()` helper
- Supports both Cloudinary and API URLs

## API Behavior (No Changes Required)

The existing API endpoints remain unchanged:
- `GET /api/files/download/:filename` - Continues to work with Cloudinary public IDs
- File structure in database is enhanced but backward compatible

## Database Model Updates

No schema changes required. New fields store Cloudinary metadata:
- `secure_url` - Cloudinary delivery URL
- `public_id` - Cloudinary asset ID
- `original_filename` - Original file name
- `resource_type` - image, video, raw
- `format` - File extension
- `bytes` - File size

Existing `path` and `filename` fields remain for backward compatibility.

## File Type Support

### Preview Support (In-Browser)
- ✅ **Images**: PNG, JPG, JPEG, GIF, WEBP, BMP, SVG
- ✅ **PDFs**: Native iframe preview
- ✅ **Videos**: MP4, WebM, MOV, AVI, MKV (via HTML5 video)

### Supported Uploads (All Types)
- PDFs
- Office documents (DOC, DOCX, PPT, PPTX)
- Archives (ZIP, RAR)
- Images (JPG, PNG)
- Videos (MP4, WebM, AVI, MOV, MKV, FLV, WMV)
- Text files

### Fallback Behavior
- Unsupported types show download link
- Error states display helpful messages
- Download always available as fallback

## User Experience Improvements

### Faculty/Admin Preview
1. **Click View Icon** → Opens inline modal
2. **Modal Shows**:
   - File name and type
   - Preview (if supported)
   - Download button
   - Close button
3. **Click Download** → Triggers browser download with original filename
4. **Easy Navigation** → No popup blockers, single window experience

### File Organization Benefits
- Files are manually browsable in Cloudinary console
- Easy to identify files by project/user
- Clear separation of concerns
- Scalable structure for large deployments
- Professional appearance in cloud storage

## Backward Compatibility

✅ **Fully Backward Compatible**
- Existing files continue to work
- New uploads use optimized structure
- Mixed old/new files supported
- No database migrations needed
- Existing APIs unchanged

## Configuration

No additional configuration required. Uses existing Cloudinary credentials:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Testing Checklist

- [ ] Upload proposal file during project creation
- [ ] Upload documents to project
- [ ] Submit phase with file and video
- [ ] Upload screen recording
- [ ] View/preview each file type
- [ ] Download files with correct names
- [ ] Check Cloudinary folder structure
- [ ] Verify responsive design on mobile
- [ ] Test fallback for unsupported files
- [ ] Verify no duplicate upload logic

## Known Limitations

- PDFs preview first page only (Cloudinary limitation)
- Large videos may take time to load
- Office document preview not inline (use download for full viewing)
- Some old browsers may not support all video formats

## Future Enhancements

Potential improvements for future versions:
- Document OCR and search
- Full Office document preview
- Image annotation tools
- Version history for files
- Bulk file operations
- Advanced filtering in preview modal
- Document collaboration features

## Troubleshooting

### Preview not showing
1. Check Cloudinary credentials are configured
2. Verify file is accessible (permissions)
3. Try downloading instead
4. Check browser console for errors

### Download not working
1. Verify `fl_attachment` flag is applied
2. Check file exists in Cloudinary
3. Verify public ID is correct
4. Check CORS settings in Cloudinary

### Files not organizing correctly
1. Verify user role is set correctly
2. Check project title is available
3. Review folder context in upload call
4. Check Cloudinary console for actual structure

## References

- Cloudinary Documentation: https://cloudinary.com/documentation
- MDN File API: https://developer.mozilla.org/en-US/docs/Web/API/File
- React Best Practices: https://react.dev/
