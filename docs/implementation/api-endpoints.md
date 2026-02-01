# Narada LMS - API Endpoint Map

This document maps all API endpoints in the Narada LMS monolith, organized by functional area and router.

## 1. Identity & Authentication (`/api/auth`)

Router: `server/routes/identity.routes.ts`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user | Public |
| `POST` | `/api/auth/login` | Email/Password login | Public |
| `GET` | `/api/auth/google` | Trigger Google OAuth | Public |
| `GET` | `/api/auth/google/callback` | Google OAuth callback | Public |
| `POST` | `/api/auth/logout` | Client-side logout | Public |
| `GET` | `/api/auth/me` | Get current user info | JWT |
| `GET` | `/api/auth/admin/users` | List all users | Admin |
| `POST` | `/api/auth/admin/users/:userId/approve` | Approve user | Admin |

## 2. Content Studio (`/api/content` & `/api`)

Router: `server/routes/content.routes.ts`

### Tracks

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tracks` | List all tracks | JWT |
| `GET` | `/api/tracks/:id` | Get track details | JWT |
| `POST` | `/api/tracks` | Create track | Content Mgr |
| `PUT` | `/api/tracks/:id` | Update track | Content Mgr |
| `DELETE` | `/api/tracks/:id` | Delete track | Content Mgr |

### Chapters

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tracks/:trackId/chapters` | List chapters (Namespaced) | JWT |
| `GET` | `/api/chapters/:trackId` | List chapters (Legacy) | JWT |
| `GET` | `/api/chapters/:chapterId/details` | Get chapter details | JWT |
| `POST` | `/api/tracks/:trackId/chapters` | Create chapter (Namespaced) | Content Mgr |
| `PUT` | `/api/chapters/:chapterId` | Update chapter | Content Mgr |
| `PATCH` | `/api/chapters/:chapterId/status` | Publish/Unpublish | Content Mgr |

### Audio & Segments (Namespaced)

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/content/chapters/:chapterId/segments` | List text segments | JWT |
| `GET` | `/api/content/chapters/:chapterId/audio` | List audio files | JWT |
| `POST` | `/api/content/chapters/:chapterId/audio` | Upload audio | Content Mgr |
| `GET` | `/api/content/chapters/:chapterId/mappings` | List audio mappings | JWT |

## 3. Batch Management (`/api/batches` & `/api`)

Router: `server/routes/batch.routes.ts`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/batches` | List all batches | JWT |
| `GET` | `/api/batches/my-batches` | List instructor batches | JWT |
| `POST` | `/api/batches` | Create batch | Admin |
| `GET` | `/api/batches/:id` | Get batch details | JWT |

## 4. Student Management (`/api/students` & `/api`)

Router: `server/routes/student.routes.ts`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students` | List all students | Admin |
| `GET` | `/api/students/:id` | Get student details | JWT |
| `GET` | `/api/students/:id/progress` | Get student progress | JWT |

## 5. Learning Portal (`/api/learning`)

Router: `server/routes/learning.routes.ts`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/learning/my-progress` | Current student progress | JWT |
| `GET` | `/api/learning/my-details` | Current student info | JWT |
| `POST` | `/api/learning/progress` | Update learning progress | JWT |

## 6. Admin Operations (`/api/admin`)

Router: `server/routes/admin.routes.ts`

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/audit-logs` | View audit logs | Admin |
| `GET` | `/api/admin/settings` | Get system settings | Admin |
| `POST` | `/api/admin/settings/:key` | Update system setting | Admin |
