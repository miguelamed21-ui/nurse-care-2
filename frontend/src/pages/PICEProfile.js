import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getTrends, getMe, getSimulations } from '@/lib/api';
import { ArrowLeft, TrendUp, ChartLine } from '@phosphor-icons/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

function PICEProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [trends, setTrends] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, trendsRes, simsRes] = await Promise.all([
        getMe(),
        getTrends(),
        getSimulations()
      ]);
      
      setUser(userRes.data);
      setTrends(trendsRes.data.trends);
      setSimulations(simsRes.data.filter(s => s.status === 'completed'));
    } catch (error) {
      console.error('Error loading PICE data:', error);
    } finally {
      setLoading(false);
    }
  };

  const competencyLabels = {
    comunicacion: 'Comunicación',
    valoracion_clinica: 'Valoración Clínica',
    razonamiento_critico: 'Razonamiento Crítico',
    competencia_tecnica: 'Competencia Técnica',
    empatia: 'Empatía'
  };

  const competencyColors = {
    comunicacion: '#334155',
    valoracion_clinica: '#005A9C',
    razonamiento_critico: '#10B981',
    competencia_tecnica: '#F59E0B',
    empatia: '#EF4444'
  };

  const calculateGrowth = () => {
    if (trends.length < 2) return null;
    
    const first = trends[0];
    const last = trends[trends.length - 1];
    
    const growth = {};
    Object.keys(competencyLabels).forEach(key => {
      const change = last[key] - first[key];
      growth[key] = {
        value: change,
        percentage: first[key] > 0 ? ((change / first[key]) * 100).toFixed(1) : 0
      };
    });
    
    return growth;
  };

  const growth = calculateGrowth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando perfil PICE...</p>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
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
              PICE-AMED
            </h1>
            <p className="text-[#64748B] mt-1">Perfil de Competencias a lo Largo del Tiempo</p>
          </div>

          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center max-w-md">
              <ChartLine size={64} weight="duotone" className="text-[#64748B] mx-auto mb-4" />
              <h2 className="text-xl font-medium text-[#334155] mb-2">Aún no tienes suficientes datos</h2>
              <p className="text-[#64748B] mb-6">
                Completa más simulaciones para ver tu evolución longitudinal de competencias
              </p>
              <button
                onClick={() => navigate('/cases')}
                className="bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all duration-200"
              >
                Iniciar Nueva Simulación
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            PICE-AMED
          </h1>
          <p className="text-[#64748B] mt-1">Perfil Longitudinal de Competencias en Enfermería</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#ECFDF5] p-2 rounded-lg">
                  <TrendUp size={24} weight="duotone" className="text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Simulaciones</p>
                  <p className="text-2xl font-semibold text-[#334155]">{simulations.length}</p>
                </div>
              </div>
              <p className="text-sm text-[#64748B]">Completadas exitosamente</p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#EFF6FF] p-2 rounded-lg">
                  <ChartLine size={24} weight="duotone" className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Periodo</p>
                  <p className="text-2xl font-semibold text-[#334155]">{trends.length}</p>
                </div>
              </div>
              <p className="text-sm text-[#64748B]">Evaluaciones registradas</p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#FEF3C7] p-2 rounded-lg">
                  <TrendUp size={24} weight="duotone" className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B]">Promedio</p>
                  <p className="text-2xl font-semibold text-[#334155]">
                    {trends.length > 0 ? (
                      Object.keys(competencyLabels).reduce((sum, key) => 
                        sum + trends[trends.length - 1][key], 0
                      ) / Object.keys(competencyLabels).length
                    ).toFixed(1) : 0}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#64748B]">Puntaje actual</p>
            </div>
          </div>

          {/* Main Line Chart - All Competencies */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 mb-8">
            <h2 className="text-xl font-medium text-[#334155] mb-4">Evolución Temporal de Competencias</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="index" 
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  label={{ value: 'Simulaciones', position: 'insideBottom', offset: -5, fill: '#64748B' }} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  label={{ value: 'Puntaje', angle: -90, position: 'insideLeft', fill: '#64748B' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '6px' 
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {Object.entries(competencyLabels).map(([key, label]) => (
                  <Line 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    name={label}
                    stroke={competencyColors[key]} 
                    strokeWidth={2} 
                    dot={{ fill: competencyColors[key], r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual Competency Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {Object.entries(competencyLabels).map(([key, label]) => (
              <div key={key} className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#334155]">{label}</h3>
                  {growth && growth[key] && (
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      growth[key].value >= 0 
                        ? 'bg-[#ECFDF5] text-[#10B981]' 
                        : 'bg-[#FEE2E2] text-[#EF4444]'
                    }`}>
                      {growth[key].value >= 0 ? '+' : ''}{growth[key].value.toFixed(1)} pts
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="index" 
                      tick={{ fill: '#64748B', fontSize: 11 }} 
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#64748B', fontSize: 11 }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '6px' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey={key} 
                      stroke={competencyColors[key]} 
                      fill={competencyColors[key]}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B]">Inicial:</span>
                    <span className="font-medium text-[#334155]">{trends[0][key].toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#64748B]">Actual:</span>
                    <span className="font-medium text-[#334155]">{trends[trends.length - 1][key].toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/cases')}
              className="bg-[#005A9C] text-white px-8 py-3 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
            >
              <TrendUp size={20} weight="bold" />
              Continuar Desarrollando Competencias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PICEProfile;
