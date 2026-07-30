import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';

function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          throw new Error('No session_id found');
        }

        // Exchange session_id for user data - using Authorization header instead of cookies
        const response = await api.post('/auth/session', { session_id: sessionId });
        const user = response.data;

        // Store session token in localStorage (not cookies due to CORS issues)
        if (user.session_token) {
          localStorage.setItem('session_token', user.session_token);
        }

        toast.success(`¡Bienvenido, ${user.name}!`);

        // Navigate to dashboard
        navigate('/dashboard', { 
          replace: true,
          state: { user }
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        // Provide specific error messages
        let errorMessage = 'Error desconocido';
        if (!error.response) {
          errorMessage = 'No se puede conectar con el servidor. Por favor verifica tu conexión e intenta nuevamente.';
        } else if (error.response?.status === 400) {
          errorMessage = 'La sesión ha expirado. Por favor haz click en "Ingresar con Google" nuevamente.';
        } else if (error.response?.status === 404) {
          errorMessage = 'La sesión ha expirado o es inválida. Por favor haz click en "Ingresar con Google" nuevamente.';
        } else if (error.response?.status === 504) {
          errorMessage = 'Tiempo de espera agotado. Por favor intenta nuevamente.';
        } else {
          errorMessage = error.response?.data?.detail || error.message || 'Error desconocido';
        }
        
        toast.error(`Error al iniciar sesión: ${errorMessage}`);
        
        // Wait a bit before redirecting so user can see the error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
        <p className="text-[#475569]">Verificando credenciales...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
