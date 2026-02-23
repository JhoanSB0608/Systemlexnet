import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { Container } from '@mui/material';
import Header from './components/Header';
import LandingPage from './pages/LandingPage'; // Nuevo
import AcreedoresListPage from './pages/AcreedoresListPage';
import AcreedorFormPage from './pages/AcreedorFormPage';
import NuevaSolicitudPage from './pages/NuevaSolicitudPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthRedirectPage from './pages/AuthRedirectPage';
import VerificationSuccessPage from './pages/VerificationSuccessPage'; // New import
import PrivateRoute from './components/PrivateRoute';
import { login as authLogin, register as authRegister, logout as authLogout, getMe } from './services/userService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useIdleTimeout from './hooks/useIdleTimeout';
import SessionTimeoutModal from './components/common/SessionTimeoutModal';
import EditarInsolvenciaPage from './pages/EditarInsolvenciaPage';
import EditarConciliacionPage from './pages/EditarConciliacionPage';
import ArchiverPage from './pages/ArchiverPage'; // New import
import ArchivedRequestsListPage from './pages/ArchivedRequestsListPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const AuthContext = createContext(null);

const queryClient = new QueryClient();

// El AuthProvider debe estar dentro de un Router para usar useNavigate
const AuthWrapper = ({ children }) => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  </Router>
);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdleModal, setShowIdleModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const parsedUserInfo = JSON.parse(userInfo);
          if (parsedUserInfo.token) {
            // If token exists, try to fetch user profile from backend
            const userProfile = await getMe(); // This will also update localStorage with full user data
            setUser(userProfile);
          } else {
            // If userInfo exists but no token, clear it
            localStorage.removeItem('userInfo');
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Failed to load user session or token invalid", error);
        localStorage.removeItem('userInfo'); // Clear invalid token
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const userData = await authLogin(email, password);
    setUser(userData);
    navigate('/admin');
  }, [navigate]);

  const register = useCallback(async (name, email, password) => {
    const response = await authRegister(name, email, password);
    // Do not log in or navigate immediately after registration,
    // as email verification is now required.
    return response;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    setShowIdleModal(false);
    navigate('/login');
  }, [navigate]);

  const loadUser = useCallback((userData) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // --- Idle Timeout Logic ---
  const handleIdle = () => {
    setShowIdleModal(true);
  };

  const { reset: resetIdleTimer } = useIdleTimeout({
    onIdle: handleIdle,
    idleTime: 4.5 * 60 * 1000, // 4.5 minutes
    enabled: !!user && !loading,
  });

  const handleStay = () => {
    setShowIdleModal(false);
    resetIdleTimer();
  };
  // -------------------------

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    loadUser
  }), [user, loading, login, register, logout, loadUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      <Header />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <SessionTimeoutModal
        open={showIdleModal}
        onLogout={logout}
        onStay={handleStay}
      />
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/redirect" element={<AuthRedirectPage />} />
          <Route path="/verify-email" element={<VerificationSuccessPage />} /> {/* New route */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Rutas Privadas */}
          <Route path="/acreedores" element={<PrivateRoute><AcreedoresListPage /></PrivateRoute>} />
          <Route path="/acreedores/nuevo" element={<PrivateRoute><AcreedorFormPage /></PrivateRoute>} />
          <Route path="/acreedores/editar/:id" element={<PrivateRoute><AcreedorFormPage /></PrivateRoute>} />
          <Route path="/nueva-solicitud" element={<PrivateRoute><NuevaSolicitudPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="/admin/editar-solicitud/:id" element={<PrivateRoute><EditarInsolvenciaPage /></PrivateRoute>} />
          <Route path="/admin/editar-conciliacion/:id" element={<PrivateRoute><EditarConciliacionPage /></PrivateRoute>} />
          <Route path="/archiver-create" element={<PrivateRoute><ArchiverPage /></PrivateRoute>} />
          <Route path="/archiver" element={<PrivateRoute><ArchivedRequestsListPage /></PrivateRoute>} />
        </Routes>
      </Container>
    </AuthContext.Provider>
  );
};

function App() {
  return <AuthWrapper />;
}

export default App;
