import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getCompetencies, getTrends, getMe } from '@/lib/api';
import { ArrowLeft, TrendUp, Medal, Target } from '@phosphor-icons/react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

function IDECProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [competencies, setCompetencies] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, compRes, trendsRes] = await Promise.all([
        getMe(),
        getCompetencies(),
        getTrends()
      ]);
      
      setUser(userRes.data);
      setCompetencies(compRes.data);
      setTrends(trendsRes.data.trends);
    } catch (error) {
      console.error('Error loading IDEC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const competencyLabels = {
    comunicacion: 'Comunicación',
    valoracion_clinica: 'Valoración Clínica',
    razonamiento_critico: 'Razonamiento Crítico',
    competencia_tecnica: 'Competencia Técnica',
    empatia: 'Empatía y Relación Terapéutica'
  };

  const competencyDescriptions = {
    comunicacion: 'Habilidad para comunicarse efectivamente con pacientes, familias y el equipo de salud',
    valoracion_clinica: 'Capacidad de realizar valoraciones clínicas completas y sistemáticas',
    razonamiento_critico: 'Pensamiento analítico para tomar decisiones clínicas fundamentadas',
    competencia_tecnica: 'Dominio de procedimientos y técnicas de enfermería',
    empatia: 'Capacidad de establecer relaciones terapéuticas con empatía y respeto'
  };

  const radarData = competencies ? [
    { competencia: 'Comunicación', value: competencies.competencies.comunicacion, fullMark: 100 },
    { competencia: 'Valoración Clínica', value: competencies.competencies.valoracion_clinica, fullMark: 100 },
    { competencia: 'Razonamiento Crítico', value: competencies.competencies.razonamiento_critico, fullMark: 100 },
    { competencia: 'Competencia Técnica', value: competencies.competencies.competencia_tecnica, fullMark: 100 },
    { competencia: 'Empatía', value: competencies.competencies.empatia, fullMark: 100 },
  ] : [];

  const barData = competencies ? Object.entries(competencies.competencies).map(([key, value]) => ({
    name: competencyLabels[key],
    puntaje: value
  })) : [];

  const getCompetencyLevel = (score) => {
    if (score >= 85) return { level: 'Excelente', color: 'text-[#10B981]', bgColor: 'bg-[#ECFDF5]' };
    if (score >= 70) return { level: 'Bueno', color: 'text-[#3B82F6]', bgColor: 'bg-[#EFF6FF]' };
    if (score >= 55) return { level: 'Aceptable', color: 'text-[#F59E0B]', bgColor: 'bg-[#FEF3C7]' };
    return { level: 'En Desarrollo', color: 'text-[#64748B]', bgColor: 'bg-[#F1F5F9]' };
  };

  const getIDECLevel = (score) => {
    if (score >= 85) return { level: 'Avanzado', color: 'text-[#10B981]', icon: '🏆' };
    if (score >= 70) return { level: 'Competente', color: 'text-[#3B82F6]', icon: '⭐' };
    if (score >= 55) return { level: 'En Progreso', color: 'text-[#F59E0B]', icon: '📈' };
    return { level: 'Inicial', color: 'text-[#64748B]', icon: '🌱' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando perfil IDEC...</p>
        </div>
      </div>
    );
  }

  if (!competencies || competencies.simulations_count === 0) {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <Sidebar user={user} />
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-[#64748B] hover:text-[#334155] mb-4"
            >
              <ArrowLeft size={20} />
              Volver al Dashboard
            </button>
            <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]">
              IDEC-AMED
            </h1>
            <p className="text-[#64748B] mt-1">Índice de Desarrollo de Competencias en Enfermería</p>
          </div>

          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center max-w-md">
              <Target size={64} weight="duotone" className="text-[#64748B] mx-auto mb-4" />
              <h2 className="text-xl font-medium text-[#334155] mb-2">Aún no tienes evaluaciones</h2>
              <p className="text-[#64748B] mb-6">
                Completa tu primera simulación para comenzar a ver tu perfil de competencias
              </p>
              <button
                onClick={() => navigate('/cases')}
                className="bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all duration-200"
              >
                Explorar Casos Clínicos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const idecLevel = getIDECLevel(competencies.idec_score);

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar user={user} />
      
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#334155] mb-4"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]">
            IDEC-AMED
          </h1>
          <p className="text-[#64748B] mt-1">Índice de Desarrollo de Competencias en Enfermería</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* IDEC Score Card */}
          <div className="bg-gradient-to-br from-[#005A9C] to-[#003D6B] text-white rounded-lg p-8 mb-8 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Medal size={32} weight="duotone" />
                  <h2 className="text-2xl font-semibold">Tu Puntaje IDEC</h2>
                </div>
                <p className="text-white/80 mb-6">
                  Basado en {competencies.simulations_count} simulación{competencies.simulations_count !== 1 ? 'es' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-6xl font-bold mb-2">{competencies.idec_score.toFixed(1)}</p>
                <p className={`text-lg font-medium ${idecLevel.color} bg-white/20 px-4 py-1 rounded-full inline-block`}>
                  {idecLevel.icon} {idecLevel.level}
                </p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Radar Chart */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h2 className="text-xl font-medium text-[#334155] mb-4">Perfil de Competencias</h2>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis 
                    dataKey="competencia" 
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    style={{ fontSize: '11px' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748B', fontSize: 10 }} 
                  />
                  <Radar 
                    name="Puntaje" 
                    dataKey="value" 
                    stroke="#005A9C" 
                    fill="#005A9C" 
                    fillOpacity={0.6} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '6px' 
                    }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h2 className="text-xl font-medium text-[#334155] mb-4">Comparación de Competencias</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748B', fontSize: 10 }} 
                    angle={-15}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '6px' 
                    }} 
                  />
                  <Bar dataKey="puntaje" radius={[8, 8, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#005A9C" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Competency Details */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 mb-8">
            <h2 className="text-xl font-medium text-[#334155] mb-6">Detalle de Competencias</h2>
            <div className="space-y-4">
              {Object.entries(competencies.competencies).map(([key, value]) => {
                const level = getCompetencyLevel(value);
                return (
                  <div key={key} className="border border-[#E2E8F0] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-[#334155] mb-1">{competencyLabels[key]}</h3>
                        <p className="text-sm text-[#64748B]">{competencyDescriptions[key]}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-semibold text-[#334155] mb-1">{value.toFixed(1)}</p>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${level.bgColor} ${level.color}`}>
                          {level.level}
                        </span>
                      </div>
                    </div>
                    <div className="relative w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden mt-3">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#005A9C] rounded-full transition-all duration-300"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/cases')}
              className="bg-[#005A9C] text-white px-8 py-3 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
            >
              <TrendUp size={20} weight="bold" />
              Continuar Mejorando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IDECProfile;
