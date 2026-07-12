import type { Permissions } from './types'

export type BatchAcl = typeof acl
export type BatchRole = keyof typeof batchStatements
export type BatchPermissions = Permissions<BatchAcl>

// Batch membership is stored in the per-school schema, not BetterAuth organizations,
// so this ACL intentionally stays runtime-independent from BetterAuth's access control.
export const acl = {
  evaluation: ['create', 'read'],
  exam: ['create', 'read', 'update'],
  enrollment: ['create', 'read', 'remove'],
} as const

export const batchStatements = {
  instructor: {
    evaluation: ['create', 'read'],
    exam: ['create', 'read', 'update'],
    enrollment: ['create', 'read', 'remove'],
  },
  ta: {
    evaluation: ['create', 'read'],
    exam: ['create', 'read', 'update'],
    enrollment: ['read'],
  },
  student: {
    evaluation: ['read'],
    exam: ['read'],
    enrollment: ['read'],
  },
} satisfies Record<string, Required<BatchPermissions>>

export function hasBatchPermission(role: BatchRole, requested: BatchPermissions): boolean {
  return (Object.keys(requested) as (keyof BatchPermissions)[]).every(resource => {
    const granted = new Set(batchStatements[role][resource])
    return requested[resource]?.every(action => granted.has(action)) ?? true
  })
}
