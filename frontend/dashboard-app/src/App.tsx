import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import ReviewsPage from "./pages/ReviewsPage";
import DNAPage from "./pages/DNAPage";
import EscalationsPage from "./pages/EscalationsPage";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/dna" element={<DNAPage />} />
          <Route path="/escalations" element={<EscalationsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
