import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMe } from '@/lib/api';

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    // If user data passed from AuthCallback, skip auth check
    location.state?.user ? true : null
  );
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    // If user already set from AuthCallback, skip verification
    if (location.state?.user) {
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await getMe();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  // Three states: null = checking, true = authenticated, false = not authenticated
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando...</p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
