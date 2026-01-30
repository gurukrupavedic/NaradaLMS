# System Admin Module

## Purpose
Provides high-level administrative capabilities, system configuration, and global oversight tools.

## Responsibilities
- **Global Settings**: Management of system-wide configuration.
- **Audit Logs**: Viewing and managing security and action logs.
- **Feature Flags**: Toggling system capabilities (if implemented).
- **Data Maintenance**: cleanup tasks and global data integrity checks.

## Key Domain Invariants
1.  **Admin Only**: Strictly restricted to users with `admin` role.
2.  **Auditability**: Critical system changes must be logged.

## Exports
- `systemService`: Admin-level business logic.
- `systemStorage`: Data access for system configs and logs.
