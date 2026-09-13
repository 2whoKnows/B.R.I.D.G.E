import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HOME_BY_ROLE = { 
  document_manager: "/manager/dashboard", 
  system_admin: "/admin/dashboard",
  teacher: "/teacher" 
};

export default function RoleHome() { 
  const { role, loading, isAuthenticated } = useAuth(); 
  if (loading) return null; 
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[role] ?? "/teacher"} replace />; 
}
