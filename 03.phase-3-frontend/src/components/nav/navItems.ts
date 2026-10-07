import type { IconName } from '../icons'
import type { UserType } from '../../types/session'

export interface NavItem {
  /** Legacy option number (traceability to COMEN02Y / COADM02Y). */
  option: number
  label: string
  description: string
  to: string
  /** Pass to NavLink `end` so parent list routes do not match child routes. */
  end?: boolean
  /** Side-nav group heading. */
  group: string
  icon: IconName
}

/** Main menu options in COMEN02Y order (SCREEN-02, STORY-004). */
export const mainMenuItems: NavItem[] = [
  {
    option: 1,
    label: 'Account View',
    description: 'Look up an account and its customer details.',
    to: '/accounts/view',
    group: 'Accounts',
    icon: 'user',
  },
  {
    option: 2,
    label: 'Account Update',
    description: 'Edit account status, limits and customer data.',
    to: '/accounts/update',
    group: 'Accounts',
    icon: 'edit',
  },
  {
    option: 3,
    label: 'Credit Card List',
    description: 'Browse cards by account or card number.',
    to: '/cards',
    end: true,
    group: 'Cards',
    icon: 'list',
  },
  {
    option: 4,
    label: 'Credit Card View',
    description: "View one card's embossed name, status and expiry.",
    to: '/cards/detail',
    group: 'Cards',
    icon: 'card',
  },
  {
    option: 5,
    label: 'Credit Card Update',
    description: "Change a card's name, status or expiry.",
    to: '/cards/update',
    group: 'Cards',
    icon: 'edit',
  },
  {
    option: 6,
    label: 'Transaction List',
    description: 'Browse posted transactions page by page.',
    to: '/transactions',
    end: true,
    group: 'Transactions',
    icon: 'list',
  },
  {
    option: 7,
    label: 'Transaction View',
    description: 'Look up a single transaction by ID.',
    to: '/transactions/view',
    group: 'Transactions',
    icon: 'eye',
  },
  {
    option: 8,
    label: 'Transaction Add',
    description: 'Record a new transaction.',
    to: '/transactions/add',
    group: 'Transactions',
    icon: 'plus',
  },
  {
    option: 9,
    label: 'Transaction Reports',
    description: 'Request a monthly, yearly or custom report.',
    to: '/reports',
    group: 'Transactions',
    icon: 'report',
  },
  {
    option: 10,
    label: 'Bill Payment',
    description: 'Pay the full current balance on an account.',
    to: '/bill-payment',
    group: 'Transactions',
    icon: 'pay',
  },
]

/** Admin menu options in COADM02Y order (SCREEN-03, STORY-005). */
export const adminMenuItems: NavItem[] = [
  {
    option: 1,
    label: 'User List',
    description: 'Browse application users and pick one to maintain.',
    to: '/admin/users',
    end: true,
    group: 'User Security',
    icon: 'users',
  },
  {
    option: 2,
    label: 'User Add',
    description: 'Create a new user with a role.',
    to: '/admin/users/add',
    group: 'User Security',
    icon: 'userPlus',
  },
  {
    option: 3,
    label: 'User Update',
    description: "Change a user's name, password or role.",
    to: '/admin/users/update',
    group: 'User Security',
    icon: 'edit',
  },
  {
    option: 4,
    label: 'User Delete',
    description: 'Remove a user from the security file.',
    to: '/admin/users/delete',
    group: 'User Security',
    icon: 'userMinus',
  },
]

/** Type 'A' sees only administration functions; type 'U' only business options (approved decision 3). */
export function navItemsForUserType(userType: UserType): NavItem[] {
  return userType === 'A' ? adminMenuItems : mainMenuItems
}

export function homePathForUserType(userType: UserType): string {
  return userType === 'A' ? '/admin' : '/menu'
}

export function homeLabelForUserType(userType: UserType): string {
  return userType === 'A' ? 'Admin Menu' : 'Main Menu'
}

/** Ordered [group, items] pairs for the side navigation. */
export function groupNavItems(items: NavItem[]): Array<[string, NavItem[]]> {
  const groups: Array<[string, NavItem[]]> = []
  for (const item of items) {
    const existing = groups.find(([name]) => name === item.group)
    if (existing) {
      existing[1].push(item)
    } else {
      groups.push([item.group, [item]])
    }
  }
  return groups
}
