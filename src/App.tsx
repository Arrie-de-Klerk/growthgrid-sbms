// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* AUTH */
import Login from "./modules/gas/pages/Login";
import Register from "./modules/gas/pages/Register";
import ResetPassword from "./modules/gas/pages/ResetPassword";
import DashboardGate from "./modules/gas/pages/DashboardGate";
import SelectModule from "./modules/gas/pages/SelectModule";


/* OWNER */
import OwnerDashboard from "./modules/gas/pages/OwnerDashboard";
import OwnerDeliveries from "./modules/gas/pages/OwnerDeliveries";
import OwnerVehicleOperations from "./modules/gas/pages/OwnerVehicleOperations";
import OwnerTransport from "./modules/gas/pages/OwnerTransport";
import OwnerVehicleRegistry from "./modules/gas/pages/OwnerVehicleRegistry";
import OwnerMoney from "./modules/gas/pages/OwnerMoney";
import OwnerCylinderMovements from "./modules/gas/pages/OwnerCylinderMovements";
import OwnerCustomers from "./modules/gas/pages/OwnerCustomers";
import OwnerCustomerDetail from "./modules/gas/pages/OwnerCustomerDetail";
import OwnerInstallations from "./modules/gas/pages/OwnerInstallations";
import OwnerInstallationsDetail from "./modules/gas/pages/OwnerInstallationsDetail";
import OwnerMotorDashboard from "./modules/motor/OwnerMotorDashboard";
import OwnerMotorStock from "./modules/motor/OwnerMotorStock";
import OwnerMotorCustomers from "./modules/motor/OwnerMotorCustomers";
import OwnerMotorDeals from "./modules/motor/OwnerMotorDeals";
import OwnerMotorMoney from "./modules/motor/OwnerMotorMoney";
import OwnerMotorVehicleExpenses from "./modules/motor/OwnerMotorVehicleExpenses";
import OwnerMotorBestSellers from "./modules/motor/OwnerMotorBestSellers";
import OwnerMotorDealDetail from "./modules/motor/OwnerMotorDealsDetail";


/* CLERK */
import ClerkDashboard from "./modules/gas/pages/ClerkDashboard";
import ClerkNewOrder from "./modules/gas/pages/ClerkNewOrder";
import ClerkVehicleOperations from "./modules/gas/pages/ClerkVehicleOperations";
import ClerkDeliveries from "./modules/gas/pages/ClerkDeliveries";
import ClerkVehicleRegistry from "./modules/gas/pages/ClerkVehicleRegistry";
import ClerkSales from "./modules/gas/pages/ClerkSales";
import ClerkInstallations from "./modules/gas/pages/ClerkInstallations";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/select-module" element={<SelectModule />} />

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
        <Route path="/dashboard/owner/installations/:id" element={<OwnerInstallationsDetail />} />
        <Route path="/motor/owner" element={<OwnerMotorDashboard />} />
        <Route path="/motor/stock" element={<OwnerMotorStock />} />
        <Route path="/motor/customers" element={<OwnerMotorCustomers />} />
        <Route path="/motor/deals" element={<OwnerMotorDeals />} />
        <Route path="/motor/money" element={<OwnerMotorMoney />} />
        <Route path="/motor/expenses" element={<OwnerMotorVehicleExpenses />} />
        <Route path="/motor/best-sellers" element={<OwnerMotorBestSellers />} />
        <Route path="/motor/deals/:id" element={<OwnerMotorDealDetail />} />


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
