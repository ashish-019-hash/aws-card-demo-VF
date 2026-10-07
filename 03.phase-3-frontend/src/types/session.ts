/** SEC-USR-TYPE from ENTITY-011 Application User: 'A' = administrator, 'U' = regular user. */
export type UserType = 'A' | 'U'

export interface Session {
  userId: string
  userType: UserType
}

export interface SessionContextValue {
  session: Session | null
  signIn(session: Session): void
  signOut(): void
}
