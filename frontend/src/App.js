import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';
import Dashboard from '@/pages/Dashboard';
import SimulationView from '@/pages/SimulationView';
import CaseLibrary from '@/pages/CaseLibrary';
import History from '@/pages/History';
import TeacherCases from '@/pages/TeacherCases';
import Profile from '@/pages/Profile';
import IDECProfile from '@/pages/IDECProfile';
import PICEProfile from '@/pages/PICEProfile';
import Rubrics from '@/pages/Rubrics';
import GlobalEvaluations from '@/pages/GlobalEvaluations';
import CaseEvaluation from '@/pages/CaseEvaluation';
import Groups from '@/pages/Groups';
import Assignments from '@/pages/Assignments';
import TeacherAnalytics from '@/pages/TeacherAnalytics';
import UserManagement from '@/pages/UserManagement';
import InstitutionalDashboard from '@/pages/InstitutionalDashboard';
import StudentProgress from '@/pages/StudentProgress';
import ProtectedRoute from '@/components/ProtectedRoute';
import '@/App.css';

function AppRouter() {
  const location = window.location;
  
  // CRITICAL: Check for session_id in URL fragment BEFORE routing
  // This must be synchronous to prevent race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/simulation/:sim_id" element={
        <ProtectedRoute>
          <SimulationView />
        </ProtectedRoute>
      } />
      <Route path="/case-evaluation/:sim_id" element={
        <ProtectedRoute>
          <CaseEvaluation />
        </ProtectedRoute>
      } />
      <Route path="/cases" element={
        <ProtectedRoute>
          <CaseLibrary />
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      } />
      <Route path="/groups" element={
        <ProtectedRoute>
          <Groups />
        </ProtectedRoute>
      } />
      <Route path="/assignments" element={
        <ProtectedRoute>
          <Assignments />
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <TeacherAnalytics />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <UserManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <InstitutionalDashboard />
        </ProtectedRoute>
      } />
      <Route path="/student/progress" element={
        <ProtectedRoute>
          <StudentProgress />
        </ProtectedRoute>
      } />
      <Route path="/teacher/cases" element={
        <ProtectedRoute>
          <TeacherCases />
        </ProtectedRoute>
      } />
      <Route path="/rubrics" element={
        <ProtectedRoute>
          <Rubrics />
        </ProtectedRoute>
      } />
      <Route path="/evaluations/global" element={
        <ProtectedRoute>
          <GlobalEvaluations />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/idec" element={
        <ProtectedRoute>
          <IDECProfile />
        </ProtectedRoute>
      } />
      <Route path="/pice" element={
        <ProtectedRoute>
          <PICEProfile />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
