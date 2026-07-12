type TupleSubset<T extends readonly unknown[]> = T extends readonly [infer Head, ...infer Tail]
  ? TupleSubset<Tail> | [Head, ...TupleSubset<Tail>]
  : []

export type Subset<T> = T extends readonly [unknown, ...unknown[]]
  ? TupleSubset<T>
  : T extends ArrayLike<unknown>
    ? T[number][]
    : never

export type Permissions<Acl> = {
  [K in keyof Acl]?: Subset<Acl[K]>
}
