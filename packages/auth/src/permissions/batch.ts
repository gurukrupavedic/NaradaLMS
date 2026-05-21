type Subset<T> = T extends ArrayLike<unknown> ? T[number][] : never

export type BatchAcl = typeof acl
export type BatchRole = keyof typeof batchStatements
export type BatchPermissions = {
  [K in keyof BatchAcl]?: Subset<BatchAcl[K]>
}

const acl = {
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
