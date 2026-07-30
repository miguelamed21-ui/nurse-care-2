import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  House, 
  Flask, 
  BookOpen, 
  ClockCounterClockwise, 
  ChalkboardTeacher,
  User,
  SignOut,
  ChartLine,
  TrendUp,
  Scales,
  ChartBar,
  ChartBarHorizontal,
  ChartPie,
  Users,
  UserGear
} from '@phosphor-icons/react';
import { logout } from '@/lib/api';
import { toast } from 'sonner';

function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const navItems = [
    { path: '/dashboard', icon: House, label: 'Dashboard', roles: ['student', 'teacher', 'admin'] },
    { path: '/cases', icon: BookOpen, label: 'Casos Clínicos', roles: ['student', 'teacher', 'admin'] },
    { path: '/idec', icon: ChartLine, label: 'IDEC - Competencias', roles: ['student', 'teacher', 'admin'] },
    { path: '/pice', icon: TrendUp, label: 'PICE - Evolución', roles: ['student', 'teacher', 'admin'] },
    { path: '/history', icon: ClockCounterClockwise, label: 'Historial', roles: ['student', 'teacher', 'admin'] },
    { path: '/student/progress', icon: TrendUp, label: 'Mi Progreso', roles: ['student'] },
    { path: '/groups', icon: Users, label: 'Grupos', roles: ['teacher', 'admin'] },
    { path: '/assignments', icon: BookOpen, label: 'Asignaciones', roles: ['teacher', 'admin'] },
    { path: '/analytics', icon: ChartBarHorizontal, label: 'Analíticas', roles: ['teacher', 'admin'] },
    { path: '/admin/dashboard', icon: ChartPie, label: 'Dashboard Institucional', roles: ['admin'] },
    { path: '/admin/users', icon: UserGear, label: 'Gestión de Usuarios', roles: ['admin'] },
    { path: '/teacher/cases', icon: ChalkboardTeacher, label: 'Gestión de Casos', roles: ['teacher', 'admin'] },
    { path: '/rubrics', icon: Scales, label: 'Rúbricas', roles: ['teacher', 'admin'] },
    { path: '/evaluations/global', icon: ChartBar, label: 'Evaluaciones Globales', roles: ['teacher', 'admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || 'student')
  );

  return (
    <div className="bg-[#F1F5F9] h-screen w-64 flex flex-col border-r border-[#E2E8F0]" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-[#E2E8F0]">
        <h1 className="text-2xl font-semibold tracking-tight text-[#334155]" data-testid="app-logo">AMED-IA</h1>
        <p className="text-xs text-[#64748B] mt-1">Simulación Clínica Inteligente</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-[#005A9C] text-white shadow-sm'
                  : 'text-[#475569] hover:bg-white hover:shadow-sm'
              }`}
            >
              <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={user?.picture || 'https://via.placeholder.com/40'} 
            alt={user?.name}
            className="w-10 h-10 rounded-full"
            data-testid="user-avatar"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#334155] truncate" data-testid="user-name">{user?.name}</p>
            {/* Role Badge - Visually prominent */}
            <div className="mt-1">
              {user?.role === 'admin' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  👑 Administrador
                </span>
              )}
              {user?.role === 'teacher' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  👨‍🏫 Docente
                </span>
              )}
              {user?.role === 'student' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  🎓 Estudiante
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/profile')}
          data-testid="profile-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#475569] hover:bg-white transition-all duration-200 mb-2"
        >
          <User size={18} />
          <span className="text-sm">Perfil</span>
        </button>
        
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#475569] hover:bg-white transition-all duration-200"
        >
          <SignOut size={18} />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
