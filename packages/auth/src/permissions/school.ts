import { createAccessControl } from 'better-auth/plugins/access'

type Subset<T> = T extends ArrayLike<unknown> ? T[number][] : never

export type SchoolAcl = typeof ac.statements
export type SchoolPermissions = {
  [K in keyof SchoolAcl]?: Subset<SchoolAcl[K]>
}

export const ac = createAccessControl({
  school: ['update', 'delete'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
} as const)

export const owner = ac.newRole({
  school: ['update', 'delete'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
})

export const admin = ac.newRole({
  school: ['update'],
  content: ['create', 'read', 'update'],
  batch: ['create', 'read', 'update'],
  member: ['create', 'read', 'remove'],
  invitation: ['create', 'read', 'cancel'],
})

export const member = ac.newRole({
  content: ['read'],
  batch: ['read'],
})
