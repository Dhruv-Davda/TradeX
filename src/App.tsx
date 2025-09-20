import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext-simple';
import { Login } from './components/auth/Login';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Buy } from './components/trades/Buy';
import { Sell } from './components/trades/Sell';
import { Transfer } from './components/trades/Transfer';
import { Settlement } from './components/trades/Settlement';
import { TradeHistory } from './components/history/TradeHistory';
import { Analytics } from './components/analytics/Analytics';
import { Expenses } from './components/expenses/Expenses';
import { IncomeManagement } from './components/income/Income';
import { Merchants } from './components/merchants/Merchants';
import { DataMigration } from './components/migration/DataMigration';
import { UserSettings } from './components/settings/UserSettings';
import { AccountSettings } from './components/settings/AccountSettings';
import { AuthCallback } from './pages/AuthCallback';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="/auth/callback" 
          element={<AuthCallback />} 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="buy" element={<Buy />} />
          <Route path="sell" element={<Sell />} />
          <Route path="transfer" element={<Transfer />} />
          <Route path="settlement" element={<Settlement />} />
          <Route path="history" element={<TradeHistory />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<IncomeManagement />} />
          <Route path="merchants" element={<Merchants />} />
          <Route path="migration" element={<DataMigration />} />
          <Route path="settings/user" element={<UserSettings />} />
          <Route path="settings/account" element={<AccountSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;