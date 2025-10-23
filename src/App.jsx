import React from 'react';
import Analytics from './pages/Analytics';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import ResumeDesigner from './pages/ResumeDesigner';
import ResumeEnhancer from './pages/ResumeEnhancer';
import InterviewTrainer from './pages/InterviewTrainer';
import Uploads from './pages/Uploads'; 
import AIAssistant from './components/AIAssistant';
import { Toaster } from './components/ui/Toaster';
import { ToastProvider } from './components/ui/Toaster';
import AnalysisHistory from './pages/AnalysisHistory'; 

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

// PublicRoute component
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" />;
};

function AppContent() {
  const { user, isLoading } = useAuth();
  const allRoles = ['student', 'hr'];
  const studentOnly = ['student'];
  const hrOnly = ['hr'];

  if (isLoading) { /* ... Loading spinner ... */ }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navigation />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        
        {/* Routes for all authenticated users */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={allRoles}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/analyzer" element={
          <ProtectedRoute allowedRoles={allRoles}><ResumeAnalyzer /></ProtectedRoute>
        } />
        <Route path="/uploads" element={
          <ProtectedRoute allowedRoles={allRoles}><Uploads /></ProtectedRoute>
        } />
        
        <Route path="/history" element={
          <ProtectedRoute allowedRoles={hrOnly}><AnalysisHistory /></ProtectedRoute>
          } />
            <Route path="/analytics" element={
      <ProtectedRoute allowedRoles={hrOnly}>
        <Analytics />
      </ProtectedRoute>
        } />

        {/* Routes for students only */}
        <Route path="/designer" element={
          <ProtectedRoute allowedRoles={studentOnly}><ResumeDesigner /></ProtectedRoute>
        } />
        <Route path="/enhancer" element={
          <ProtectedRoute allowedRoles={studentOnly}><ResumeEnhancer /></ProtectedRoute>
        } />
        <Route path="/interview" element={
          <ProtectedRoute allowedRoles={studentOnly}><InterviewTrainer /></ProtectedRoute>
        } />
      </Routes>
      
      {user && <AIAssistant />}
      <Toaster /> {/* This is correct - it displays the toasts */}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* 2. WRAP YOUR APP CONTENT WITH THE PROVIDER */}
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;