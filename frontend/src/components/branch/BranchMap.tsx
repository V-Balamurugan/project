import type { Branch } from "../../types/branch";

interface BranchMapProps {
  branches: Branch[];
}

/**
 * BranchMap — placeholder for the interactive branch map component.
 * Will be implemented when map integration is added.
 */
const BranchMap = ({ branches }: BranchMapProps) => {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <div className="text-4xl">🗺️</div>

        <h3 className="mt-3 text-base font-semibold text-slate-700">
          Map View Coming Soon
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {branches.length} branch{branches.length !== 1 ? "es" : ""} available.
        </p>
      </div>
    </div>
  );
};

export default BranchMap;
