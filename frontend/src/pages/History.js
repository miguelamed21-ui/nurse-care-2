import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getSimulations, getEvaluation, getMe } from '@/lib/api';
import { Eye, Trophy, TrendUp, Calendar, FilePdf, FileXls, Download } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function History() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEval, setSelectedEval] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, simsRes] = await Promise.all([
        getMe(),
        getSimulations()
      ]);
      
      setUser(userRes.data);
      setSimulations(simsRes.data);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvaluation = async (simId) => {
    try {
      const response = await getEvaluation(simId);
      setSelectedEval(response.data);
    } catch (error) {
      console.error('Error loading evaluation:', error);
      toast.error('Esta simulación no tiene evaluación aún');
    }
  };

  const handleExportEvaluation = async (evalId, format) => {
    try {
      toast.loading(`Generando archivo ${format.toUpperCase()}...`);
      
      const url = `${BACKEND_URL}/api/evaluations/${evalId}/export?format=${format}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al exportar');
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `evaluacion.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando historial...</p>
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
          <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]" data-testid="history-title">
            Historial de Simulaciones
          </h1>
          <p className="text-[#64748B] mt-1">Revisa tus simulaciones y retroalimentación</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {simulations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#64748B] mb-4">No tienes simulaciones aún</p>
              <button
                onClick={() => navigate('/cases')}
                className="bg-[#005A9C] text-white px-6 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200"
              >
                Iniciar Primera Simulación
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {simulations.map(sim => (
                <div 
                  key={sim.sim_id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-sm hover:-translate-y-[2px] transition-all duration-200"
                  data-testid={`simulation-${sim.sim_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          sim.status === 'completed' 
                            ? 'bg-[#ECFDF5] text-[#10B981]' 
                            : 'bg-[#FEF3C7] text-[#F59E0B]'
                        }`}>
                          {sim.status === 'completed' ? 'Completada' : 'En progreso'}
                        </span>
                        <span className="text-xs text-[#64748B] flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(sim.started_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-[#334155] mb-2">Simulación #{sim.sim_id.slice(-6)}</h3>
                      <p className="text-sm text-[#64748B]">
                        {sim.conversation.length} mensajes intercambiados
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {sim.status === 'completed' ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              onClick={() => handleViewEvaluation(sim.sim_id)}
                              data-testid={`view-eval-${sim.sim_id}`}
                              className="bg-[#005A9C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
                            >
                              <Trophy size={18} weight="fill" />
                              Ver Evaluación
                            </button>
                          </DialogTrigger>
                          {selectedEval && (
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Evaluación de Desempeño</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6">
                                {/* Scores */}
                                <div>
                                  <h3 className="text-sm font-semibold text-[#334155] mb-3">Competencias Evaluadas</h3>
                                  <div className="space-y-2">
                                    {Object.entries(selectedEval.scores).map(([key, value]) => (
                                      <div key={key}>
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="capitalize text-[#475569]">{key.replace('_', ' ')}</span>
                                          <span className="font-semibold text-[#334155]">{value}/100</span>
                                        </div>
                                        <div className="w-full bg-[#F1F5F9] rounded-full h-2">
                                          <div 
                                            className="bg-[#005A9C] h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${value}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Strengths */}
                                <div>
                                  <h3 className="text-sm font-semibold text-[#10B981] mb-2 flex items-center gap-2">
                                    <Trophy size={16} weight="duotone" />
                                    Fortalezas
                                  </h3>
                                  <ul className="space-y-1 text-sm text-[#475569]">
                                    {selectedEval.strengths.map((s, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-[#10B981] mt-1">•</span>
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Improvements */}
                                <div>
                                  <h3 className="text-sm font-semibold text-[#F59E0B] mb-2 flex items-center gap-2">
                                    <TrendUp size={16} weight="duotone" />
                                    Áreas de Mejora
                                  </h3>
                                  <ul className="space-y-1 text-sm text-[#475569]">
                                    {selectedEval.improvements.map((i, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-[#F59E0B] mt-1">•</span>
                                        <span>{i}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Feedback */}
                                <div>
                                  <h3 className="text-sm font-semibold text-[#334155] mb-2">Retroalimentación Detallada</h3>
                                  <p className="text-sm text-[#475569] leading-relaxed">{selectedEval.feedback}</p>
                                </div>
                                
                                {/* Export Buttons */}
                                <div className="border-t border-[#E2E8F0] pt-4">
                                  <h3 className="text-sm font-semibold text-[#334155] mb-3 flex items-center gap-2">
                                    <Download size={16} weight="duotone" />
                                    Exportar Evaluación
                                  </h3>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleExportEvaluation(selectedEval.eval_id, 'pdf')}
                                      className="flex-1 bg-[#DC2626] text-white px-4 py-2 rounded-md font-medium hover:bg-[#B91C1C] transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <FilePdf size={18} weight="fill" />
                                      Descargar PDF
                                    </button>
                                    <button
                                      onClick={() => handleExportEvaluation(selectedEval.eval_id, 'excel')}
                                      className="flex-1 bg-[#059669] text-white px-4 py-2 rounded-md font-medium hover:bg-[#047857] transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                      <FileXls size={18} weight="fill" />
                                      Descargar Excel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          )}
                        </Dialog>
                      ) : (
                        <button
                          onClick={() => navigate(`/simulation/${sim.sim_id}`)}
                          data-testid={`continue-sim-${sim.sim_id}`}
                          className="bg-[#334155] text-white px-4 py-2 rounded-md font-medium hover:bg-[#121E2A] transition-all duration-200 flex items-center gap-2"
                        >
                          <Eye size={18} />
                          Continuar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;
