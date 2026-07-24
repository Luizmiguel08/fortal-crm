import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Leads from "./pages/Leads.jsx";
import LeadDetail from "./pages/LeadDetail.jsx";
import Agents from "./pages/Agents.jsx";
import Reports from "./pages/Reports.jsx";
import Bolsao from "./pages/Bolsao.jsx";
import BolsaoSettings from "./pages/BolsaoSettings.jsx";
import BolsaoReport from "./pages/BolsaoReport.jsx";
import Integrations from "./pages/Integrations.jsx";
import Distribution from "./pages/Distribution.jsx";
import Stands from "./pages/Stands.jsx";
import Tags from "./pages/Tags.jsx";
import Companies from "./pages/Companies.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/bolsao" element={<Bolsao />} />
        <Route path="/bolsao/configuracoes" element={<BolsaoSettings />} />
        <Route path="/bolsao/relatorio" element={<BolsaoReport />} />
        <Route path="/integracoes" element={<Integrations />} />
        <Route path="/distribuicao" element={<Distribution />} />
        <Route path="/estandes" element={<Stands />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/empresas" element={<Companies />} />
        <Route path="/agentes" element={<Agents />} />
      </Route>
    </Routes>
  );
}
