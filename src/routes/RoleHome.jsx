import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HOME_BY_ROLE = { document_manager: "/manager", teacher: "/teacher", system_admin: "/admin" };

export default function RoleHome() { const { role, loading } = useAuth(); if (loading) return null; return <Navigate to={HOME_BY_ROLE[role] ?? "/login"} replace />; }
