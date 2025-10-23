import React from 'react';
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
import Analytics from './pages/Analytics';
import AIAssistant from './components/AIAssistant';
import { Toaster } from './components/ui/Toaster';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Public route component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" />;
};

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navigation />}
      
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        } />
        
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/analyzer" element={
          <ProtectedRoute>
            <ResumeAnalyzer />
          </ProtectedRoute>
        } />
        
        <Route path="/designer" element={
          <ProtectedRoute>
            <ResumeDesigner />
          </ProtectedRoute>
        } />
        
        <Route path="/enhancer" element={
          <ProtectedRoute>
            <ResumeEnhancer />
          </ProtectedRoute>
        } />
        
        <Route path="/interview" element={
          <ProtectedRoute>
            <InterviewTrainer />
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
      </Routes>
      
      {user && <AIAssistant />}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;