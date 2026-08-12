import type { Parcel } from "../../types/parcel";

interface ParcelTableProps {
  parcels: Parcel[];
  loading?: boolean;
  onEdit?: (parcel: Parcel) => void;
  onDelete: (id: number) => void;
}

const getPriorityBadgeClass = (priority: string) => {
  switch (priority.toUpperCase()) {
    case "URGENT":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "HIGH":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "NORMAL":
      return "bg-sky-100 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status.toUpperCase()) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700";
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
    case "DISPATCHED":
      return "bg-blue-100 text-blue-700";
    case "REGISTERED":
    case "PROCESSING":
      return "bg-purple-100 text-purple-700";
    case "DELAYED":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
    case "RETURNED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export const ParcelTable = ({
  parcels,
  loading = false,
  onEdit,
  onDelete,
}: ParcelTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl">📦</div>
        <h3 className="mt-3 text-lg font-semibold text-slate-800">
          No parcels found
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          No registered packages match the current criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tracking & ID
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sender / Receiver
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Addresses
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Weight & Service
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Priority
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </th>
            <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {parcels.map((parcel) => (
            <tr key={parcel.id} className="transition hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="font-mono text-sm font-bold text-slate-900">
                  {parcel.tracking_number || `ID: #${parcel.id}`}
                </div>
                {parcel.id && (
                  <div className="text-xs text-slate-400">
                    ID: #{parcel.id}
                  </div>
                )}
              </td>

              <td className="px-6 py-4">
                <div className="text-sm font-semibold text-slate-800">
                  From: {parcel.sender}
                </div>
                <div className="text-sm text-slate-500">
                  To: {parcel.receiver}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="max-w-xs text-xs text-slate-700 truncate" title={parcel.source_address}>
                  <span className="font-medium text-slate-500">Source:</span> {parcel.source_address}
                </div>
                <div className="max-w-xs text-xs text-slate-700 truncate mt-0.5" title={parcel.destination_address}>
                  <span className="font-medium text-slate-500">Dest:</span> {parcel.destination_address}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-sm font-medium text-slate-800">
                  {parcel.weight} kg
                </div>
                <div className="text-xs text-slate-500">
                  {parcel.service_type}
                </div>
              </td>

              <td className="px-6 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityBadgeClass(
                    parcel.priority
                  )}`}
                >
                  {parcel.priority}
                </span>
              </td>

              <td className="px-6 py-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                    parcel.status
                  )}`}
                >
                  {parcel.status.replace(/_/g, " ")}
                </span>
              </td>

              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(parcel)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => parcel.id && onDelete(parcel.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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

export default ParcelTable;
