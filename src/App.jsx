import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import CreatePassword from './pages/CreatePassword';

import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import ActivityLog from './pages/ActivityLog';

import TeacherDashboard from './pages/TeacherDashboard';
import TeacherDocuments from './pages/TeacherDocuments';
import TeacherDocumentPreview from './pages/TeacherDocumentPreview';
import TeacherFavorites from './pages/TeacherFavorites';
import TeacherRecentlyViewed from './pages/TeacherRecentlyViewed';

import Settings from './pages/Settings';
import Profile from './pages/Profile';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleHome from './routes/RoleHome';
import AppLayout from './components/layout/AppLayout';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/create-password" element={<CreatePassword />} />

          {/* Root Role Home Redirect */}
          <Route path="/" element={<RoleHome />} />

          {/* Document Manager & Admin Protected Layout Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["document_manager", "system_admin"]}>
                <AppLayout roleOverride="document_manager" />
              </ProtectedRoute>
            }
          >
            <Route path="/manager/dashboard" element={<Dashboard managerName="Document Manager" />} />
            <Route path="/admin/dashboard" element={<Dashboard managerName="System Admin" />} />
            <Route path="/manager/documents" element={<Documents />} />
            <Route path="/manager/users" element={<Users />} />
            <Route path="/manager/analytics" element={<Analytics />} />
            <Route path="/manager/activity-log" element={<ActivityLog />} />
            <Route path="/manager/settings" element={<Settings />} />
            <Route path="/manager/profile" element={<Profile />} />
          </Route>

          {/* Teacher Protected Layout Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <AppLayout roleOverride="teacher" />
              </ProtectedRoute>
            }
          >
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/documents" element={<TeacherDocuments />} />
            <Route path="/teacher/documents/:documentId" element={<TeacherDocumentPreview />} />
            <Route path="/teacher/favorites" element={<TeacherFavorites />} />
            <Route path="/teacher/recently-viewed" element={<TeacherRecentlyViewed />} />
            <Route path="/teacher/settings" element={<Settings />} />
            <Route path="/teacher/profile" element={<Profile />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
