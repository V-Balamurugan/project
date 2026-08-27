import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "./components/layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import BranchManagement from "./pages/BranchManagement";
import EmployeeManagement from "./pages/EmployeeManagement";
import ComingSoon from "./pages/ComingSoon";
import ParcelPage from "./pages/ParcelPage";
import DeliveryAssignments from "./pages/DeliveryAssignments";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Admin Application */}
        <Route element={<AdminLayout />}>

          {/* Main */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Operations */}
          <Route
            path="/branches"
            element={<BranchManagement />}
          />

          <Route
            path="/employees"
            element={<EmployeeManagement />}
          />

          <Route
            path="/parcels"
            element={<ParcelPage />}
          />

          <Route
            path="/assignments"
            element={<DeliveryAssignments />}
          />

          <Route
            path="/tracking"
            element={<ComingSoon />}
          />

          {/* Intelligence */}
          <Route
            path="/routes"
            element={<ComingSoon />}
          />

          <Route
            path="/delay-prediction"
            element={<ComingSoon />}
          />

          <Route
            path="/prioritization"
            element={<ComingSoon />}
          />

          <Route
            path="/analytics"
            element={<ComingSoon />}
          />

          {/* Maps */}
          <Route
            path="/live-map"
            element={<ComingSoon />}
          />

          <Route
            path="/branch-map"
            element={<ComingSoon />}
          />

          {/* System */}
          <Route
            path="/reports"
            element={<ComingSoon />}
          />

          <Route
            path="/settings"
            element={<ComingSoon />}
          />

          <Route
            path="/system-status"
            element={<ComingSoon />}
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={<ComingSoon />}
          />

        </Route>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;