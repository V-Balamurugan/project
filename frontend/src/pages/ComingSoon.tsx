import { useLocation, useNavigate } from "react-router-dom";

export const ComingSoon = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pageName = location.pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
          🚧
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-blue-600">
          Module
        </p>

        <h1 className="mt-2 text-3xl font-bold capitalize text-slate-900">
          {pageName}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">
          This module is part of the Smart Postal Delivery
          Management System and will be implemented in the
          upcoming development phase.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-7 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ComingSoon;
