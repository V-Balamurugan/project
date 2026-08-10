import type { Branch, Employee } from "../../types/employee";

interface EmployeeDetailsProps {
  employee: Employee;
  branches: Branch[];
  onClose: () => void;
}

const EmployeeDetails = ({
  employee,
  branches,
  onClose,
}: EmployeeDetailsProps) => {
  const branch = branches.find(
    (item) => item.id === employee.branch_id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Employee Details
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {employee.employee_code}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">

          {/* Basic */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Info
                label="Employee Code"
                value={employee.employee_code}
              />

              <Info
                label="Name"
                value={employee.name}
              />

              <Info
                label="Phone"
                value={employee.phone}
              />

              <Info
                label="Email"
                value={employee.email}
              />

              <Info
                label="Branch"
                value={
                  branch?.branch_name ??
                  `Branch #${employee.branch_id}`
                }
              />

              <Info
                label="Vehicle"
                value={employee.vehicle_type}
              />
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Status
            </h3>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                employee.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {employee.status}
            </span>
          </section>

          {/* Location */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Current Location
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Info
                label="Latitude"
                value={
                  employee.current_latitude !== null
                    ? String(employee.current_latitude)
                    : "Not available"
                }
              />

              <Info
                label="Longitude"
                value={
                  employee.current_longitude !== null
                    ? String(employee.current_longitude)
                    : "Not available"
                }
              />
            </div>
          </section>

          {/* Performance */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Performance
            </h3>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat
                label="Total"
                value={employee.total_deliveries}
              />

              <Stat
                label="Completed"
                value={employee.completed_deliveries}
              />

              <Stat
                label="Delayed"
                value={employee.delayed_deliveries}
              />

              <Stat
                label="Score"
                value={`${employee.performance_score}%`}
              />
            </div>
          </section>

          <section className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Average Delivery Time
            </p>

            <p className="mt-1 text-xl font-semibold text-gray-900">
              {employee.average_delivery_time} minutes
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

const Info = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div>
    <p className="text-xs font-medium uppercase text-gray-400">
      {label}
    </p>

    <p className="mt-1 break-words text-sm font-medium text-gray-800">
      {value}
    </p>
  </div>
);

const Stat = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl border bg-white p-4">
    <p className="text-xs text-gray-500">
      {label}
    </p>

    <p className="mt-1 text-lg font-semibold text-gray-900">
      {value}
    </p>
  </div>
);

export default EmployeeDetails;