export type Subset<T> = T extends ArrayLike<unknown> ? T[number][] : never

export type Permissions<Acl> = {
  [K in keyof Acl]?: Subset<Acl[K]>
}
