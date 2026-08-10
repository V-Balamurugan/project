interface DeleteEmployeeModalProps {
  employeeName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const DeleteEmployeeModal = ({
  employeeName,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteEmployeeModalProps) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          ⚠️
        </div>

        <h2 className="text-lg font-semibold text-gray-900">
          Deactivate Employee?
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Are you sure you want to deactivate{" "}
          <span className="font-semibold text-gray-800">
            {employeeName}
          </span>
          ?
        </p>

        <p className="mt-2 text-xs text-gray-400">
          The employee will be marked as INACTIVE.
          Their historical records will remain in the
          system.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Deactivating..."
              : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteEmployeeModal;