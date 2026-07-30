import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital, Brain, Users, TrendUp } from '@phosphor-icons/react';

function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Redirect to non-protected callback route to avoid race conditions
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left side - Hero */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1719934398679-d764c1410770?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#334155]/90 to-[#005A9C]/70"></div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-6xl font-bold tracking-tight mb-3 text-white drop-shadow-lg" data-testid="hero-title">
            AMED-IA
          </h1>
          <p className="text-lg font-medium mb-8 text-white leading-relaxed drop-shadow-md">
            <span className="font-semibold">Agente Multimodal para la Evaluación y Desarrollo</span><br/>
            <span className="font-semibold">de Competencias en Enfermería mediante</span><br/>
            <span className="font-semibold">Inteligencia Artificial Generativa</span>
          </p>
          <div className="h-px bg-white/30 mb-8"></div>
          <p className="text-lg leading-relaxed mb-12 text-white">
            Plataforma inteligente para la formación de profesionales de enfermería mediante
            simulación clínica y comunitaria con IA Generativa
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <Hospital size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Simulación Realista</h3>
                <p className="text-sm text-white/80">Pacientes virtuales inteligentes</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <Brain size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="font-medium mb-1">IA Generativa</h3>
                <p className="text-sm text-white/80">Escenarios dinámicos adaptativos</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <Users size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Multi-rol</h3>
                <p className="text-sm text-white/80">Pacientes, familiares, equipo médico</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <TrendUp size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Seguimiento</h3>
                <p className="text-sm text-white/80">Evaluación y competencias</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 shadow-sm">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-[#334155] mb-2" data-testid="login-title">
                Bienvenido
              </h2>
              <p className="text-[#64748B]">Ingresa con tu cuenta institucional</p>
            </div>

            <button
              onClick={handleLogin}
              data-testid="google-login-button"
              className="w-full bg-[#005A9C] text-white py-3 px-6 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Ingresar con Google
            </button>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0] text-center">
              <p className="text-xs text-[#64748B]">
                Al ingresar, aceptas nuestros términos de servicio y política de privacidad
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-[#64748B]">
            <p>¿Problemas para ingresar? Contacta al administrador</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
