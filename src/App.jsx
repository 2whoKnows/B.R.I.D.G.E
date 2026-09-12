import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import CreatePassword from './pages/CreatePassword'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/create-password" element={<CreatePassword />} />

        <Route path="/manager/dashboard" element={<Dashboard managerName="Manager" />} />
        <Route path="/admin/dashboard" element={<Dashboard managerName="Admin" />} />
        <Route path="/documents" element={<Documents managerName="Manager" />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App