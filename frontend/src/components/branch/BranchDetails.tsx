import type { Branch } from "../../types/branch";

interface BranchDetailsProps {
  branch: Branch;
  onClose: () => void;
}

const BranchDetails = ({
  branch,
  onClose,
}: BranchDetailsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm font-semibold text-blue-600">
            {branch.branch_code}
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {branch.branch_name}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {branch.city}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            branch.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {branch.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Address
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {branch.address}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Phone
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {branch.phone || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Latitude
          </p>
          <p className="mt-2 font-mono text-sm text-slate-700">
            {branch.latitude}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Longitude
          </p>
          <p className="mt-2 font-mono text-sm text-slate-700">
            {branch.longitude}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Close
      </button>
    </div>
  );
};

export default BranchDetails;