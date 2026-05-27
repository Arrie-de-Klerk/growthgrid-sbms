// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* AUTH */
import Login from "./shared/auth/Login";
import Register from "./shared/auth/Register";
import ResetPassword from "./modules/gas/pages/ResetPassword";


/* ACCOUNTING OWNER */
import OwnerAccountingDashboard from "./modules/accounting/pages/OwnerAccountingDashboard";
import AccountingClients from "./modules/accounting/pages/AccountingClients";
import AccountingClientNew from "./modules/accounting/pages/AccountingClientNew";
import AccountingClientDetail from "./modules/accounting/pages/AccountingClientDetail";
import AccountingMonthlyWork from "./modules/accounting/pages/AccountingMonthlyWork";
import AccountingDocuments from "./modules/accounting/pages/AccountingDocuments";


/* GAS OWNER */
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

/* MOTOR OWNER */
import OwnerMotorDashboard from "./modules/motor/OwnerMotorDashboard";
import OwnerMotorStock from "./modules/motor/OwnerMotorStock";
import OwnerMotorCustomers from "./modules/motor/OwnerMotorCustomers";
import OwnerMotorDeals from "./modules/motor/OwnerMotorDeals";
import OwnerMotorMoney from "./modules/motor/OwnerMotorMoney";
import OwnerMotorVehicleExpenses from "./modules/motor/OwnerMotorVehicleExpenses";
import OwnerMotorBestSellers from "./modules/motor/OwnerMotorBestSellers";
import OwnerMotorDealDetail from "./modules/motor/OwnerMotorDealsDetail";
import OwnerMotorCustomerNew from "./modules/motor/OwnerMotorCustomerNew";
import OwnerMotorCustomerDetail from "./modules/motor/OwnerMotorCustomerDetail";
import OwnerMotorTeam from "./modules/motor/OwnerMotorTeam";
import OwnerMotorAdminDocuments from "./modules/motor/OwnerMotorAdminDocuments";
import OwnerMotorFinanceAdmin from "./modules/motor/OwnerMotorFinanceAdmin";
import OwnerMotorApprovedDelivery from "./modules/motor/OwnerMotorApprovedDelivery";

/*
  Add these when your files are ready, using your real file names:
  import DashboardGate from "./pages/DashboardGate";
  import SelectModule from "./pages/SelectModule";
  import OwnerMotorStockNew from "./modules/motor/OwnerMotorStockNew";
  import OwnerMotorStockDetail from "./modules/motor/OwnerMotorStockDetail";
*/

/* GAS CLERK */
import ClerkDashboard from "./modules/gas/pages/ClerkDashboard";
import ClerkNewOrder from "./modules/gas/pages/ClerkNewOrder";
import ClerkVehicleOperations from "./modules/gas/pages/ClerkVehicleOperations";
import ClerkDeliveries from "./modules/gas/pages/ClerkDeliveries";
import ClerkVehicleRegistry from "./modules/gas/pages/ClerkVehicleRegistry";
import ClerkSales from "./modules/gas/pages/ClerkSales";
import ClerkInstallations from "./modules/gas/pages/ClerkInstallations";
import GasInvoicePrint from "./modules/gas/pages/GasInvoicePrint";
import GasSalesInvoicePrint from "./modules/gas/pages/GasSalesInvoicePrint";
import GasInstallationInvoicePrint from "./modules/gas/pages/GasInstallationInvoicePrint";
import GasInstallationQuotePrint from "./modules/gas/pages/GasInstallationQuotePrint";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ROLE / MODULE GATE - add once those pages exist */}
        {/* <Route path="/auth" element={<DashboardGate />} /> */}
        {/* <Route path="/select-module" element={<SelectModule />} /> */}

        {/* ACCOUNTING OWNER */}
        <Route path="/accounting" element={<OwnerAccountingDashboard />} />
        <Route path="/accounting/owner" element={<Navigate to="/accounting" replace />} />
        <Route path="/accounting/clients" element={<AccountingClients />} />
        <Route path="/accounting/clients/new" element={<AccountingClientNew />} />
        <Route path="/accounting/clients/:id" element={<AccountingClientDetail />} />
        <Route path="/accounting/monthly-work" element={<AccountingMonthlyWork />} />
        <Route path="/accounting/documents" element={<AccountingDocuments />} />


        {/* GAS OWNER */}
        <Route path="/gas" element={<OwnerDashboard />} />
        <Route path="/gas/deliveries" element={<OwnerDeliveries />} />
        <Route path="/gas/vehicle-operations" element={<OwnerVehicleOperations />} />
        <Route path="/gas/transport" element={<OwnerTransport />} />
        <Route path="/gas/vehicle-registry" element={<OwnerVehicleRegistry />} />
        <Route path="/gas/money" element={<OwnerMoney />} />
        <Route path="/gas/cylinder-movements" element={<OwnerCylinderMovements />} />
        <Route path="/gas/customers" element={<OwnerCustomers />} />
        <Route path="/gas/customers/:id" element={<OwnerCustomerDetail />} />
        <Route path="/gas/installations" element={<OwnerInstallations />} />
        <Route path="/gas/installations/:id" element={<OwnerInstallationsDetail />} />
        <Route path="/gas/installations/invoice/:installationId" element={<GasInstallationInvoicePrint />} />
        <Route path="/gas/installations/:id" element={<OwnerInstallationsDetail />} />
        <Route path="/gas/installations/quote/:installationId" element={<GasInstallationQuotePrint />}
/>

        {/* MOTOR OWNER */}
        <Route path="/motor" element={<OwnerMotorDashboard />} />
        <Route path="/motor/stock" element={<OwnerMotorStock />} />
        <Route path="/motor/owner" element={<Navigate to="/motor" replace />} />
        {/* <Route path="/motor/stock/new" element={<OwnerMotorStockNew />} /> */}
        {/* <Route path="/motor/stock/:id" element={<OwnerMotorStockDetail />} /> */}

        <Route path="/motor/customers" element={<OwnerMotorCustomers />} />
        <Route path="/motor/customers/new" element={<OwnerMotorCustomerNew />} />
        <Route path="/motor/customers/:id" element={<OwnerMotorCustomerDetail />} />

        <Route path="/motor/deals" element={<OwnerMotorDeals />} />
        <Route path="/motor/deals/:id" element={<OwnerMotorDealDetail />} />

        <Route path="/motor/money" element={<OwnerMotorMoney />} />
        <Route path="/motor/expenses" element={<OwnerMotorVehicleExpenses />} />
        <Route path="/motor/bestsellers" element={<OwnerMotorBestSellers />} />
        <Route path="/motor/team" element={<OwnerMotorTeam />} />

        <Route path="/motor/admin" element={<Navigate to="/motor/admin/approved-delivery" replace />}
        />
        <Route path="/motor/admin/documents" element={<OwnerMotorAdminDocuments />} />
        <Route path="/motor/admin/finance" element={<OwnerMotorFinanceAdmin />} />
        <Route path="/motor/admin/approved-delivery" element={<OwnerMotorApprovedDelivery />} />

        {/* GAS CLERK */}
        <Route path="/gas/clerk" element={<ClerkDashboard />} />
        <Route path="/gas/clerk/new-order" element={<ClerkNewOrder />} />
        <Route path="/gas/clerk/vehicle-operations" element={<ClerkVehicleOperations />} />
        <Route path="/gas/clerk/deliveries" element={<ClerkDeliveries />} />
        <Route path="/gas/clerk/vehicle-registry" element={<ClerkVehicleRegistry />} />
        <Route path="/gas/clerk/sales" element={<ClerkSales />} />
        <Route path="/gas/clerk/installations" element={<ClerkInstallations />} />
        <Route path="/gas/invoice/:orderId" element={<GasInvoicePrint />} />
        <Route path="/gas/sales-invoice/:saleId" element={<GasSalesInvoicePrint />} />
        

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}