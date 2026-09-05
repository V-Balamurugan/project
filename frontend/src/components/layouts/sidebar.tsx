import { NavLink } from "react-router-dom";

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: "▣",
      },
    ],
  },

  {
    title: "Operations & 14-Stage Journey",
    items: [
      {
        label: "Parcels Booking",
        path: "/parcels",
        icon: "📦",
      },
      {
        label: "First-Mile Pickup",
        path: "/pickup-operations",
        icon: "🛵",
      },
      {
        label: "Middle-Mile Hubs",
        path: "/hub-operations",
        icon: "🏢",
      },
      {
        label: "Last-Mile Dispatch",
        path: "/assignments",
        icon: "⇄",
      },
      {
        label: "Live Delivery Tracking",
        path: "/tracking",
        icon: "➤",
      },
      {
        label: "Fleet Vehicles",
        path: "/vehicles",
        icon: "🚚",
      },
      {
        label: "Branch Hubs",
        path: "/branches",
        icon: "⌂",
      },
      {
        label: "Employees & Drivers",
        path: "/employees",
        icon: "♙",
      },
    ],
  },

  {
    title: "Intelligence & Routing",
    items: [
      {
        label: "Route Optimization",
        path: "/routes",
        icon: "⌁",
      },
      {
        label: "Delay Prediction",
        path: "/delay-prediction",
        icon: "◈",
      },
      {
        label: "Parcel Prioritization",
        path: "/prioritization",
        icon: "◆",
      },
      {
        label: "Delivery Analytics",
        path: "/analytics",
        icon: "▥",
      },
    ],
  },

  {
    title: "System & Maps",
    items: [
      {
        label: "Live Map",
        path: "/live-map",
        icon: "◎",
      },
      {
        label: "Branch Map",
        path: "/branch-map",
        icon: "⌖",
      },
      {
        label: "System Status",
        path: "/system-status",
        icon: "●",
      },
    ],
  },
];

const Sidebar = () => {
  return (
    <aside className="flex h-screen w-72 flex-col bg-slate-950 text-white">
      {/* Logo */}
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl text-slate-950">
            📦
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-wide">
              SMART POSTAL
            </h1>

            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Delivery Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navigation.map((section) => (
          <div
            key={section.title}
            className="mb-6"
          >
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              {section.title}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition",
                          isActive
                            ? "bg-slate-900 text-white"
                            : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white",
                        ].join(" ")}
                      >
                        {item.icon}
                      </span>

                      <span className="truncate">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Profile */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 rounded-xl p-3 bg-slate-900">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
            A
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              Administrator
            </p>

            <p className="truncate text-xs text-slate-500">
              System Admin
            </p>
          </div>

          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;