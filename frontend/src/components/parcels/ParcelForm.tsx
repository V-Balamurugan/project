import { useState } from "react";
import { createParcel, updateParcel } from "../../api/parcelApi";
import type { Branch } from "../../types/branch";
import type { Parcel, ParcelCreate, ParcelUpdate } from "../../types/parcel";

interface ParcelFormProps {
  parcel?: Parcel | null;
  branches?: Branch[];
  onSuccess: () => void;
  onCancel: () => void;
}

const generateTrackingNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TRK-${timestamp}-${random}`;
};

export const ParcelForm = ({
  parcel,
  branches = [],
  onSuccess,
  onCancel,
}: ParcelFormProps) => {
  const isEditing = Boolean(parcel);

  const [formData, setFormData] = useState<ParcelCreate>({
    tracking_number: parcel?.tracking_number || generateTrackingNumber(),
    sender: parcel?.sender || "",
    receiver: parcel?.receiver || "",
    source_branch_id: parcel?.source_branch_id || (branches[0]?.id ?? 1),
    destination_branch_id: parcel?.destination_branch_id || (branches[1]?.id ?? branches[0]?.id ?? 2),
    source_address: parcel?.source_address || "",
    destination_address: parcel?.destination_address || "",
    latitude: parcel?.latitude ?? 9.9252,
    longitude: parcel?.longitude ?? 78.1198,
    service_type: parcel?.service_type || "STANDARD",
    priority: parcel?.priority || "NORMAL",
    weight: parcel?.weight ?? 1,
    status: parcel?.status || "REGISTERED",
    expected_delivery_time: parcel?.expected_delivery_time
      ? new Date(parcel.expected_delivery_time).toISOString().slice(0, 16)
      : "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name.includes("branch_id") ||
        name === "latitude" ||
        name === "longitude" ||
        name === "weight"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      if (formData.source_branch_id === formData.destination_branch_id) {
        setError("Source and destination branches cannot be the same.");
        setLoading(false);
        return;
      }

      if (isEditing && parcel?.id) {
        const updateData: ParcelUpdate = {
          sender: formData.sender,
          receiver: formData.receiver,
          source_branch_id: formData.source_branch_id,
          destination_branch_id: formData.destination_branch_id,
          source_address: formData.source_address,
          destination_address: formData.destination_address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          service_type: formData.service_type,
          priority: formData.priority,
          weight: formData.weight,
          status: formData.status,
          expected_delivery_time: formData.expected_delivery_time || null,
        };
        await updateParcel(parcel.id, updateData);
      } else {
        const createData: ParcelCreate = {
          ...formData,
          expected_delivery_time: formData.expected_delivery_time || null,
        };
        await createParcel(createData);
      }

      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || "Failed to save parcel. Please check inputs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? "Edit Parcel" : "Create New Parcel"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditing ? "Update details for parcel" : "Fill details to register a new shipment"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Tracking Number
              </label>
              <input
                type="text"
                name="tracking_number"
                value={formData.tracking_number}
                onChange={handleChange}
                disabled={isEditing}
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="REGISTERED">Registered</option>
                <option value="PROCESSING">Processing</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="DELAYED">Delayed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Sender Name
              </label>
              <input
                type="text"
                name="sender"
                value={formData.sender}
                onChange={handleChange}
                placeholder="Enter sender name"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Receiver Name
              </label>
              <input
                type="text"
                name="receiver"
                value={formData.receiver}
                onChange={handleChange}
                placeholder="Enter receiver name"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Source Branch
              </label>
              {branches.length > 0 ? (
                <select
                  name="source_branch_id"
                  value={formData.source_branch_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name} ({b.branch_code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  name="source_branch_id"
                  value={formData.source_branch_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none"
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Destination Branch
              </label>
              {branches.length > 0 ? (
                <select
                  name="destination_branch_id"
                  value={formData.destination_branch_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name} ({b.branch_code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  name="destination_branch_id"
                  value={formData.destination_branch_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Source Address
              </label>
              <textarea
                name="source_address"
                rows={2}
                value={formData.source_address}
                onChange={handleChange}
                placeholder="Enter pickup address"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Destination Address
              </label>
              <textarea
                name="destination_address"
                rows={2}
                value={formData.destination_address}
                onChange={handleChange}
                placeholder="Enter delivery address"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Service Type
              </label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
                <option value="SPEED_POST">Speed Post</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Expected Delivery Date & Time
              </label>
              <input
                type="datetime-local"
                name="expected_delivery_time"
                value={formData.expected_delivery_time || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isEditing
                ? "Update Parcel"
                : "Create Parcel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParcelForm;
