/**
 * Application user view model (ENTITY-011 Application User, USRSEC file).
 * Field names follow the backend DTOs.
 */
export interface AppUser {
  /** 8-character user ID (SEC-USR-ID). */
  id: string
  /** SEC-USR-FNAME, max 20 characters. */
  firstName: string
  /** SEC-USR-LNAME, max 20 characters. */
  lastName: string
  /** SEC-USR-TYPE: 'A' = administrator, 'U' = regular user. */
  userType: 'A' | 'U'
}
