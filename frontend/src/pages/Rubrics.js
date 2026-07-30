import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getRubrics, deleteRubric, getMe } from '@/lib/api';
import { Plus, Scales, Trash, Eye, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

function Rubrics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubric, setSelectedRubric] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const competencyLabels = {
    comunicacion: 'Comunicación',
    valoracion_clinica: 'Valoración Clínica',
    razonamiento_critico: 'Razonamiento Crítico',
    competencia_tecnica: 'Competencia Técnica',
    empatia: 'Empatía y Relación Terapéutica'
  };

  const levelColors = {
    nivel_1: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    nivel_2: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    nivel_3: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    nivel_4: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, rubricsRes] = await Promise.all([
        getMe(),
        getRubrics()
      ]);
      
      setUser(userRes.data);
      setRubrics(rubricsRes.data);
    } catch (error) {
      console.error('Error loading rubrics:', error);
      toast.error('Error al cargar rúbricas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRubric = async (rubricId, rubricName) => {
    toast(
      <div className="flex flex-col gap-2">
        <p className="font-medium">¿Eliminar "{rubricName}"?</p>
        <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              try {
                await deleteRubric(rubricId);
                toast.success('Rúbrica eliminada exitosamente');
                loadData();
              } catch (error) {
                console.error('Error deleting rubric:', error);
                toast.error(error.response?.data?.detail || 'Error al eliminar rúbrica');
              }
            }}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Eliminar
          </button>
          <button
            onClick={() => toast.dismiss()}
            className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>,
      { duration: 10000 }
    );
  };

  const openDetailDialog = (rubric) => {
    setSelectedRubric(rubric);
    setShowDetailDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando rúbricas...</p>
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
            <div>
              <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]">
                Rúbricas de Evaluación
              </h1>
              <p className="text-[#64748B] mt-1">Sistema de evaluación por niveles de logro (cuartiles)</p>
            </div>
            
            <button
              onClick={() => navigate('/teacher/cases')}
              className="bg-[#005A9C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
            >
              <Plus size={18} weight="bold" />
              Gestionar Casos
            </button>
          </div>
        </div>

        {/* Rubrics List */}
        <div className="p-8">
          {rubrics.length === 0 ? (
            <div className="text-center py-12">
              <Scales size={48} weight="duotone" className="text-[#64748B] mx-auto mb-4" />
              <p className="text-[#64748B] mb-4">No hay rúbricas disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {rubrics.map(rubric => {
                const hasLevels = rubric.competency_levels && Object.keys(rubric.competency_levels).length > 0;
                
                return (
                  <div 
                    key={rubric.rubric_id}
                    className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-medium text-[#334155]">{rubric.name}</h3>
                          {rubric.is_default && (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EFF6FF] text-[#3B82F6]">
                              Por Defecto
                            </span>
                          )}
                        </div>
                        {rubric.description && (
                          <p className="text-sm text-[#64748B] mb-3">{rubric.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Weights Summary */}
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {Object.entries(rubric.competency_weights).map(([key, value]) => (
                        <div key={key} className="text-center p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                          <p className="text-xs text-[#64748B] mb-1">{competencyLabels[key]}</p>
                          <p className="text-lg font-semibold text-[#005A9C]">{value}%</p>
                        </div>
                      ))}
                    </div>

                    {/* Levels Info */}
                    {hasLevels && (
                      <div className="bg-gradient-to-r from-[#F8FAFC] to-white p-4 rounded-lg border border-[#E2E8F0] mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#334155] mb-1">
                              📊 Sistema de Niveles de Logro
                            </p>
                            <p className="text-xs text-[#64748B]">
                              4 niveles por competencia • Evaluación por cuartiles (25% cada nivel)
                            </p>
                          </div>
                          <button
                            onClick={() => openDetailDialog(rubric)}
                            className="bg-[#005A9C] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
                          >
                            <Eye size={18} />
                            Ver Detalles
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!rubric.is_default && (
                      <div className="flex gap-2 pt-3 border-t border-[#E2E8F0]">
                        <button
                          onClick={() => handleDeleteRubric(rubric.rubric_id, rubric.name)}
                          className="flex-1 bg-[#FEE2E2] text-[#EF4444] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#FECACA] transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Trash size={16} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedRubric?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedRubric && selectedRubric.competency_levels && (
            <div className="space-y-6 mt-4">
              {Object.entries(selectedRubric.competency_levels).map(([key, competency]) => (
                <div key={key} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                  {/* Competency Header */}
                  <div className="bg-gradient-to-r from-[#005A9C] to-[#003D6B] text-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{competency.name}</h3>
                        <p className="text-sm text-white/80">{competency.description}</p>
                      </div>
                      <span className="text-2xl font-bold">
                        {selectedRubric.competency_weights[key]}%
                      </span>
                    </div>
                  </div>

                  {/* Levels Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {Object.entries(competency.levels).map(([levelKey, level]) => {
                      const colors = levelColors[levelKey] || levelColors.nivel_1;
                      return (
                        <div 
                          key={levelKey}
                          className={`${colors.bg} border-2 ${colors.border} rounded-lg p-4`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className={`text-xs font-semibold uppercase tracking-wider ${colors.text} mb-1`}>
                                {level.range}
                              </p>
                              <h4 className={`text-base font-semibold ${colors.text}`}>
                                {level.label}
                              </h4>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {levelKey.replace('nivel_', 'N')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {level.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6 pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={() => setShowDetailDialog(false)}
              className="bg-[#F1F5F9] text-[#334155] px-6 py-2 rounded-md font-medium hover:bg-[#E2E8F0] transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Rubrics;
