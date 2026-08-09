import { useCallback, useEffect, useMemo, useState } from "react";
import BranchTable from "../components/branch/BranchTable";
import BranchForm from "../components/branch/BranchForm";
import BranchDetails from "../components/branch/BranchDetails";
import DeleteBranchModal from "../components/branch/DeleteBranchModal";

import type {
  Branch,
  BranchCreate,
  BranchUpdate,
} from "../types/branch";

import {
  createBranch,
  deleteBranch,
  getBranches,
  updateBranch,
} from "../services/branchService";

type ModalType =
  | "create"
  | "edit"
  | "view"
  | "delete"
  | null;

const ITEMS_PER_PAGE = 8;

const BranchManagement = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedBranch, setSelectedBranch] =
    useState<Branch | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getBranches(
        search.trim() || undefined
      );

      setBranches(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBranches();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadBranches]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(branches.length / ITEMS_PER_PAGE)
  );

  const visibleBranches = useMemo(() => {
    const start =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return branches.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [branches, currentPage]);

  const openCreate = () => {
    setSelectedBranch(null);
    setModal("create");
  };

  const openEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setModal("edit");
  };

  const openView = (branch: Branch) => {
    setSelectedBranch(branch);
    setModal("view");
  };

  const openDelete = (branch: Branch) => {
    setSelectedBranch(branch);
    setModal("delete");
  };

  const closeModal = () => {
    if (saving || deleting) {
      return;
    }

    setModal(null);
    setSelectedBranch(null);
  };

  const handleSave = async (
    data: BranchCreate | BranchUpdate
  ) => {
    try {
      setSaving(true);

      if (modal === "create") {
        await createBranch(data as BranchCreate);
      } else if (
        modal === "edit" &&
        selectedBranch
      ) {
        await updateBranch(
          selectedBranch.id,
          data as BranchUpdate
        );
      }

      setModal(null);
      setSelectedBranch(null);

      await loadBranches();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) {
      return;
    }

    try {
      setDeleting(true);

      await deleteBranch(selectedBranch.id);

      setModal(null);
      setSelectedBranch(null);

      await loadBranches();
    } catch (err) {
      console.error(err);
      setError(
        "Unable to delete branch. It may be used by other records."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
              Branch Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage postal and courier branch locations.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + Add Branch
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Search */}
          <div className="border-b border-slate-200 p-4 md:p-5">
            <div className="relative max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search branches..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Table */}
          <BranchTable
            branches={visibleBranches}
            loading={loading}
            onView={openView}
            onEdit={openEdit}
            onDelete={openDelete}
          />

          {/* Pagination */}
          {!loading && branches.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    branches.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {branches.length}
                </span>{" "}
                branches
              </p>

              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="flex items-center px-3 text-sm text-slate-500">
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            {modal === "create" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Add Branch
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a new branch location.
                  </p>
                </div>

                <BranchForm
                  loading={saving}
                  onSubmit={handleSave}
                  onCancel={closeModal}
                />
              </>
            )}

            {modal === "edit" &&
              selectedBranch && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Edit Branch
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Update branch information.
                    </p>
                  </div>

                  <BranchForm
                    branch={selectedBranch}
                    loading={saving}
                    onSubmit={handleSave}
                    onCancel={closeModal}
                  />
                </>
              )}

            {modal === "view" &&
              selectedBranch && (
                <BranchDetails
                  branch={selectedBranch}
                  onClose={closeModal}
                />
              )}

            {modal === "delete" &&
              selectedBranch && (
                <DeleteBranchModal
                  branch={selectedBranch}
                  loading={deleting}
                  onConfirm={handleDelete}
                  onCancel={closeModal}
                />
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;