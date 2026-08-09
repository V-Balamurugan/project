import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "./components/layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import BranchManagement from "./pages/BranchManagement";
import Comingsoon from "./pages/comingsoon";

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
            element={<Comingsoon />}
          />

          <Route
            path="/parcels"
            element={<Comingsoon />}
          />

          <Route
            path="/assignments"
            element={<Comingsoon />}
          />

          <Route
            path="/tracking"
            element={<Comingsoon />}
          />

          {/* Intelligence */}
          <Route
            path="/routes"
            element={<Comingsoon />}
          />

          <Route
            path="/delay-prediction"
            element={<Comingsoon />}
          />

          <Route
            path="/prioritization"
            element={<Comingsoon />}
          />

          <Route
            path="/analytics"
            element={<Comingsoon />}
          />

          {/* Maps */}
          <Route
            path="/live-map"
            element={<Comingsoon />}
          />

          <Route
            path="/branch-map"
            element={<Comingsoon />}
          />

          {/* System */}
          <Route
            path="/reports"
            element={<Comingsoon />}
          />

          <Route
            path="/settings"
            element={<Comingsoon />}
          />

          <Route
            path="/system-status"
            element={<Comingsoon />}
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={<Comingsoon />}
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