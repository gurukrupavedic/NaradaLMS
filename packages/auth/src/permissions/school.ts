import { createAccessControl } from 'better-auth/plugins/access'

import type { Permissions } from './types'

export type SchoolAcl = typeof ac.statements
export type SchoolPermissions = Permissions<SchoolAcl>

export const ac = createAccessControl({
  school: ['update', 'delete'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
  enrollment: ['create', 'remove'],
  evaluation: ['read'],
} as const)

export const owner = ac.newRole({
  school: ['update', 'delete'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
  enrollment: ['create', 'remove'],
  evaluation: ['read'],
})

export const admin = ac.newRole({
  school: ['update'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
  enrollment: ['create', 'remove'],
  evaluation: ['read'],
})

export const member = ac.newRole({
  content: ['read'],
  batch: ['read'],
})
