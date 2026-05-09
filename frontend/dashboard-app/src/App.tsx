import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import ReviewsPage from "./pages/ReviewsPage";
import DNAPage from "./pages/DNAPage";
import EscalationsPage from "./pages/EscalationsPage";
import "./index.css";

function PageWrapper({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);
  useEffect(() => { setKey(location.pathname); }, [location.pathname]);
  return <div key={key} className="page-enter">{children}</div>;
}

export default function App() {
  useEffect(() => {
    // TEMP: Demo for PR review
    console.log("Sensei Dashboard App mounted");
    const testVar = "This is a temporary variable for the PR demo";
    console.log(testVar);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/dna" element={<DNAPage />} />
            <Route path="/escalations" element={<EscalationsPage />} />
          </Routes>
        </PageWrapper>
      </div>
    </BrowserRouter>
  );
}
