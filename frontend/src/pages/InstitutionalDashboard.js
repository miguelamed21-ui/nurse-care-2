import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe } from '@/lib/api';
import api from '@/lib/api';
import { 
  ChartBar, Users, BookOpen, PlayCircle, ClipboardText,
  GraduationCap, ChalkboardTeacher, ShieldCheck, TrendUp
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#005A9C', '#10B981', '#F59E0B', '#8B5CF6', '#DC2626', '#06B6D4', '#EC4899'];

function InstitutionalDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);

      if (userData.role !== 'admin') {
        toast.error('Solo administradores pueden acceder a este panel');
        navigate('/dashboard');
        return;
      }

      const statsRes = await api.get('/admin/stats/overview');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare data for charts
  const specialtyData = Object.entries(stats.distribution.by_specialty).map(([name, value]) => ({
    name,
    value
  }));

  const difficultyData = Object.entries(stats.distribution.by_difficulty).map(([name, value]) => ({
    name,
    value
  }));

  const userDistribution = [
    { name: 'Administradores', value: stats.users.admins, color: '#DC2626' },
    { name: 'Docentes', value: stats.users.teachers, color: '#005A9C' },
    { name: 'Estudiantes', value: stats.users.students, color: '#10B981' }
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar user={user} />
      
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChartBar size={32} className="text-[#005A9C]" weight="duotone" />
              <div>
                <h1 className="text-3xl font-semibold text-[#334155]">
                  Dashboard Institucional
                </h1>
                <p className="text-[#64748B] mt-1">
                  Estadísticas y métricas globales del sistema
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-3">
                <Users size={32} className="text-[#005A9C]" weight="duotone" />
                <span className="text-3xl font-bold text-[#334155]">
                  {stats.users.total}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Usuarios Totales</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-[#DC2626]" weight="fill" />
                  {stats.users.admins} Admin
                </span>
                <span className="flex items-center gap-1">
                  <ChalkboardTeacher size={14} className="text-[#005A9C]" weight="fill" />
                  {stats.users.teachers} Docentes
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} className="text-[#10B981]" weight="fill" />
                  {stats.users.students} Est.
                </span>
              </div>
            </div>

            {/* Total Cases */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-3">
                <BookOpen size={32} className="text-[#10B981]" weight="duotone" />
                <span className="text-3xl font-bold text-[#334155]">
                  {stats.resources.cases}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Casos Clínicos</p>
              <p className="text-xs text-[#94A3B8] mt-2">
                Disponibles en la biblioteca
              </p>
            </div>

            {/* Total Simulations */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-3">
                <PlayCircle size={32} className="text-[#F59E0B]" weight="duotone" />
                <span className="text-3xl font-bold text-[#334155]">
                  {stats.resources.simulations}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Simulaciones</p>
              <p className="text-xs text-[#94A3B8] mt-2">
                {stats.resources.completed_simulations} completadas
              </p>
            </div>

            {/* Total Evaluations */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-3">
                <ClipboardText size={32} className="text-[#8B5CF6]" weight="duotone" />
                <span className="text-3xl font-bold text-[#334155]">
                  {stats.resources.evaluations}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Evaluaciones</p>
              <p className="text-xs text-[#94A3B8] mt-2">
                Realizadas por docentes
              </p>
            </div>
          </div>

          {/* Second Row Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Groups */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <Users size={24} className="text-[#06B6D4]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {stats.resources.groups}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Grupos Activos</p>
            </div>

            {/* Assignments */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen size={24} className="text-[#EC4899]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {stats.resources.assignments}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">Asignaciones</p>
            </div>

            {/* Average IDEC */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendUp size={24} className="text-[#10B981]" weight="duotone" />
                <span className="text-2xl font-bold text-[#334155]">
                  {stats.performance.avg_idec.toFixed(1)}
                </span>
              </div>
              <p className="text-sm font-medium text-[#64748B]">IDEC Promedio</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                {stats.performance.total_profiles} perfiles
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution Pie Chart */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h3 className="text-lg font-semibold text-[#334155] mb-4">
                Distribución de Usuarios
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cases by Specialty */}
            {specialtyData.length > 0 && (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Casos por Especialidad
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={specialtyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-20} 
                      textAnchor="end" 
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#005A9C" name="Casos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Cases by Difficulty */}
            {difficultyData.length > 0 && (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Casos por Dificultad
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10B981" name="Casos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* System Activity Summary */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <h3 className="text-lg font-semibold text-[#334155] mb-4">
              Resumen de Actividad del Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#F8FAFC] rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Tasa de Completitud</p>
                <p className="text-2xl font-bold text-[#005A9C]">
                  {stats.resources.simulations > 0 
                    ? ((stats.resources.completed_simulations / stats.resources.simulations) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Simulaciones completadas
                </p>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Casos por Estudiante</p>
                <p className="text-2xl font-bold text-[#10B981]">
                  {stats.users.students > 0 
                    ? (stats.resources.assignments / stats.users.students).toFixed(1)
                    : 0}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Asignaciones promedio
                </p>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Evaluaciones por Sim.</p>
                <p className="text-2xl font-bold text-[#F59E0B]">
                  {stats.resources.completed_simulations > 0 
                    ? (stats.resources.evaluations / stats.resources.completed_simulations).toFixed(1)
                    : 0}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Ratio evaluación/simulación
                </p>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Casos Únicos</p>
                <p className="text-2xl font-bold text-[#8B5CF6]">
                  {stats.resources.cases}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Disponibles en biblioteca
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstitutionalDashboard;
