import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import CreatePassword from './pages/CreatePassword'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherDocuments from './pages/TeacherDocuments'
import TeacherDocumentPreview from './pages/TeacherDocumentPreview'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/create-password" element={<CreatePassword />} />

          <Route path="/manager/dashboard" element={<Dashboard managerName="Manager" />} />
          <Route path="/admin/dashboard" element={<Dashboard managerName="Admin" />} />
          <Route path="/documents" element={<Documents managerName="Manager" />} />

          <Route
            path="/teacher"
            element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>}
          />
          <Route
            path="/teacher/documents"
            element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDocuments /></ProtectedRoute>}
          />
          <Route
            path="/teacher/documents/:documentId"
            element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDocumentPreview /></ProtectedRoute>}
          />

          <Route path="/" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
