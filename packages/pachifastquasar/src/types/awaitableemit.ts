export interface AwaitableEmit<T> {
  data: T
  onSuccess: () => void
  onError: (error: unknown) => void
}
