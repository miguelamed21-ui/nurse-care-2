import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getDashboardStats, getCompetencies, getTrends, getMe } from '@/lib/api';
import { Users, Flask, CheckCircle, BookOpen, TrendUp, ChartLine, ClockCounterClockwise } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [competencies, setCompetencies] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, statsRes, compRes, trendsRes] = await Promise.all([
        getMe(),
        getDashboardStats(),
        getCompetencies(),
        getTrends()
      ]);
      
      setUser(userRes.data);
      setStats(statsRes.data);
      setCompetencies(compRes.data);
      setTrends(trendsRes.data.trends);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const radarData = competencies ? [
    { competencia: 'Comunicación', value: competencies.competencies.comunicacion },
    { competencia: 'Valoración', value: competencies.competencies.valoracion_clinica },
    { competencia: 'Razonamiento', value: competencies.competencies.razonamiento_critico },
    { competencia: 'Técnica', value: competencies.competencies.competencia_tecnica },
    { competencia: 'Empatía', value: competencies.competencies.empatia },
  ] : [];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar user={user} />
      
      <div className="flex-1 overflow-y-auto">
        {/* Header with Role Badge */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]" data-testid="dashboard-title">
                Dashboard
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[#64748B]">Bienvenido de vuelta, {user?.name}</p>
                {/* Role Badge */}
                {user?.role === 'admin' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                    👑 Administrador
                  </span>
                )}
                {user?.role === 'teacher' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    👨‍🏫 Docente
                  </span>
                )}
                {user?.role === 'student' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    🎓 Estudiante
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid - Bento style */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-sm hover:-translate-y-[2px] transition-all duration-200" data-testid="stat-card-students">
              <div className="flex items-center gap-4">
                <div className="bg-[#ECFDF5] p-3 rounded-lg">
                  <Users size={24} weight="duotone" className="text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Estudiantes</p>
                  <p className="text-2xl font-semibold text-[#334155] mt-1">{stats?.total_students || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-sm hover:-translate-y-[2px] transition-all duration-200" data-testid="stat-card-simulations">
              <div className="flex items-center gap-4">
                <div className="bg-[#FEF3C7] p-3 rounded-lg">
                  <Flask size={24} weight="duotone" className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Simulaciones</p>
                  <p className="text-2xl font-semibold text-[#334155] mt-1">{stats?.total_simulations || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-sm hover:-translate-y-[2px] transition-all duration-200" data-testid="stat-card-completed">
              <div className="flex items-center gap-4">
                <div className="bg-[#ECFDF5] p-3 rounded-lg">
                  <CheckCircle size={24} weight="duotone" className="text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Completadas</p>
                  <p className="text-2xl font-semibold text-[#334155] mt-1">{stats?.completed_simulations || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-sm hover:-translate-y-[2px] transition-all duration-200" data-testid="stat-card-cases">
              <div className="flex items-center gap-4">
                <div className="bg-[#FEF3C7] p-3 rounded-lg">
                  <BookOpen size={24} weight="duotone" className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Casos</p>
                  <p className="text-2xl font-semibold text-[#334155] mt-1">{stats?.total_cases || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* IDEC Score - Radar Chart */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6" data-testid="competencies-chart">
              <h2 className="text-xl font-medium text-[#334155] mb-4">IDEC - Índice de Competencias</h2>
              {competencies && competencies.simulations_count > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="competencia" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Radar name="Competencias" dataKey="value" stroke="#005A9C" fill="#005A9C" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[#64748B]">
                  <p>Completa una simulación para ver tus competencias</p>
                </div>
              )}
              {competencies && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] text-center">
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Puntaje IDEC</p>
                  <p className="text-3xl font-semibold text-[#005A9C] mt-1" data-testid="idec-score">{competencies.idec_score.toFixed(1)}</p>
                </div>
              )}
            </div>

            {/* Trends */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6" data-testid="trends-chart">
              <h2 className="text-xl font-medium text-[#334155] mb-4">Evolución de Competencias</h2>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="index" tick={{ fill: '#64748B', fontSize: 12 }} label={{ value: 'Simulaciones', position: 'insideBottom', offset: -5, fill: '#64748B' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="comunicacion" stroke="#334155" strokeWidth={2} dot={{ fill: '#334155', r: 4 }} />
                    <Line type="monotone" dataKey="valoracion_clinica" stroke="#005A9C" strokeWidth={2} dot={{ fill: '#005A9C', r: 4 }} />
                    <Line type="monotone" dataKey="razonamiento_critico" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[#64748B]">
                  <p>Completa más simulaciones para ver tu evolución</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => navigate('/cases')}
              data-testid="start-simulation-button"
              className="bg-[#005A9C] text-white p-6 rounded-lg hover:bg-[#004578] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] text-left"
            >
              <Flask size={32} weight="duotone" className="mb-3" />
              <h3 className="text-xl font-medium mb-2">Iniciar Simulación</h3>
              <p className="text-white/80 text-sm">Explora casos clínicos y comienza una nueva simulación</p>
            </button>

            <button
              onClick={() => navigate('/idec')}
              className="bg-[#10B981] text-white p-6 rounded-lg hover:bg-[#059669] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] text-left"
            >
              <ChartLine size={32} weight="duotone" className="mb-3" />
              <h3 className="text-xl font-medium mb-2">Ver IDEC-AMED</h3>
              <p className="text-white/80 text-sm">Índice de Desarrollo de Competencias</p>
            </button>

            <button
              onClick={() => navigate('/pice')}
              className="bg-[#F59E0B] text-white p-6 rounded-lg hover:bg-[#D97706] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] text-left"
            >
              <TrendUp size={32} weight="duotone" className="mb-3" />
              <h3 className="text-xl font-medium mb-2">Ver PICE-AMED</h3>
              <p className="text-white/80 text-sm">Perfil Longitudinal de Competencias</p>
            </button>

            <button
              onClick={() => navigate('/history')}
              data-testid="view-history-button"
              className="bg-[#334155] text-white p-6 rounded-lg hover:bg-[#121E2A] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] text-left"
            >
              <ClockCounterClockwise size={32} weight="duotone" className="mb-3" />
              <h3 className="text-xl font-medium mb-2">Ver Historial</h3>
              <p className="text-white/80 text-sm">Revisa tus simulaciones y retroalimentación</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
