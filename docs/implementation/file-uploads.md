# Narada LMS - File Upload Strategy

This document describes the current file upload implementation and the roadmap for multi-container and cloud-native storage.

## Current Implementation

As of Stage 0, Narada LMS handles file uploads (primarily audio for Vedic tracks) using:

- **Multer**: Middleware for handling `multipart/form-data`.
- **Local Storage**: Files are saved to a configurable directory (default: `./uploads`).
- **Music-Metadata**: Used to validate audio file integrity and extract duration.

### Upload Flow

1. Client sends `POST` request with `FormData`.
2. Server validates authentication (JWT).
3. Multer saves temporary file to `UPLOAD_DIR`.
4. `parseFile` extracts duration and validates audio format.
5. If invalid, the file is immediately deleted from disk.
6. If valid, metadata is saved to the database, and the file is persisted.

## Configuration (.env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `UPLOAD_DIR` | Relative path to store files | `uploads` |
| `MAX_FILE_SIZE` | Max file size in bytes | `104857600` (100MB) |

## Multi-Container Strategy (Stage 1)

When the monolith is split into containers, file storage requires special handling:

**Decision DP-1.10**: For Stage 1, we will continue using local storage but move to **Shared Volumes**.

- The `api` container and `content` container (if split) will share a Docker Volume or Kubernetes PersistentVolumeClaim (PVC).
- This ensures that files uploaded via the API are available to any other service that needs to process or serve them.

## Cloud Migration Roadmap (Post-Stage 1)

To achieve true scalability and high availability, the following migration is planned:

1. **Abstraction Layer**: Introduce a `StorageProvider` interface in the `media-pipeline` module.
2. **S3/GCS Driver**: Implement a driver for AWS S3 or Google Cloud Storage.
3. **Signed URLs**: Update the API to return signed URLs for both uploads and downloads, reducing bandwidth load on the server.
