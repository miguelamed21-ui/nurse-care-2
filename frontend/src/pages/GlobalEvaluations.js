import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe, getSimulations } from '@/lib/api';
import { ChartLine, Calendar, FileText, Target, ClockCounterClockwise, FilePdf, FileXls, Download } from '@phosphor-icons/react';
import { toast } from 'sonner';
import api from '@/lib/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function GlobalEvaluations() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [evaluationType, setEvaluationType] = useState('CASO');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [caseEvaluationsCount, setCaseEvaluationsCount] = useState(0);
  const [generatedEvaluation, setGeneratedEvaluation] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await getMe();
      setUser(userRes.data);
      
      // Get list of students (users with completed simulations)
      const simsRes = await getSimulations();
      const uniqueUsers = [...new Set(simsRes.data.map(s => s.user_id))];
      setStudents(uniqueUsers);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check case evaluations for selected student
  useEffect(() => {
    const checkCaseEvaluations = async () => {
      if (!selectedStudent) {
        setCaseEvaluationsCount(0);
        return;
      }

      try {
        const response = await api.get(`/evaluations/user/${selectedStudent}/count`);
        setCaseEvaluationsCount(response.data.case_evaluations_count || 0);
      } catch (error) {
        console.error('Error checking evaluations:', error);
        setCaseEvaluationsCount(0);
      }
    };

    checkCaseEvaluations();
  }, [selectedStudent]);

  const handleGenerateGlobal = async () => {
    if (!selectedStudent) {
      toast.error('Selecciona un estudiante');
      return;
    }

    if (caseEvaluationsCount === 0) {
      toast.error('El estudiante debe tener al menos una evaluación de caso específico antes de generar la evaluación global');
      return;
    }

    setIsGenerating(true);
    
    try {
      const payload = {
        user_id: selectedStudent,
        start_date: dateRange.start_date || null,
        end_date: dateRange.end_date || null
      };

      const response = await api.post('/evaluations/global/generate', payload);
      
      // Save generated evaluation for export
      setGeneratedEvaluation(response.data.evaluation);
      
      toast.success('Evaluación global generada exitosamente');
      
      // Show summary
      const summary = response.data.summary;
      toast(
        <div className="space-y-2">
          <p className="font-semibold">Resumen de Evaluación Global</p>
          <p className="text-sm">Puntaje: {summary.global_score.toFixed(1)}%</p>
          <p className="text-sm">Simulaciones: {summary.simulations_evaluated}</p>
        </div>,
        { duration: 5000 }
      );
      
    } catch (error) {
      console.error('Error generating global evaluation:', error);
      toast.error('Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportGlobalEvaluation = async (evalId, format) => {
    try {
      toast.loading(`Generando archivo ${format.toUpperCase()}...`);
      
      const url = `${BACKEND_URL}/api/evaluations/global/${evalId}/export?format=${format}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al exportar');
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `evaluacion_global.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`Archivo ${format.toUpperCase()} descargado exitosamente`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className="flex h-screen bg-[#F8FAFC]">
        <Sidebar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#64748B]">Solo profesores pueden acceder a esta página</p>
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
          <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]">
            Evaluaciones Globales
          </h1>
          <p className="text-[#64748B] mt-1">
            Genera evaluaciones transversales consolidadas por periodo
          </p>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl mx-auto">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-[#EFF6FF] p-3 rounded-lg">
                  <Target size={24} className="text-[#3B82F6]" weight="duotone" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#334155] mb-2">
                    Evaluación por Caso Particular
                  </h3>
                  <p className="text-sm text-[#64748B] mb-3">
                    Se genera al finalizar cada simulación. 
                    Mide el desempeño en un caso específico mediante rúbrica.
                  </p>
                  <button
                    onClick={() => navigate('/history')}
                    className="flex items-center gap-2 text-sm text-[#3B82F6] hover:text-[#2563EB] font-medium transition-colors"
                  >
                    <ClockCounterClockwise size={18} weight="duotone" />
                    Ver evaluaciones de caso en Historial
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#ECFDF5] p-3 rounded-lg">
                  <ChartLine size={24} className="text-[#10B981]" weight="duotone" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#334155] mb-2">
                    Evaluación Global / Transversal
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    Promedio ponderado de múltiples casos. 
                    Refleja el desempeño en un periodo completo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Generator Form */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-8">
            <h2 className="text-xl font-semibold text-[#334155] mb-6">
              Generar Evaluación Global Automática
            </h2>

            <div className="space-y-6">
              {/* Student Selection */}
              <div>
                <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
                  Seleccionar Estudiante *
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                  required
                >
                  <option value="">-- Selecciona un estudiante --</option>
                  {students.map(studentId => (
                    <option key={studentId} value={studentId}>
                      Estudiante: {studentId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-3">
                  Periodo de Evaluación (Opcional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748B] block mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      value={dateRange.start_date}
                      onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748B] block mb-2">Fecha Fin</label>
                    <input
                      type="date"
                      value={dateRange.end_date}
                      onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#64748B] mt-2">
                  Deja en blanco para incluir todas las simulaciones del estudiante
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-[#64748B] mt-0.5" />
                  <div className="text-sm text-[#64748B]">
                    <p className="font-medium text-[#334155] mb-1">¿Cómo funciona?</p>
                    <p>
                      El sistema calculará automáticamente el promedio ponderado de los 
                      cuartiles alcanzados en todas las simulaciones del estudiante en el 
                      periodo seleccionado, generando un puntaje global por cada competencia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateGlobal}
                disabled={isGenerating || !selectedStudent || caseEvaluationsCount === 0}
                className="w-full bg-[#005A9C] text-white py-3 px-4 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <ChartLine size={20} weight="bold" />
                    Generar Evaluación Global
                  </>
                )}
              </button>
              
              {/* Warning if no case evaluations */}
              {selectedStudent && caseEvaluationsCount === 0 && (
                <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg p-4 mt-4">
                  <p className="text-sm text-[#92400E]">
                    ⚠️ El estudiante seleccionado no tiene evaluaciones de caso específico. 
                    Debe completar al menos una simulación y su evaluación correspondiente antes de generar una evaluación global.
                  </p>
                </div>
              )}
              
              {/* Export Section - Show after evaluation is generated */}
              {generatedEvaluation && (
                <div className="border-t border-[#E2E8F0] pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-[#334155] mb-3 flex items-center gap-2">
                    <Download size={18} weight="duotone" />
                    Exportar Evaluación Global Generada
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleExportGlobalEvaluation(generatedEvaluation.eval_id, 'pdf')}
                      className="flex-1 bg-[#DC2626] text-white px-4 py-3 rounded-md font-medium hover:bg-[#B91C1C] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FilePdf size={20} weight="fill" />
                      Descargar PDF
                    </button>
                    <button
                      onClick={() => handleExportGlobalEvaluation(generatedEvaluation.eval_id, 'excel')}
                      className="flex-1 bg-[#059669] text-white px-4 py-3 rounded-md font-medium hover:bg-[#047857] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FileXls size={20} weight="fill" />
                      Descargar Excel
                    </button>
                  </div>
                  <p className="text-xs text-[#64748B] mt-2 text-center">
                    ID: {generatedEvaluation.eval_id.slice(0, 12)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-6">
            <h3 className="font-semibold text-[#334155] mb-3">
              💡 Casos de Uso
            </h3>
            <ul className="space-y-2 text-sm text-[#64748B]">
              <li className="flex items-start gap-2">
                <span className="text-[#005A9C] mt-1">•</span>
                <span><strong>Cierre de Rotación:</strong> Genera la nota final del estudiante consolidando todos los casos del periodo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#005A9C] mt-1">•</span>
                <span><strong>Evaluación Semestral:</strong> Obtén el promedio de desempeño de todo el semestre</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#005A9C] mt-1">•</span>
                <span><strong>Seguimiento:</strong> Compara el desempeño global con evaluaciones por caso particular</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalEvaluations;
