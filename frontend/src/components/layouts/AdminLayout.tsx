import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";

const AdminLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Main Application Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          {/* Page/System Information */}
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Smart Postal & Courier
            </p>

            <p className="hidden text-xs text-slate-500 sm:block">
              Delivery Management System
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* System Status */}
            <div className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-medium text-emerald-700">
                System Online
              </span>
            </div>

            {/* Notification */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Notifications"
            >
              🔔

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* User Avatar */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;