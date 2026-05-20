import { createAccessControl } from 'better-auth/plugins/access'

export const acl = createAccessControl({
  school: ['update', 'delete'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
  evaluation: ['create', 'read'],
  exam: ['create', 'read', 'update'],
})

export const owner = acl.newRole({
  school: ['update', 'delete'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
  evaluation: ['create', 'read'],
  exam: ['create', 'read', 'update'],
})

export const admin = acl.newRole({
  school: ['update'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
  evaluation: ['create', 'read'],
  exam: ['create', 'read', 'update'],
})

export const member = acl.newRole({
  content: ['read'],
  batch: ['read'],
  evaluation: ['read'],
  exam: ['read'],
})
