import type { Branch } from "../../types/branch";

interface DeleteBranchModalProps {
  branch: Branch;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const DeleteBranchModal = ({
  branch,
  loading,
  onConfirm,
  onCancel,
}: DeleteBranchModalProps) => {
  return (
    <div className="space-y-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl">
        ⚠️
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Delete Branch?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Are you sure you want to delete{" "}
          <strong className="text-slate-700">
            {branch.branch_name}
          </strong>{" "}
          ({branch.branch_code})?
        </p>

        <p className="mt-2 text-xs text-red-500">
          This action cannot be undone.
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Delete Branch"}
        </button>
      </div>
    </div>
  );
};

export default DeleteBranchModal;