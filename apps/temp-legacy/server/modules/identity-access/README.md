# Identity & Access Module

## Purpose
Manages user identities, authentication, roles, and session security. It is the gatekeeper for the entire application.

## Responsibilities
- **Authentication**: Handles Login, Registration, and Password management.
- **Authorization**: Manages RBAC (Role-Based Access Control) via `user_roles`.
- **User Management**: Profile updates and user search.
- **Approval Flow**: Manages the manual approval process for new registrants.

## Key Domain Invariants
1.  **Role Additivity**: Roles are additive (e.g., a user can be both `student` and `instructor`).
2.  **Manual Approval**: Registration is not automatic; users must optionally be approved before accessing course material.
3.  **Security**: Auth tokens and sensitive data are never exposed in API responses.

## Exports
- `identityService`: User and auth management logic.
- `identityStorage`: Database operations for users and roles.
