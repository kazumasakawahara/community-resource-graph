/**
 * Main App Component
 *
 * Application routing and layout
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ResourceList } from './components/Resources/ResourceList';
import { ResourceDetail } from './components/Resources/ResourceDetail';
import { ResourceForm } from './components/Resources/ResourceForm';
import { NetworkGraph } from './components/Network/NetworkGraph';
import { NeedsList } from './components/Needs/NeedsList';
import { NeedsDetail } from './components/Needs/NeedsDetail';

// Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#007bff', color: 'white', padding: '15px 20px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
              支援ネットワーク
            </Link>
            <Link to="/resources" style={{ color: 'white', textDecoration: 'none' }}>
              資源
            </Link>
            <Link to="/needs" style={{ color: 'white', textDecoration: 'none' }}>
              ニーズ
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {isAuthenticated ? (
              <>
                <span style={{ fontSize: '14px' }}>{user?.name}</span>
                <button
                  onClick={logout}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>
                  ログイン
                </Link>
                <Link
                  to="/register"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'white',
                    color: '#007bff',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  登録
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#f5f5f5', padding: '20px', textAlign: 'center', marginTop: '40px' }}>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Community Resource Graph © 2025
        </p>
      </footer>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Layout Routes */}
          <Route
            path="/"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/resources"
            element={
              <Layout>
                <ResourceList />
              </Layout>
            }
          />
          <Route
            path="/resources/new"
            element={
              <Layout>
                <ProtectedRoute>
                  <ResourceForm mode="create" />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/resources/:id"
            element={
              <Layout>
                <ResourceDetail />
              </Layout>
            }
          />
          <Route
            path="/resources/:id/edit"
            element={
              <Layout>
                <ProtectedRoute>
                  <ResourceForm mode="edit" />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/resources/:id/network"
            element={
              <Layout>
                <NetworkGraph />
              </Layout>
            }
          />
          <Route
            path="/needs"
            element={
              <Layout>
                <NeedsList />
              </Layout>
            }
          />
          <Route
            path="/needs/:id"
            element={
              <Layout>
                <NeedsDetail />
              </Layout>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
