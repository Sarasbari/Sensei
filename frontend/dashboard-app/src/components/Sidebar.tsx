import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Dna,
  AlertTriangle,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/reviews", label: "Explainability Log", icon: FileText },
  { to: "/dna", label: "Review DNA Map", icon: Dna },
  { to: "/escalations", label: "Escalation Queue", icon: AlertTriangle },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <h1>Sensei</h1>
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
        <span className="version-pill">Sensei v1.0</span>
      </div>
    </aside>
  );
}
