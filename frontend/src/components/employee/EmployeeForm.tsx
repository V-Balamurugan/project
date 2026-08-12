import { useState } from "react";

import type {
  Branch,
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
} from "../../types/employee";

interface EmployeeFormProps {
  employee?: Employee | null;
  branches: Branch[];
  onSubmit: (
    data: EmployeeCreate | EmployeeUpdate
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const EmployeeForm = ({
  employee,
  branches,
  onSubmit,
  onCancel,
  loading = false,
}: EmployeeFormProps) => {
  const isEdit = Boolean(employee);

  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [vehicleType, setVehicleType] = useState("BIKE");
  const [status, setStatus] =
    useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD EMPLOYEE INTO EDIT FORM
  // ==========================================================

  const [prevEmployee, setPrevEmployee] = useState<Employee | null | undefined>(undefined);
  if (employee !== prevEmployee) {
    setPrevEmployee(employee);
    if (!employee) {
      setEmployeeCode("");
      setName("");
      setPhone("");
      setEmail("");
      setBranchId("");
      setVehicleType("BIKE");
      setStatus("ACTIVE");
      setLatitude("");
      setLongitude("");
    } else {
      setEmployeeCode(employee.employee_code);
      setName(employee.name);
      setPhone(employee.phone);
      setEmail(employee.email);
      setBranchId(String(employee.branch_id));
      setVehicleType(employee.vehicle_type);
      setStatus(employee.status);
      setLatitude(
        employee.current_latitude !== null
          ? String(employee.current_latitude)
          : ""
      );
      setLongitude(
        employee.current_longitude !== null
          ? String(employee.current_longitude)
          : ""
      );
    }
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!isEdit && !employeeCode.trim()) {
      setError("Employee code is required.");
      return;
    }

    if (!name.trim()) {
      setError("Employee name is required.");
      return;
    }

    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!branchId) {
      setError("Please select a branch.");
      return;
    }

    if (!vehicleType) {
      setError("Please select a vehicle type.");
      return;
    }

    const latitudeValue =
      latitude.trim() === ""
        ? null
        : Number(latitude);

    const longitudeValue =
      longitude.trim() === ""
        ? null
        : Number(longitude);

    if (
      latitudeValue !== null &&
      (!Number.isFinite(latitudeValue) ||
        latitudeValue < -90 ||
        latitudeValue > 90)
    ) {
      setError(
        "Latitude must be between -90 and 90."
      );
      return;
    }

    if (
      longitudeValue !== null &&
      (!Number.isFinite(longitudeValue) ||
        longitudeValue < -180 ||
        longitudeValue > 180)
    ) {
      setError(
        "Longitude must be between -180 and 180."
      );
      return;
    }

    try {
      if (isEdit) {
        const updateData: EmployeeUpdate = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          branch_id: Number(branchId),
          vehicle_type: vehicleType,
          status,
          current_latitude: latitudeValue,
          current_longitude: longitudeValue,
        };

        await onSubmit(updateData);
      } else {
        const createData: EmployeeCreate = {
          employee_code: employeeCode.trim(),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          branch_id: Number(branchId),
          vehicle_type: vehicleType,
          status,
          current_latitude: latitudeValue,
          current_longitude: longitudeValue,
        };

        await onSubmit(createData);
      }
    } catch {
      // Parent handles API errors.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit
                ? "Edit Employee"
                : "Add Employee"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {isEdit
                ? "Update employee information"
                : "Create a new delivery employee"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[75vh] overflow-y-auto px-6 py-6"
        >
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Branch loading / empty warning */}
          {branches.length === 0 && (
            <div className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              No branches available. Please make sure
              Branch Management is working and the backend
              is running.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Employee Code */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Employee Code
              </label>

              <input
                type="text"
                value={employeeCode}
                onChange={(event) =>
                  setEmployeeCode(event.target.value)
                }
                disabled={isEdit}
                placeholder="EMP0031"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Employee Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ravi Kumar"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="9876543210"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="employee@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Branch
              </label>

              <select
                value={branchId}
                onChange={(event) =>
                  setBranchId(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="">
                  Select Branch
                </option>

                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Vehicle Type
              </label>

              <select
                value={vehicleType}
                onChange={(event) =>
                  setVehicleType(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="BIKE">Bike</option>
                <option value="VAN">Van</option>
                <option value="TRUCK">Truck</option>
                <option value="E_BIKE">E-Bike</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | "ACTIVE"
                      | "INACTIVE"
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>
            </div>

            {/* Latitude */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Current Latitude
              </label>

              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(event) =>
                  setLatitude(event.target.value)
                }
                placeholder="9.5084"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Current Longitude
              </label>

              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(event) =>
                  setLongitude(event.target.value)
                }
                placeholder="78.0945"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-7 flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading || branches.length === 0
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : isEdit
                ? "Update Employee"
                : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;