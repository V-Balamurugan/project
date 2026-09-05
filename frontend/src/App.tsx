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
import DeliveryTracking from "./pages/DeliveryTracking";
import RouteOptimization from "./pages/RouteOptimization";
import { VehicleManagement } from "./pages/VehicleManagement";
import { PickupOperations } from "./pages/PickupOperations";
import { HubOperations } from "./pages/HubOperations";
import MapTest from "./pages/MapTest";

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

          {/* 14-Stage Operations */}
          <Route
            path="/parcels"
            element={<ParcelPage />}
          />

          <Route
            path="/pickup-operations"
            element={<PickupOperations />}
          />

          <Route
            path="/hub-operations"
            element={<HubOperations />}
          />

          <Route
            path="/assignments"
            element={<DeliveryAssignments />}
          />

          <Route
            path="/tracking"
            element={<DeliveryTracking />}
          />

          <Route
            path="/vehicles"
            element={<VehicleManagement />}
          />

          <Route
            path="/branches"
            element={<BranchManagement />}
          />

          <Route
            path="/employees"
            element={<EmployeeManagement />}
          />

          {/* Map Test */}
          <Route
            path="/map-test"
            element={<MapTest />}
          />

          {/* Intelligence */}
          <Route
            path="/routes"
            element={<RouteOptimization />}
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