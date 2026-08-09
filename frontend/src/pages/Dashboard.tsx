import { useEffect, useState } from "react";

import type { DashboardSummary } from "../types/dashboard";
import { getDashboardSummary } from "../services/dashboard_Service";


export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const result = await getDashboardSummary();

        setData(result);
        setError(null);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">
          Loading dashboard...
        </p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-red-600">
            {error}
          </p>
        </div>
      </div>
    );
  }


  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">
          No dashboard data available.
        </p>
      </div>
    );
  }


  const cards = [
    {
      title: "Total Parcels",
      value: data.total_parcels,
    },
    {
      title: "Today's Deliveries",
      value: data.today_deliveries,
    },
    {
      title: "Pending Deliveries",
      value: data.pending_deliveries,
    },
    {
      title: "Completed Deliveries",
      value: data.completed_deliveries,
    },
    {
      title: "Delayed Parcels",
      value: data.delayed_parcels,
    },
    {
      title: "Active Employees",
      value: data.active_employees,
    },
  ];


  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Smart Delivery Control Center
        </h1>

        <p className="mt-2 text-slate-500">
          Real-time overview of postal and courier operations
        </p>
      </div>


      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >

            <p className="text-sm font-medium text-slate-500">
              {card.title}
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {card.value}
            </p>

          </div>
        ))}

      </div>


      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-slate-900">
            AI Delivery Intelligence
          </h2>

          <div className="mt-5 space-y-4">

            <div className="flex justify-between">
              <span className="text-slate-500">
                High-Risk Deliveries
              </span>

              <span className="font-semibold">
                {data.high_risk_deliveries}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-slate-500">
                Predicted Delays
              </span>

              <span className="font-semibold">
                {data.predicted_delays}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-slate-500">
                Average Predicted Delay
              </span>

              <span className="font-semibold">
                {data.average_predicted_delay} min
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-slate-500">
                Route Savings
              </span>

              <span className="font-semibold">
                {data.route_optimization_savings} km
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-slate-500">
                Employee Performance
              </span>

              <span className="font-semibold">
                {data.average_employee_performance}%
              </span>
            </div>

          </div>

        </div>


        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-slate-900">
            System Status
          </h2>

          <div className="mt-5 space-y-4">

            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                Backend API
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                Online
              </span>
            </div>


            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                Database
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                Connected
              </span>
            </div>


            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                AI Engine
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                Coming Soon
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}