/** Maps each menu option's targetScreen (COMEN02Y/COADM02Y program id) to its route. */
export const SCREEN_ROUTES: Record<string, string> = {
  COACTVWC: '/accounts/view',
  COACTUPC: '/accounts/update',
  COCRDLIC: '/cards',
  COCRDSLC: '/cards/view',
  COCRDUPC: '/cards/update',
  COTRN00C: '/transactions',
  COTRN01C: '/transactions/view',
  COTRN02C: '/transactions/add',
  CORPT00C: '/reports',
  COBIL00C: '/bill-payment',
  COUSR00C: '/users',
  COUSR01C: '/users/add',
  COUSR02C: '/users/update',
  COUSR03C: '/users/delete',
}
