export function BlockConfirmDialog({
  label,
  blocking,
  onCancel,
  onConfirm,
}: {
  label: string
  blocking: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={() => !blocking && onCancel()}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="block-title" className="text-sm font-medium text-neutral-900 dark:text-white">
          Block {label}?
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          They won't be able to message you or find you in search, and you won't see them either.
          You can undo this later in Settings.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={blocking}
            className="flex-1 rounded-xl bg-neutral-200 dark:bg-neutral-800 py-3 text-sm font-semibold text-neutral-900 dark:text-white pressable disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={blocking}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white pressable disabled:opacity-60"
          >
            {blocking ? 'Blocking…' : 'Block'}
          </button>
        </div>
      </div>
    </div>
  )
}
