# Product Context: Multi-Tenancy for Pathasala Model

## Why this exists

NaradaLMS is being shaped as a multi-tenant platform serving multiple patasalas with isolated curriculum and identity, while sharing a common application foundation.

The immediate launch path is:

1. SLMTS pilot
2. RR onboarding after pilot validation

This document defines the product intent behind the technical implementation so execution stays aligned.

---

## Real-world model

### Tenants (Organizations)

Two initial orgs:

- `slmts`: Sri Lalita Maha Tripura Sundari Pathasala
- `rr`: Raja Rajeswari Pathasala

Both are independent learning communities with different logos/naming and separate curriculum.

### Curriculum isolation

- SLMTS curriculum and RR curriculum are separate.
- No cross-org content reuse in v1.
- Cross-org sharing is a future capability, not part of current scope.

### White-label intent

- Student portal is white-labeled per tenant.
- Admin portal remains Narada-branded and acts as a shared operations console.
- Per tenant differences in v1 are primarily name + logo (minimal visual divergence).
- The student auth page keeps a shared Narada-branded left hero across tenants so the product remains recognizably Narada LMS; tenant branding applies to the tenant-facing auth form area, pending state, and authenticated shell.

---

## Human/role model

### Learner-first community

Core product assumption: users primarily join to learn. Over time, some users volunteer into instructional or administrative responsibilities.

This means role expansion is additive, not identity-changing.

### Identity model

- One global user identity (`users` row) per person.
- Membership is per-org.
- Roles are per-org.

Examples:

- Ram may be `student + instructor` in SLMTS and `student + instructor` in RR.
- Kiran may be `student + admin` in SLMTS and not belong to RR.

### Default role behavior

Every approved org membership includes `student` as a default role. Other roles (`instructor`, `admin`) are additional permissions layered on top.

---

## Authority model

### Super-admin (global authority)

A super-admin is a global platform role (`users.is_super_admin = true`) with two responsibilities:

1. All regular admin capabilities across orgs
2. Exclusive control over user management:
   - approve pending account/org membership requests
   - add/remove org memberships
   - assign/remove per-org roles
   - promote/demote other super-admins

### Org admin (org-scoped authority)

Org admin remains meaningful and focused on operations inside an org:

- content management
- batch management
- org-level audit views
- other org operations as feature set expands

Org admins do not control user approvals or role governance.

---

## Registration and membership lifecycle

### New registration

When a new user registers from a tenant student portal:

- user account is created
- membership for that tenant is created as `pending`
- user can authenticate and view pending status screen
- user cannot access tenant content until approved by super-admin

### Joining a second org

When an existing user wants to join another org:

- user goes to that org's student portal
- system recognizes global account
- system creates pending membership request for target org
- super-admin approves to activate access

Questionnaire-based onboarding is intentionally deferred.

---

## Experience goals for v1

1. Clear and simple mental model for volunteers and learners
2. Strict org boundaries for content and membership
3. Centralized trust authority (super-admin) for access governance
4. Minimal UI churn: backend-first implementation, incremental UI adjustments
5. Fast local validation flow for SLMTS and RR without deployment complexity

---

## Out of scope for this phase

- Questionnaire schema and workflow
- Email invites/notifications
- Cross-org analytics dashboards
- Cross-org content sharing
- Hosting/domain purchasing decisions
