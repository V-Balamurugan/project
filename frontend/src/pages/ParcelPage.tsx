import { useCallback, useEffect, useState } from "react";

import ParcelForm from "../components/parcels/ParcelForm";
import ParcelTable from "../components/parcels/ParcelTable";

import { deleteParcel, getParcels } from "../api/parcelApi";
import { getBranches } from "../services/branchService";

import type { Branch } from "../types/branch";
import type { Parcel } from "../types/parcel";

export const ParcelPage = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);

  // Fetch branches
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        const data = await getBranches();
        if (isMounted) {
          setBranches(data);
        }
      } catch (err) {
        console.error("Failed to load branches:", err);
      }
    };
    void fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch parcels
  const loadParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getParcels({
        search,
        status: statusFilter,
        priority: priorityFilter,
        page,
        limit: 10,
      });

      setParcels(res.parcels || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (error) {
      console.error("Failed to load parcels:", error);
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, page]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        loadParcels();
      }
    }, search ? 300 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadParcels, search]);

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this parcel?"
    );
    if (!confirmed) return;

    try {
      await deleteParcel(id);
      loadParcels();
    } catch (error) {
      console.error("Failed to delete parcel:", error);
      alert("Failed to delete parcel");
    }
  };

  const openCreateModal = () => {
    setEditingParcel(null);
    setShowModal(true);
  };

  const openEditModal = (parcel: Parcel) => {
    setEditingParcel(parcel);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingParcel(null);
  };

  const handleFormSuccess = () => {
    closeModal();
    loadParcels();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Parcel Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track, create, and manage all postal and courier shipments
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
        >
          <span>➕</span> New Parcel
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search sender, receiver, tracking..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500"
            >
              <option value="">All Statuses</option>
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
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPriorityFilter("");
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <ParcelTable
          parcels={parcels}
          loading={loading}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span> ({total} total parcels)
            </p>

            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ParcelForm
          parcel={editingParcel}
          branches={branches}
          onSuccess={handleFormSuccess}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default ParcelPage;
