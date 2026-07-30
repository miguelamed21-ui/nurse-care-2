import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe } from '@/lib/api';
import api from '@/lib/api';
import { 
  TrendUp, ChartBar, CheckCircle, Clock, BookOpen, 
  ChatCircle, Trophy, Target
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

// Custom Tooltips outside component
const RadarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#E2E8F0] rounded shadow-lg">
        <p className="text-sm font-medium">{payload[0].payload.fullName}</p>
        <p className="text-sm text-[#64748B]">Puntuación: {payload[0].value.toFixed(1)}</p>
      </div>
    );
  }
  return null;
};

const LineTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#E2E8F0] rounded shadow-lg">
        <p className="text-sm font-medium">{payload[0].payload.case_title}</p>
        <p className="text-sm text-[#64748B]">Puntuación: {payload[0].value}</p>
        <p className="text-xs text-[#94A3B8]">
          {new Date(payload[0].payload.date).toLocaleDateString('es-ES')}
        </p>
      </div>
    );
  }
  return null;
};

function StudentProgress() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);

      if (userData.role !== 'student') {
        toast.error('Esta página es solo para estudiantes');
        navigate('/dashboard');
        return;
      }

      const progressRes = await api.get('/student/progress');
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Error loading progress:', error);
      toast.error('Error al cargar progreso');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando tu progreso...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  // Prepare radar chart data
  const radarData = Object.entries(progress.competencies).map(([name, value]) => ({
    competencia: name.length > 25 ? name.substring(0, 22) + '...' : name,
    puntuacion: value,
    fullName: name
  }));

  // Prepare comparison data (student vs group average)
  const comparisonData = progress.group_comparisons.length > 0 
    ? Object.keys(progress.competencies).map(comp => ({
        competencia: comp.length > 20 ? comp.substring(0, 17) + '...' : comp,
        'Mi Puntuación': progress.competencies[comp] || 0,
        'Promedio Grupo': progress.group_comparisons[0]?.avg_competencies[comp] || 0
      }))
    : [];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar user={user} />
      
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy size={32} className="text-[#F59E0B]" weight="duotone" />
              <div>
                <h1 className="text-3xl font-semibold text-[#334155]">
                  Mi Progreso
                </h1>
                <p className="text-[#64748B] mt-1">
                  Seguimiento personal de competencias y desempeño
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen size={24} className="text-[#005A9C]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {progress.summary.simulations_count}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Simulaciones</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                {progress.summary.completed_simulations} completadas
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle size={24} className="text-[#10B981]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {progress.summary.evaluations_count}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Evaluaciones</p>
              <p className="text-xs text-[#94A3B8] mt-1">Recibidas de docentes</p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendUp size={24} className="text-[#8B5CF6]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {progress.summary.idec_score.toFixed(1)}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">IDEC Personal</p>
              <p className="text-xs text-[#94A3B8] mt-1">Índice de Competencias</p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <Target size={24} className="text-[#F59E0B]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {progress.group_comparisons.length}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Grupos</p>
              <p className="text-xs text-[#94A3B8] mt-1">En los que participas</p>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart - Personal Competencies */}
            {radarData.length > 0 && (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Mi Perfil de Competencias
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis 
                      dataKey="competencia" 
                      fontSize={11}
                      tick={{ fill: '#64748B' }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar 
                      name="Mi Puntuación" 
                      dataKey="puntuacion" 
                      stroke="#005A9C" 
                      fill="#005A9C" 
                      fillOpacity={0.6} 
                    />
                    <Tooltip content={<RadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Comparison Bar Chart */}
            {comparisonData.length > 0 && (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Comparación con Promedio del Grupo
                </h3>
                <p className="text-xs text-[#64748B] mb-4">
                  Grupo: {progress.group_comparisons[0]?.group_name}
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="competencia" 
                      angle={-20} 
                      textAnchor="end" 
                      height={80}
                      fontSize={10}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Mi Puntuación" fill="#005A9C" />
                    <Bar dataKey="Promedio Grupo" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Competency Trends */}
          {Object.keys(progress.competency_trends).length > 0 && (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h3 className="text-lg font-semibold text-[#334155] mb-4">
                Evolución de Competencias
              </h3>
              {Object.entries(progress.competency_trends).map(([compName, trend]) => (
                trend.length > 0 && (
                  <div key={compName} className="mb-6">
                    <h4 className="text-sm font-medium text-[#64748B] mb-2">{compName}</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={trend.map((t, i) => ({ ...t, index: i + 1 }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" label={{ value: 'Evaluaciones', position: 'insideBottom', offset: -5 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip content={<LineTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#005A9C" 
                          strokeWidth={2}
                          dot={{ fill: '#005A9C', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Recent Feedback */}
          {progress.recent_feedback.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h3 className="text-lg font-semibold text-[#334155] mb-4 flex items-center gap-2">
                <ChatCircle size={24} weight="duotone" className="text-[#005A9C]" />
                Retroalimentación Reciente
              </h3>
              <div className="space-y-4">
                {progress.recent_feedback.map((feedback, idx) => (
                  <div key={idx} className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-[#334155]">{feedback.case_title}</h4>
                      <span className="text-xs text-[#64748B]">
                        {new Date(feedback.date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <p className="text-sm text-[#475569] mb-3">{feedback.feedback}</p>
                    
                    {feedback.strengths && feedback.strengths.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-[#10B981] mb-1">✓ Fortalezas:</p>
                        <ul className="text-xs text-[#64748B] list-disc list-inside">
                          {feedback.strengths.map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {feedback.improvements && feedback.improvements.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#F59E0B] mb-1">⚡ Áreas de mejora:</p>
                        <ul className="text-xs text-[#64748B] list-disc list-inside">
                          {feedback.improvements.map((improvement, i) => (
                            <li key={i}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Simulations */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <h3 className="text-lg font-semibold text-[#334155] mb-4">
              Mis Simulaciones Recientes
            </h3>
            <div className="space-y-3">
              {progress.simulations.slice(0, 10).map((sim) => (
                <div key={sim.sim_id} className="p-4 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#334155]">
                        {sim.case_info?.title || 'Caso desconocido'}
                      </p>
                      <p className="text-sm text-[#64748B]">
                        {sim.case_info?.specialty} - {sim.case_info?.difficulty}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        sim.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sim.status === 'completed' ? 'Completada' : 'En progreso'}
                      </span>
                      <p className="text-xs text-[#64748B] mt-1">
                        {new Date(sim.started_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProgress;
