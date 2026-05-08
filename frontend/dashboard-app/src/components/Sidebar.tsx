import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquareCode,
  Dna,
  AlertTriangle,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/reviews", label: "Explainability Log", icon: MessageSquareCode },
  { to: "/dna", label: "Review DNA Map", icon: Dna },
  { to: "/escalations", label: "Escalation Queue", icon: AlertTriangle },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>🥋 Sensei</h1>
        <div className="status-line">
          <span className="pulse-dot" />
          AI CODE REVIEW
        </div>
        <div className="agent-badge">
          <span className="dot" />
          Agent: Online
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `nav-link${isActive ? " active" : ""}`
            }
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="version-pill">Sensei v1.0 — Phase 4</span>
      </div>
    </aside>
  );
}
