"use client"

interface DeleteConfirmProps {
  repoName: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirm({
  repoName,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-foreground/20 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
        <p className="text-foreground/80 mb-4">
          Are you sure you want to delete <strong>{repoName}</strong>? This
          action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

