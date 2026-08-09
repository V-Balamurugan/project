import { useEffect, useState } from "react";
import type {
  Branch,
  BranchCreate,
  BranchUpdate,
} from "../../types/branch";

interface BranchFormProps {
  branch?: Branch | null;
  loading: boolean;
  onSubmit: (
    data: BranchCreate | BranchUpdate
  ) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  branch_code: string;
  branch_name: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  phone: string;
  status: string;
}

const emptyForm: FormState = {
  branch_code: "",
  branch_name: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  phone: "",
  status: "ACTIVE",
};

const BranchForm = ({
  branch,
  loading,
  onSubmit,
  onCancel,
}: BranchFormProps) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  const editing = Boolean(branch);

  useEffect(() => {
    if (branch) {
      setForm({
        branch_code: branch.branch_code,
        branch_name: branch.branch_name,
        address: branch.address,
        city: branch.city,
        latitude: String(branch.latitude),
        longitude: String(branch.longitude),
        phone: branch.phone ?? "",
        status: branch.status,
      });
    } else {
      setForm(emptyForm);
    }

    setError("");
  }, [branch]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setError("");

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }

    if (
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    if (!form.branch_code.trim()) {
      setError("Branch code is required.");
      return;
    }

    if (!form.branch_name.trim()) {
      setError("Branch name is required.");
      return;
    }

    const data: BranchCreate | BranchUpdate = {
      branch_code: form.branch_code.trim(),
      branch_name: form.branch_name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      latitude,
      longitude,
      phone: form.phone.trim() || null,
      status: form.status,
    };

    try {
      await onSubmit(data);
    } catch {
      setError("Unable to save branch.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Branch Code
          </label>

          <input
            name="branch_code"
            value={form.branch_code}
            onChange={handleChange}
            disabled={editing}
            placeholder="BR001"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Branch Name
          </label>

          <input
            name="branch_name"
            value={form.branch_name}
            onChange={handleChange}
            placeholder="Madurai Central"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Address
          </label>

          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Anna Nagar"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            City
          </label>

          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Madurai"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Phone
          </label>

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="9876543210"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Latitude
          </label>

          <input
            name="latitude"
            type="number"
            step="any"
            value={form.latitude}
            onChange={handleChange}
            placeholder="9.9252"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Longitude
          </label>

          <input
            name="longitude"
            type="number"
            step="any"
            value={form.longitude}
            onChange={handleChange}
            placeholder="78.1198"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Status
          </label>

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : editing
              ? "Update Branch"
              : "Create Branch"}
        </button>
      </div>
    </form>
  );
};

export default BranchForm;