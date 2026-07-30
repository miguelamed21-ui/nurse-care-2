import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe } from '@/lib/api';
import api from '@/lib/api';
import { 
  ChartBar, Users, TrendUp, Eye, ArrowLeft, 
  FilePdf, FileXls, DownloadSimple 
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// Custom Tooltip Component (moved outside to avoid re-render issues)
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#E2E8F0] rounded shadow-lg">
        <p className="text-sm font-medium">{payload[0].payload.case_title}</p>
        <p className="text-sm text-[#64748B]">Puntuación: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

function TeacherAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOverview, setGroupOverview] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [comparisons, setComparisons] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('groups'); // 'groups', 'overview', 'student', 'compare'

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);

      if (userData.role !== 'teacher' && userData.role !== 'admin') {
        toast.error('Solo docentes y administradores pueden acceder a este panel');
        navigate('/dashboard');
        return;
      }

      const groupsRes = await api.get('/groups');
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupOverview = async (groupId) => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/groups/${groupId}/overview`);
      setGroupOverview(res.data);
      setSelectedGroup(groupId);
      setView('overview');
    } catch (error) {
      console.error('Error loading group overview:', error);
      toast.error('Error al cargar vista general del grupo');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (studentId) => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/students/${studentId}`);
      setStudentDetails(res.data);
      setSelectedStudent(studentId);
      setView('student');
    } catch (error) {
      console.error('Error loading student details:', error);
      toast.error('Error al cargar detalles del estudiante');
    } finally {
      setLoading(false);
    }
  };

  const loadComparisons = async (groupId) => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/groups/${groupId}/compare`);
      setComparisons(res.data);
      setView('compare');
    } catch (error) {
      console.error('Error loading comparisons:', error);
      toast.error('Error al cargar comparativas');
    } finally {
      setLoading(false);
    }
  };

  const backToGroups = () => {
    setView('groups');
    setSelectedGroup(null);
    setGroupOverview(null);
    setSelectedStudent(null);
    setStudentDetails(null);
    setComparisons(null);
  };

  const backToOverview = () => {
    if (selectedGroup) {
      loadGroupOverview(selectedGroup);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get(`/analytics/groups/${selectedGroup}/export/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grupo_${groupOverview?.group_name}_analytics.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/analytics/groups/${selectedGroup}/export/excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grupo_${groupOverview?.group_name}_comparativa.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel descargado exitosamente');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Error al exportar Excel');
    }
  };

  if (loading && !groupOverview && !studentDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando analíticas...</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {view !== 'groups' && (
                <button
                  onClick={view === 'student' || view === 'compare' ? backToOverview : backToGroups}
                  className="p-2 text-[#64748B] hover:text-[#005A9C] hover:bg-[#EFF6FF] rounded-md transition-all"
                >
                  <ArrowLeft size={20} weight="bold" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-semibold text-[#334155]">
                  Panel de Analíticas
                </h1>
                <p className="text-[#64748B] mt-1">
                  {view === 'groups' && 'Selecciona un grupo para ver estadísticas'}
                  {view === 'overview' && `Vista general: ${groupOverview?.group_name}`}
                  {view === 'student' && `Estudiante: ${studentDetails?.student?.name}`}
                  {view === 'compare' && `Comparativa: ${comparisons?.group_name}`}
                </p>
              </div>
            </div>
            <ChartBar size={32} className="text-[#005A9C]" weight="duotone" />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Groups List View */}
          {view === 'groups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg border border-[#E2E8F0] p-12 text-center">
                  <Users size={64} className="text-[#CBD5E1] mx-auto mb-4" weight="duotone" />
                  <h3 className="text-xl font-semibold text-[#334155] mb-2">
                    No hay grupos creados
                  </h3>
                  <p className="text-[#64748B] mb-6">
                    Crea grupos en la sección de Gestión de Grupos
                  </p>
                  <button
                    onClick={() => navigate('/groups')}
                    className="bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all inline-flex items-center gap-2"
                  >
                    <Users size={20} weight="bold" />
                    Ir a Grupos
                  </button>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.group_id}
                    className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => loadGroupOverview(group.group_id)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Users size={24} className="text-[#005A9C]" weight="duotone" />
                      <h3 className="text-lg font-semibold text-[#334155]">{group.name}</h3>
                    </div>
                    {group.description && (
                      <p className="text-sm text-[#64748B] mb-4">{group.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">
                        {group.student_ids?.length || 0} estudiantes
                      </span>
                      <button className="text-[#005A9C] hover:text-[#004578] font-medium flex items-center gap-1">
                        Ver analíticas
                        <Eye size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Group Overview */}
          {view === 'overview' && groupOverview && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users size={24} className="text-[#005A9C]" weight="duotone" />
                    <span className="text-2xl font-bold text-[#334155]">
                      {groupOverview.student_count}
                    </span>
                  </div>
                  <p className="text-sm text-[#64748B]">Estudiantes</p>
                </div>

                <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                  <div className="flex items-center justify-between mb-2">
                    <ChartBar size={24} className="text-[#10B981]" weight="duotone" />
                    <span className="text-2xl font-bold text-[#334155]">
                      {groupOverview.total_simulations}
                    </span>
                  </div>
                  <p className="text-sm text-[#64748B]">Simulaciones</p>
                </div>

                <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendUp size={24} className="text-[#F59E0B]" weight="duotone" />
                    <span className="text-2xl font-bold text-[#334155]">
                      {groupOverview.total_evaluations}
                    </span>
                  </div>
                  <p className="text-sm text-[#64748B]">Evaluaciones</p>
                </div>

                <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                  <div className="flex items-center justify-between mb-2">
                    <ChartBar size={24} className="text-[#8B5CF6]" weight="duotone" />
                    <span className="text-2xl font-bold text-[#334155]">
                      {groupOverview.avg_idec.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-[#64748B]">IDEC Promedio</p>
                </div>
              </div>

              {/* Average Competencies Chart */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Competencias Promedio del Grupo
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(groupOverview.avg_competencies).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={100} fontSize={12} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#005A9C" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => loadComparisons(selectedGroup)}
                  className="flex-1 bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all flex items-center justify-center gap-2"
                >
                  <TrendUp size={20} weight="bold" />
                  Ver Comparativa entre Estudiantes
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-[#DC2626] text-white px-6 py-3 rounded-md font-medium hover:bg-[#B91C1C] transition-all flex items-center justify-center gap-2"
                >
                  <FilePdf size={20} weight="bold" />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="bg-[#10B981] text-white px-6 py-3 rounded-md font-medium hover:bg-[#059669] transition-all flex items-center justify-center gap-2"
                >
                  <FileXls size={20} weight="bold" />
                  Exportar Excel
                </button>
              </div>

              {/* Students List */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Estudiantes del Grupo
                </h3>
                <div className="space-y-3">
                  {groupOverview.students.map((student) => (
                    <div
                      key={student.user_id}
                      className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-all"
                      onClick={() => loadStudentDetails(student.user_id)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[#334155]">{student.name}</p>
                        <p className="text-sm text-[#64748B]">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-[#334155]">{student.simulations_count}</p>
                          <p className="text-[#64748B]">Simulaciones</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-[#334155]">{student.evaluations_count}</p>
                          <p className="text-[#64748B]">Evaluaciones</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-[#334155]">{student.idec_score.toFixed(1)}</p>
                          <p className="text-[#64748B]">IDEC</p>
                        </div>
                        <Eye size={20} className="text-[#005A9C]" weight="bold" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student Details */}
          {view === 'student' && studentDetails && (
            <div className="space-y-6">
              {/* Student Header */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-[#334155]">
                      {studentDetails.student.name}
                    </h2>
                    <p className="text-[#64748B]">{studentDetails.student.email}</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#005A9C]">
                        {studentDetails.summary.simulations_count}
                      </p>
                      <p className="text-sm text-[#64748B]">Simulaciones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#10B981]">
                        {studentDetails.summary.evaluations_count}
                      </p>
                      <p className="text-sm text-[#64748B]">Evaluaciones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#8B5CF6]">
                        {studentDetails.summary.idec_score.toFixed(1)}
                      </p>
                      <p className="text-sm text-[#64748B]">IDEC</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Competencies Radar Chart */}
              {Object.keys(studentDetails.competencies).length > 0 && (
                <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                  <h3 className="text-lg font-semibold text-[#334155] mb-4">
                    Perfil de Competencias
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={Object.entries(studentDetails.competencies).map(([name, value]) => ({ 
                      competencia: name.replace(/^(.{20}).*$/, "$1..."), 
                      puntuación: value 
                    }))}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="competencia" fontSize={12} />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar name="Puntuación" dataKey="puntuación" stroke="#005A9C" fill="#005A9C" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Competency Trends */}
              {Object.keys(studentDetails.competency_trends).length > 0 && (
                <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                  <h3 className="text-lg font-semibold text-[#334155] mb-4">
                    Progreso de Competencias
                  </h3>
                  {Object.entries(studentDetails.competency_trends).map(([compName, trend]) => (
                    trend.length > 0 && (
                      <div key={compName} className="mb-6">
                        <h4 className="text-sm font-medium text-[#64748B] mb-2">{compName}</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={trend.map((t, i) => ({ ...t, index: i + 1 }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="index" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="score" stroke="#005A9C" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Recent Simulations */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Historial de Simulaciones
                </h3>
                <div className="space-y-3">
                  {studentDetails.simulations.slice(0, 10).map((sim) => (
                    <div key={sim.sim_id} className="p-4 border border-[#E2E8F0] rounded-lg">
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
                            {sim.status === 'completed' ? 'Completado' : 'En progreso'}
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
          )}

          {/* Comparisons */}
          {view === 'compare' && comparisons && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
                <h3 className="text-lg font-semibold text-[#334155] mb-4">
                  Comparativa de Estudiantes - {comparisons.group_name}
                </h3>
                
                {/* IDEC Comparison Chart */}
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-[#64748B] mb-3">Índice IDEC</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisons.comparisons}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-20} textAnchor="end" height={100} fontSize={12} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="idec_score" fill="#8B5CF6" name="IDEC" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="text-left py-3 px-4 font-medium text-[#64748B]">Estudiante</th>
                        <th className="text-center py-3 px-4 font-medium text-[#64748B]">Simulaciones</th>
                        <th className="text-center py-3 px-4 font-medium text-[#64748B]">Evaluaciones</th>
                        <th className="text-center py-3 px-4 font-medium text-[#64748B]">IDEC</th>
                        <th className="text-center py-3 px-4 font-medium text-[#64748B]">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.comparisons.map((student) => (
                        <tr key={student.user_id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4">
                            <p className="font-medium text-[#334155]">{student.name}</p>
                            <p className="text-xs text-[#64748B]">{student.email}</p>
                          </td>
                          <td className="text-center py-3 px-4 text-[#334155]">{student.simulations}</td>
                          <td className="text-center py-3 px-4 text-[#334155]">{student.evaluations}</td>
                          <td className="text-center py-3 px-4">
                            <span className="font-semibold text-[#8B5CF6]">
                              {student.idec_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <button
                              onClick={() => loadStudentDetails(student.user_id)}
                              className="text-[#005A9C] hover:text-[#004578] font-medium"
                            >
                              Ver detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherAnalytics;
