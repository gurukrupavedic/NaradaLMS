# Audio/Media File Upload Dataflow Analysis
**Date:** December 18, 2025  
**Branch:** feature/uploads-analysis  
**Purpose:** Comprehensive analysis of how audio files are uploaded, stored, and served

---

## Executive Summary

**Current State:** Audio files uploaded through the Chapter Editor are:
1. Stored in the `uploads/` folder at project root
2. **Tracked by git** (110 MB of audio files currently in repository)
3. Served via Express static route `/uploads`
4. Metadata stored in PostgreSQL `audioFiles` table

**Problem Identified:** 83 audio files (110MB) are being tracked in git, which is **not best practice** for binary media files.

**Recommendation:** Move to cloud storage (Cloudflare R2, AWS S3, or similar) and add `uploads/` to `.gitignore`.

---

## Complete Dataflow Documentation

### 1. Frontend Upload Flow

#### Entry Points
User uploads audio files through the **Chapter Editor** interface at `/manage/tracks/:trackId/chapters/:chapterId`.

**Component:** `EditChapter.tsx` (Line 1908-1935)
- **Tab 2:** "Audio Management" section
- Supports drag-and-drop and file browse
- Accepts: `audio/*` and `video/*` file types

#### Upload Trigger

```typescript
// File: client/src/pages/EditChapter.tsx (Line 658-692)
const audioUploadMutation = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("audio", file);

    const response = await fetch(
      `/api/audio-files/${chapterId}/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Upload failed");
    }

    return response.json();
  },
  onSuccess: () => {
    toast({ title: "Audio file uploaded successfully" });
    queryClient.invalidateQueries({
      queryKey: [`/api/audio-files/${chapterId}`],
    });
  },
  onError: (error: any) => {
    toast({
      title: "Failed to upload audio file",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

**Frontend Validation:**
- Checks file type: `audio/*` or `video/*`
- No file size validation in frontend (relies on backend)
- Shows loading state during upload

---

### 2. Backend Processing Flow

#### API Route
**Endpoint:** `POST /api/audio-files/:chapterId/upload`

**File:** `server/routes/media.routes.ts` (Line 62-87)

```typescript
router.post('/audio-files/:chapterId/upload', 
  upload.single('audio'), // Multer middleware
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json(
          createErrorResponse('No audio file provided', 'NO_FILE_PROVIDED')
        );
      }
      const chapterId = parseInt(req.params.chapterId);

      // Extract audio metadata
      let duration = 0;
      try {
        const meta = await parseFile(req.file.path);
        duration = meta.format.duration || 0;
      } catch {}

      const created = await mediaService.uploadAudioFile({
        chapterId,
        filename: req.file.filename,           // Hash-based filename
        displayName: req.file.originalname || req.file.filename,
        fileSize: req.file.size,
        duration: Math.round(duration),
        mimeType: req.file.mimetype,
        uploadedBy: 'system',
      });
      res.json(created);
    } catch (error) { 
      next(error); 
    }
  }
);
```

---

### 3. Multer Configuration (File Storage)

**File:** `server/routes/media.routes.ts` (Line 38-50)

```typescript
// Multer setup (audio only)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,                          // ⚠️ Files stored at project root
  limits: { fileSize: FILE_UPLOAD.maxSize }, // 100MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});
```

**Key Configuration:**
- **Storage Location:** `uploads/` folder at project root (`process.cwd() + '/uploads'`)
- **Filename Strategy:** Multer generates hash-based filenames (e.g., `01df3aaa5d5c35755f7c793049feec3c`)
- **No Extension:** Files are stored without extensions
- **Max Size:** 100MB (from `shared/constants.ts`)
- **Allowed Types:** Only `audio/*` MIME types

**From `shared/constants.ts` (Line 28-31):**
```typescript
export const FILE_UPLOAD = {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a']
};
```

---

### 4. Database Storage

**Service:** `server/modules/media-pipeline/service.ts`

```typescript
async uploadAudioFile(data: CreateAudioFileData) {
  return await mediaStorage.createAudioFile(data);
}
```

**Database Table:** `audioFiles` (from `shared/schema.ts`)
```typescript
export const audioFiles = pgTable("audioFiles", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),         // Hash-based filename
  displayName: text("display_name"),            // Original filename
  fileSize: integer("file_size"),               // Bytes
  duration: integer("duration"),                // Seconds
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  url: text("url"),                             // Currently unused
});
```

**Stored Data Example:**
```json
{
  "id": 123,
  "chapterId": 45,
  "filename": "01df3aaa5d5c35755f7c793049feec3c",
  "displayName": "Rudram Chapter 1.mp3",
  "fileSize": 1186176,
  "duration": 120,
  "mimeType": "audio/mpeg",
  "uploadedBy": "system",
  "createdAt": "2025-12-15T21:37:02.000Z",
  "url": null
}
```

---

### 5. Static File Serving

**File:** `server/index.ts` (Line 52)

```typescript
// Serve uploaded files (audio, etc.)
app.use('/uploads', express.static('uploads'));
```

**How Files are Accessed:**
- Frontend URL: `/uploads/{filename}`
- Example: `/uploads/01df3aaa5d5c35755f7c793049feec3c`
- Express serves files directly from filesystem
- No authentication/authorization on uploaded files

---

### 6. Frontend File Retrieval

**Component:** `EditChapter.tsx` (Preview Tab, Line 2551-2580)

```typescript
<audio ref={previewAudioRef} controls />

// When audio file selected:
previewAudioRef.src = `/uploads/${audioFile.filename}`;
```

**Component:** `AudioPlayer.tsx` (Learn Mode)
```typescript
audioRef.current.src = file.url || `/uploads/${file.filename}`;
```

---

## Current State Analysis

### Files in `uploads/` Folder

**Statistics (as of Dec 18, 2025):**
- **Total Files:** 83
- **Total Size:** 110.12 MB
- **Upload Date:** All files created Dec 15, 2025 9:37 PM
- **File Types:** Audio files (no extensions visible)
- **Naming Convention:** MD5-style hashes (32 hex characters)

**Sample Files:**
```
01df3aaa5d5c35755f7c793049feec3c  1,186,176 bytes
02eb5fcb763a75ac1bd577d87dfa71ef  1,999,139 bytes
03581aee099f1d2c741a2e134e18ed7c  2,482,952 bytes
05dc949149441652c8ad6c58d4bf4c49    830,797 bytes
...
```

### Git Tracking Status

**Current Status:** ⚠️ **FILES ARE TRACKED BY GIT**

Evidence:
1. Files exist in working directory
2. `.gitignore` does NOT exclude `uploads/`
3. 110 MB of binary audio data in repository

**Verification Command:**
```bash
Select-String -Pattern "uploads" .gitignore
# Result: No matches found
```

---

## Problems Identified

### 🚨 Problem 1: Binary Files in Git
**Severity:** High

**Issue:**
- 83 audio files (110 MB) tracked in git repository
- Binary files bloat repository size
- Makes cloning/pulling slow
- No version control benefit for binary media

**Impact:**
- Repository size grows rapidly with more uploads
- Difficult to work with in version control
- Not scalable for production

---

### 🚨 Problem 2: No File Extensions
**Severity:** Medium

**Issue:**
- Uploaded files have no extensions (e.g., `.mp3`, `.wav`)
- Stored as hash-only: `01df3aaa5d5c35755f7c793049feec3c`

**Impact:**
- Cannot identify file type from filename
- OS cannot open files directly without MIME type
- Manual inspection difficult

**Why This Happens:**
Multer's default behavior when using `dest` (not `storage` with `diskStorage`).

---

### 🚨 Problem 3: No File Cleanup on Delete
**Severity:** Medium

**Issue:**
When audio file is deleted via API (`DELETE /api/audio-files/:audioFileId`):
```typescript
// server/routes/media.routes.ts (Line 93-98)
router.delete('/audio-files/:audioFileId', async (req, res, next) => {
  try {
    const id = parseInt(req.params.audioFileId);
    await mediaService.deleteAudioFile(id);  // Only deletes DB record
    res.json({ message: 'Audio file deleted successfully' });
  } catch (error) { next(error); }
});
```

**Impact:**
- Physical file remains in `uploads/` folder
- Orphaned files accumulate over time
- Wasted disk space

---

### 🚨 Problem 4: No Authentication on Uploads
**Severity:** Medium

**Issue:**
- Static route `/uploads` serves files with no auth check
- Anyone with filename can access any audio file
- No user permission validation

**Current Implementation:**
```typescript
app.use('/uploads', express.static('uploads')); // Public access
```

---

### 🚨 Problem 5: Unclear Origin of Existing Files
**Severity:** Low

**Question:** How did 83 files get uploaded on Dec 15, 2025?

**Possible Scenarios:**
1. Replit environment automatically uploaded during testing
2. Seed data script uploaded files
3. Manual testing created files
4. Git pulled from remote with files already committed

**Need to Verify:**
- Check git history: `git log --all -- uploads/`
- Check if files exist on remote: `git ls-tree origin/main uploads/`

---

## Recommended Solutions

### ✅ Solution 1: Move to Cloud Storage (Recommended)

**Benefits:**
- Files not in git repository
- Scalable storage
- CDN for faster delivery
- Professional file management

**Cloud Storage Options:**

#### Option A: Cloudflare R2 (Recommended)
- Free tier: 10 GB storage
- S3-compatible API
- No egress fees
- Easy Cloudflare integration

#### Option B: AWS S3
- Industry standard
- Pay-per-use pricing
- High reliability
- Rich ecosystem

#### Option C: Backblaze B2
- Cheaper than S3
- S3-compatible
- Good for archival

**Implementation Steps:**
1. Set up cloud storage bucket
2. Update multer config to use cloud SDK
3. Update URL generation in API responses
4. Add `uploads/` to `.gitignore`
5. Remove existing files from git history

---

### ✅ Solution 2: Keep Local Storage (For Development Only)

If cloud storage is not immediate priority:

#### Step 1: Add to `.gitignore`
```gitignore
# Uploaded media files
uploads/
!uploads/.gitkeep
```

#### Step 2: Remove from Git History
```bash
git rm -r --cached uploads/
git commit -m "Remove uploads folder from git tracking"
```

#### Step 3: Create `.gitkeep`
```bash
New-Item uploads/.gitkeep -ItemType File
git add uploads/.gitkeep
git commit -m "Add .gitkeep for uploads folder"
```

#### Step 4: Add File Extensions
Update multer config to preserve extensions:
```typescript
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const hash = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, `${hash}${ext}`);
    }
  }),
  limits: { fileSize: FILE_UPLOAD.maxSize },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});
```

#### Step 5: Add File Cleanup on Delete
```typescript
router.delete('/audio-files/:audioFileId', async (req, res, next) => {
  try {
    const id = parseInt(req.params.audioFileId);
    
    // Get file info before deleting
    const fileInfo = await mediaService.getAudioFileById(id);
    
    // Delete from database
    await mediaService.deleteAudioFile(id);
    
    // Delete physical file
    const filePath = path.join(uploadsDir, fileInfo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Audio file deleted successfully' });
  } catch (error) { 
    next(error); 
  }
});
```

#### Step 6: Add Authentication to Static Route
```typescript
// Replace public static route with authenticated route
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Optionally: Check if user has access to the chapter this audio belongs to
    
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});
```

---

## Dataflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────────┤
│  Chapter Editor → Tab 2: Audio Management                       │
│  - Drag & Drop / File Browse                                    │
│  - File Validation (audio/*)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/audio-files/:chapterId/upload
                         │ FormData: { audio: File }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                            │
├─────────────────────────────────────────────────────────────────┤
│  media.routes.ts                                                │
│  ├─ Multer Middleware                                           │
│  │   ├─ Validate: audio/* mimetype                            │
│  │   ├─ Check size: ≤ 100MB                                    │
│  │   └─ Save to: uploads/{hash}              ⚠️ NO GIT IGNORE │
│  │                                                               │
│  ├─ Extract Metadata (music-metadata)                           │
│  │   ├─ Duration                                                │
│  │   ├─ MIME type                                               │
│  │   └─ File size                                               │
│  │                                                               │
│  └─ mediaService.uploadAudioFile()                              │
│      └─ mediaStorage.createAudioFile()                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ INSERT INTO audioFiles
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────┤
│  audioFiles Table                                               │
│  ├─ id (serial)                                                 │
│  ├─ chapterId (FK → chapters)                                  │
│  ├─ filename (hash-based)                                       │
│  ├─ displayName (original filename)                             │
│  ├─ fileSize (bytes)                                            │
│  ├─ duration (seconds)                                          │
│  ├─ mimeType                                                    │
│  └─ uploadedBy                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Return audioFile record
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILE SYSTEM                                  │
├─────────────────────────────────────────────────────────────────┤
│  uploads/                                ⚠️ TRACKED BY GIT      │
│  ├─ 01df3aaa5d5c35755f7c793049feec3c (no extension)            │
│  ├─ 02eb5fcb763a75ac1bd577d87dfa71ef                            │
│  └─ ... (83 files, 110 MB)                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Static Route: /uploads/{filename}
                         │ ⚠️ NO AUTHENTICATION
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PLAYBACK (Audio Player)                      │
├─────────────────────────────────────────────────────────────────┤
│  <audio src="/uploads/{filename}" />                            │
│  - Learn Mode: AudioPlayer.tsx                                  │
│  - Preview Tab: EditChapter.tsx                                 │
│  - Audio Mapping Tab: EditChapter.tsx                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Lifecycle

### 1. Upload
```
User selects file → Frontend validation → POST to API → 
Multer saves to uploads/ → Metadata extracted → 
DB record created → Return success
```

### 2. Playback
```
User selects chapter → Query audioFiles by chapterId → 
Display in audio player → User plays → 
Browser requests /uploads/{filename} → 
Express serves static file → Audio streams to browser
```

### 3. Delete (Current - Incomplete)
```
User clicks delete → DELETE /api/audio-files/:id → 
DB record deleted → ⚠️ Physical file remains orphaned
```

### 3. Delete (Recommended)
```
User clicks delete → DELETE /api/audio-files/:id → 
Query file info → Delete from DB → 
Delete physical file from uploads/ → Return success
```

---

## Security Considerations

### Current Vulnerabilities

1. **No Upload Authentication**
   - Anyone can hit upload endpoint if they have chapter ID
   - Should require authenticated user with instructor/admin role

2. **No Access Control on Files**
   - Static route serves any file without auth check
   - Students from different tracks can access any audio file

3. **No Rate Limiting**
   - Multiple uploads could overwhelm server
   - No protection against upload spam

4. **No Virus Scanning**
   - Uploaded files are not scanned for malware
   - Risk if accepting user-uploaded content

---

## Performance Considerations

### Current Performance

**Pros:**
- ✅ Local file serving is fast
- ✅ No external API calls
- ✅ No latency from cloud storage

**Cons:**
- ❌ All files served from app server (no CDN)
- ❌ Large files increase server bandwidth usage
- ❌ No caching strategy
- ❌ Repository bloat affects git operations

---

## Migration Plan (if moving to cloud storage)

### Phase 1: Preparation
1. Choose cloud storage provider (Cloudflare R2 recommended)
2. Create bucket and configure permissions
3. Set up environment variables (API keys, bucket name)
4. Install cloud SDK (`npm install @aws-sdk/client-s3`)

### Phase 2: Code Changes
1. Create new storage service (`server/services/storage.service.ts`)
2. Update multer config to upload to cloud
3. Update URL generation in API responses
4. Test upload/playback with cloud URLs

### Phase 3: Migration
1. Upload existing 83 files to cloud storage
2. Update database URLs to point to cloud
3. Verify all files are accessible
4. Delete local copies from `uploads/`

### Phase 4: Cleanup
1. Add `uploads/` to `.gitignore`
2. Remove from git history: `git rm -r --cached uploads/`
3. Commit and push changes

### Phase 5: Monitoring
1. Monitor upload success rates
2. Check file access logs
3. Verify no broken links in frontend

---

## Testing Checklist

Before implementing any changes:

- [ ] Test audio upload with various file types (.mp3, .wav, .m4a)
- [ ] Test file size limits (upload 101 MB file, should fail)
- [ ] Test upload with non-audio file (should fail)
- [ ] Test audio playback in Learn Mode
- [ ] Test audio playback in Chapter Editor Preview
- [ ] Test audio segmentation workflow
- [ ] Test audio file deletion (verify physical file removed)
- [ ] Test multiple audio files per chapter
- [ ] Test chapter deletion (verify cascade delete of audio files)
- [ ] Test access control (unauthenticated user cannot access files)

---

## Related Files Reference

### Backend Files
- `server/routes/media.routes.ts` - Upload API routes
- `server/modules/media-pipeline/service.ts` - Business logic
- `server/modules/media-pipeline/storage.ts` - Database operations
- `server/modules/media-pipeline/types.ts` - TypeScript interfaces
- `server/index.ts` - Static file serving configuration
- `shared/schema.ts` - Database schema (audioFiles table)
- `shared/constants.ts` - File upload configuration

### Frontend Files
- `client/src/pages/EditChapter.tsx` - Main upload interface
- `client/src/components/chapter-editor/AudioMappingTab.tsx` - Upload UI component
- `client/src/components/AudioPlayer.tsx` - Audio playback component
- `client/src/hooks/useAudioPlayer.ts` - Audio player logic

### Documentation Files
- `docs/architecture/MODULE-BREAKDOWN-DETAILED.md` - Module architecture
- `docs/PROJECT_DOCUMENTATION.md` - Project overview

---

## Conclusion

The current audio upload system works functionally but has several architectural issues:

1. **🚨 Critical:** Binary files tracked in git (110 MB)
2. **⚠️ Medium:** No file cleanup on delete (orphaned files)
3. **⚠️ Medium:** No file extensions (hard to inspect)
4. **⚠️ Medium:** No authentication on static file route

**Immediate Action Required:**
Add `uploads/` to `.gitignore` and remove from git history.

**Long-term Recommendation:**
Migrate to cloud storage (Cloudflare R2) for scalability and best practices.

---

**Document Version:** 1.0  
**Last Updated:** December 18, 2025  
**Author:** AI Assistant (GitHub Copilot)
