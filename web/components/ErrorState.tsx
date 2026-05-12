'use client'

interface Props {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Failed to load data.', onRetry }: Props) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 px-5 py-10 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-xs font-medium text-red-700 hover:text-red-800 underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
