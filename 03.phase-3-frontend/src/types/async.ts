/**
 * Shared async view state for Step 2 preview lookups. Step 3 maps TanStack
 * Query results onto the same shape (isPending -> loading, isError -> error,
 * data -> success).
 */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }
