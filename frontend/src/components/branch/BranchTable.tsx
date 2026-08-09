import type { Branch } from "../../types/branch";

interface BranchTableProps {
  branches: Branch[];
  loading: boolean;
  onView: (branch: Branch) => void;
  onEdit: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
}

const BranchTable = ({
  branches,
  loading,
  onView,
  onEdit,
  onDelete,
}: BranchTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl">📭</div>

        <h3 className="mt-3 text-lg font-semibold text-slate-800">
          No branches found
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Try another search or create a new branch.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Code
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Branch
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              City
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>

            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {branches.map((branch) => (
            <tr
              key={branch.id}
              className="transition hover:bg-slate-50"
            >
              <td className="px-6 py-4">
                <span className="font-mono text-sm font-semibold text-slate-700">
                  {branch.branch_code}
                </span>
              </td>

              <td className="px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    {branch.branch_name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {branch.address}
                  </p>
                </div>
              </td>

              <td className="px-6 py-4 text-sm text-slate-600">
                {branch.city}
              </td>

              <td className="px-6 py-4 text-sm text-slate-600">
                {branch.phone || "—"}
              </td>

              <td className="px-6 py-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    branch.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {branch.status}
                </span>
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onView(branch)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    View
                  </button>

                  <button
                    onClick={() => onEdit(branch)}
                    className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onDelete(branch)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BranchTable;