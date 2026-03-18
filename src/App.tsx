// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* AUTH */
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import DashboardGate from "./pages/DashboardGate";


/* OWNER */
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerDeliveries from "./pages/OwnerDeliveries";
import OwnerVehicleOperations from "./pages/OwnerVehicleOperations";
import OwnerTransport from "./pages/OwnerTransport";
import OwnerVehicleRegistry from "./pages/OwnerVehicleRegistry";
import OwnerMoney from "./pages/OwnerMoney";
import OwnerCylinderMovements from "./pages/OwnerCylinderMovements";
import OwnerCustomers from "./pages/OwnerCustomers";
import OwnerCustomerDetail from "./pages/OwnerCustomerDetail";
import OwnerInstallations from "./pages/OwnerInstallations";
import OwnerInstallationsDetail from "./pages/OwnerInstallationsDetail";

/* CLERK */
import ClerkDashboard from "./pages/ClerkDashboard";
import ClerkNewOrder from "./pages/ClerkNewOrder";
import ClerkVehicleOperations from "./pages/ClerkVehicleOperations";
import ClerkDeliveries from "./pages/ClerkDeliveries";
import ClerkVehicleRegistry from "./pages/ClerkVehicleRegistry";
import ClerkSales from "./pages/ClerkSales";
import ClerkInstallations from "./pages/ClerkInstallations";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ROLE GATE */}
        <Route path="/dashboard" element={<DashboardGate />} />

        {/* OWNER */}
        <Route path="/dashboard/owner" element={<OwnerDashboard />} />
        <Route path="/dashboard/owner/deliveries" element={<OwnerDeliveries />} />
        <Route path="/dashboard/owner/vehicle-operations" element={<OwnerVehicleOperations />} />
        <Route path="/dashboard/owner/transport" element={<OwnerTransport />} />
        <Route path="/dashboard/owner/vehicle-registry" element={<OwnerVehicleRegistry />} />
        <Route path="/dashboard/owner/money" element={<OwnerMoney />} />
        <Route path="/dashboard/owner/cylinder-movements" element={<OwnerCylinderMovements />} />
        <Route path="/dashboard/owner/customers" element={<OwnerCustomers />} />
        <Route path="/dashboard/owner/customers/:id" element={<OwnerCustomerDetail />} />
        <Route path="/dashboard/owner/installations" element={<OwnerInstallations />} />
        <Route path="/dashboard/owner/installations/:id" element={<OwnerInstallationsDetail />} /> // optional later

        {/* CLERK */}
        <Route path="/dashboard/clerk" element={<ClerkDashboard />} />
        <Route path="/dashboard/clerk/new-order" element={<ClerkNewOrder />} />
        <Route path="/dashboard/clerk/vehicle-operations" element={<ClerkVehicleOperations />} />
        <Route path="/dashboard/clerk/deliveries" element={<ClerkDeliveries />} />
        <Route path="/dashboard/clerk/vehicle-registry" element={<ClerkVehicleRegistry />} />
        <Route path="/dashboard/clerk/sales" element={<ClerkSales />} />
        <Route path="/dashboard/clerk/installations" element={<ClerkInstallations />} />
        
        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
