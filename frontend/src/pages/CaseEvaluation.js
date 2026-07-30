import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMe, getSimulation, getCase } from '@/lib/api';
import api from '@/lib/api';
import { ArrowLeft, CheckCircle, ChartLine } from '@phosphor-icons/react';
import { toast } from 'sonner';

const COMPETENCIAS = [
  {
    key: 'comunicacion',
    name: 'Comunicación',
    description: 'Capacidad para transmitir e intercambiar información de forma clara, precisa y adaptada al contexto'
  },
  {
    key: 'valoracion_clinica',
    name: 'Valoración Clínica',
    description: 'Habilidad para recopilar de manera sistemática y priorizada los datos del paciente'
  },
  {
    key: 'razonamiento_critico',
    name: 'Razonamiento Crítico',
    description: 'Proceso mental de análisis, síntesis y evaluación de la información clínica'
  },
  {
    key: 'competencia_tecnica',
    name: 'Competencia Técnica',
    description: 'Destreza en la ejecución de procedimientos, maniobras clínicas e instrumentales'
  },
  {
    key: 'empatia',
    name: 'Empatía y Relación Terapéutica',
    description: 'Capacidad para comprender la perspectiva del paciente y establecer un vínculo de confianza'
  }
];

const NIVELES = [
  { value: 12.5, label: 'Inicial / Deficiente', range: '0-25%', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 37.5, label: 'En Desarrollo / Aceptable', range: '26-50%', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 62.5, label: 'Competente / Avanzado', range: '51-75%', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 87.5, label: 'Excelente / Destacado', range: '76-100%', color: 'bg-green-100 text-green-800 border-green-300' }
];

function CaseEvaluation() {
  const { sim_id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Scores para cada competencia (valor del cuartil seleccionado)
  const [scores, setScores] = useState({
    comunicacion: null,
    valoracion_clinica: null,
    razonamiento_critico: null,
    competencia_tecnica: null,
    empatia: null
  });
  
  const [feedback, setFeedback] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim_id]);

  const loadData = async () => {
    try {
      const [userRes, simRes] = await Promise.all([
        getMe(),
        getSimulation(sim_id)
      ]);
      
      const userData = userRes.data;
      setUser(userData);
      
      // Check if user is teacher or admin
      if (userData.role !== 'teacher' && userData.role !== 'admin') {
        toast.error('Solo profesores y administradores pueden evaluar casos');
        navigate('/history');
        return;
      }
      
      setSimulation(simRes.data);
      
      const caseRes = await getCase(simRes.data.case_id);
      setCaseData(caseRes.data);
      
      // Cargar rúbrica por defecto
      const rubricRes = await api.get('/rubrics');
      const defaultRubric = rubricRes.data.find(r => r.is_default);
      setRubric(defaultRubric);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLevel = (competencia, valor) => {
    setScores(prev => ({ ...prev, [competencia]: valor }));
  };

  const handleSaveEvaluation = async () => {
    // Validar que todas las competencias estén evaluadas
    const allScored = Object.values(scores).every(score => score !== null);
    if (!allScored) {
      toast.error('Debes evaluar todas las competencias antes de guardar');
      return;
    }

    if (!feedback.trim()) {
      toast.error('Debes proporcionar retroalimentación general');
      return;
    }

    setSaving(true);

    try {
      // Crear evaluación manual (backend deriva user_id, case_id, evaluated_by desde la simulación y el usuario autenticado)
      const evaluationData = {
        sim_id: sim_id,
        scores: scores,
        feedback: feedback.trim(),
        strengths: strengths.trim().split('\n').filter(s => s.trim()),
        improvements: improvements.trim().split('\n').filter(i => i.trim())
      };

      await api.post('/evaluations/manual', evaluationData);
      
      toast.success('Evaluación guardada exitosamente');
      
      // Redirigir a historial después de 1 segundo
      setTimeout(() => {
        navigate('/history');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast.error('Error al guardar evaluación: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando formulario de evaluación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate('/history')}
              className="text-[#475569] hover:text-[#334155] transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-[#334155]">
                Evaluación de Caso Específico
              </h1>
              <p className="text-[#64748B] mt-1">
                {caseData?.title} - {caseData?.specialty}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8">
        {/* Info Box */}
        <div className="bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <ChartLine size={24} className="text-[#005A9C] mt-1" weight="duotone" />
            <div>
              <h3 className="font-semibold text-[#334155] mb-2">
                Instrucciones de Evaluación
              </h3>
              <p className="text-sm text-[#64748B]">
                Evalúa el desempeño del estudiante en cada una de las 5 competencias de enfermería 
                seleccionando el nivel de logro alcanzado (cuartil). Esta evaluación será utilizada 
                para calcular promedios globales en evaluaciones transversales.
              </p>
            </div>
          </div>
        </div>

        {/* Rubric Evaluation Form */}
        <div className="space-y-6">
          {COMPETENCIAS.map((competencia) => (
            <div key={competencia.key} className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h3 className="text-lg font-semibold text-[#334155] mb-2">
                {competencia.name}
              </h3>
              <p className="text-sm text-[#64748B] mb-4">
                {competencia.description}
              </p>

              {/* Nivel Selector */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {NIVELES.map((nivel) => {
                  const isSelected = scores[competencia.key] === nivel.value;
                  return (
                    <button
                      key={nivel.value}
                      onClick={() => handleSelectLevel(competencia.key, nivel.value)}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-[#005A9C] bg-[#EFF6FF] shadow-md'
                          : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${nivel.color} border`}>
                        {nivel.range}
                      </div>
                      <p className="text-sm font-medium text-[#334155] mb-1">
                        {nivel.label}
                      </p>
                      {isSelected && (
                        <CheckCircle size={18} className="text-[#005A9C] mt-2" weight="fill" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Feedback Section */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <h3 className="text-lg font-semibold text-[#334155] mb-4">
              Retroalimentación y Comentarios
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Retroalimentación General *
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escribe una retroalimentación detallada y constructiva sobre el desempeño del estudiante..."
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C] min-h-[120px]"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Fortalezas Observadas (una por línea)
                </label>
                <textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Ejemplo:&#10;Excelente comunicación con el paciente&#10;Valoración clínica sistemática y completa"
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C] min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Áreas de Mejora (una por línea)
                </label>
                <textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="Ejemplo:&#10;Mejorar la priorización de signos de alarma&#10;Reforzar técnicas de manejo del estrés"
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C] min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-3 border border-[#E2E8F0] rounded-md text-[#475569] font-medium hover:bg-[#F1F5F9] transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEvaluation}
              disabled={saving || Object.values(scores).some(s => s === null) || !feedback.trim()}
              className="px-6 py-3 bg-[#005A9C] text-white rounded-md font-medium hover:bg-[#004578] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} weight="fill" />
                  Guardar Evaluación
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CaseEvaluation;
