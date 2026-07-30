import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getCases, createCase, updateCase, deleteCase, generateCase, getMe } from '@/lib/api';
import { Plus, Sparkle, BookOpen, Pencil, Trash, X } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

function TeacherCases() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCase, setEditingCase] = useState(null);

  const emptyFormData = {
    title: '',
    specialty: '',
    difficulty: 'medio',
    scenario: '',
    instructions: '',
    simulation_type: 'individual',
    patient_profile: {
      name: '',
      age: '',
      gender: '',
      chief_complaint: '',
      vital_signs: { hr: 80, bp: '120/80', temp: 36.5, rr: 16, spo2: 98 },
      medical_history: [],
      current_medications: [],
      allergies: ''
    },
    learning_objectives: [''],
    team_members: []
  };

  const [formData, setFormData] = useState(emptyFormData);

  const [generateForm, setGenerateForm] = useState({
    specialty: '',
    difficulty: 'medio',
    focus_area: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, casesRes] = await Promise.all([
        getMe(),
        getCases()
      ]);
      
      setUser(userRes.data);
      setCases(casesRes.data);
    } catch (error) {
      console.error('Error loading cases:', error);
      toast.error('Error al cargar casos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Clean up empty learning objectives
      const cleanedData = {
        ...formData,
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim() !== ''),
        team_members: formData.simulation_type === 'equipo_interdisciplinario' ? formData.team_members.filter(tm => tm.role && tm.name) : []
      };

      await createCase(cleanedData);
      toast.success('Caso creado exitosamente');
      setShowCreateDialog(false);
      setFormData(emptyFormData);
      loadData();
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Error al crear caso: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCase = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Clean up empty learning objectives
      const cleanedData = {
        ...formData,
        learning_objectives: formData.learning_objectives.filter(obj => obj.trim() !== ''),
        team_members: formData.simulation_type === 'equipo_interdisciplinario' ? formData.team_members.filter(tm => tm.role && tm.name) : []
      };

      await updateCase(editingCase.case_id, cleanedData);
      toast.success('Caso actualizado exitosamente');
      setShowEditDialog(false);
      setEditingCase(null);
      setFormData(emptyFormData);
      loadData();
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('Error al actualizar caso: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCase = async (caseId, caseTitle) => {
    // Use toast with action instead of confirm (since confirm doesn't work in sandboxed iframe)
    toast(
      <div className="flex flex-col gap-2">
        <p className="font-medium">¿Eliminar "{caseTitle}"?</p>
        <p className="text-sm text-gray-600">Esta acción no se puede deshacer.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              try {
                await deleteCase(caseId);
                toast.success('Caso eliminado exitosamente');
                loadData();
              } catch (error) {
                console.error('Error deleting case:', error);
                toast.error('Error al eliminar caso');
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

  const openEditDialog = (caseItem) => {
    setEditingCase(caseItem);
    setFormData({
      title: caseItem.title || '',
      specialty: caseItem.specialty || '',
      difficulty: caseItem.difficulty || 'medio',
      scenario: caseItem.scenario || '',
      instructions: caseItem.instructions || '',
      simulation_type: caseItem.simulation_type || 'individual',
      patient_profile: caseItem.patient_profile || emptyFormData.patient_profile,
      learning_objectives: caseItem.learning_objectives && caseItem.learning_objectives.length > 0 
        ? caseItem.learning_objectives 
        : [''],
      team_members: caseItem.team_members || []
    });
    setShowEditDialog(true);
  };

  const handleGenerateCase = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      await generateCase(generateForm);
      toast.success('Caso generado con IA exitosamente');
      setShowGenerateDialog(false);
      loadData();
    } catch (error) {
      console.error('Error generating case:', error);
      toast.error('Error al generar caso con IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const addLearningObjective = () => {
    setFormData({
      ...formData,
      learning_objectives: [...formData.learning_objectives, '']
    });
  };

  const updateLearningObjective = (index, value) => {
    const newObjectives = [...formData.learning_objectives];
    newObjectives[index] = value;
    setFormData({
      ...formData,
      learning_objectives: newObjectives
    });
  };

  const removeLearningObjective = (index) => {
    setFormData({
      ...formData,
      learning_objectives: formData.learning_objectives.filter((_, i) => i !== index)
    });
  };

  const addTeamMember = () => {
    setFormData({
      ...formData,
      team_members: [...formData.team_members, { role: '', name: '', specialty: '', description: '' }]
    });
  };

  const updateTeamMember = (index, field, value) => {
    const newMembers = [...formData.team_members];
    newMembers[index][field] = value;
    setFormData({
      ...formData,
      team_members: newMembers
    });
  };

  const removeTeamMember = (index) => {
    setFormData({
      ...formData,
      team_members: formData.team_members.filter((_, i) => i !== index)
    });
  };

  const renderCaseForm = (onSubmit, isEditing = false) => (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#334155]">Información Básica</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
              Título *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
              placeholder="Ej: Paciente con Insuficiencia Cardíaca"
            />
          </div>

          <div>
            <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
              Especialidad *
            </label>
            <input
              type="text"
              required
              value={formData.specialty}
              onChange={(e) => setFormData({...formData, specialty: e.target.value})}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
              placeholder="Ej: Enfermería Clínica"
            />
          </div>
        </div>

        <div>
          <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
            Dificultad *
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
            className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
          >
            <option value="fácil">Fácil</option>
            <option value="medio">Medio</option>
            <option value="difícil">Difícil</option>
          </select>
        </div>

        <div>
          <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
            Tipo de Simulación *
          </label>
          <select
            value={formData.simulation_type}
            onChange={(e) => setFormData({...formData, simulation_type: e.target.value})}
            className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
          >
            <option value="individual">Individual (solo paciente)</option>
            <option value="equipo_interdisciplinario">Equipo Interdisciplinario</option>
          </select>
        </div>

        <div>
          <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
            Escenario Clínico *
          </label>
          <textarea
            required
            value={formData.scenario}
            onChange={(e) => setFormData({...formData, scenario: e.target.value})}
            rows={4}
            className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
            placeholder="Describe la situación clínica del paciente..."
          />
        </div>

        <div>
          <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
            Instrucciones Iniciales
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => setFormData({...formData, instructions: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
            placeholder="Instrucciones que verá el estudiante antes de iniciar la simulación..."
          />
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#334155]">Objetivos de Aprendizaje</h3>
          <button
            type="button"
            onClick={addLearningObjective}
            className="text-[#005A9C] text-sm hover:underline"
          >
            + Agregar Objetivo
          </button>
        </div>
        
        {formData.learning_objectives.map((obj, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={obj}
              onChange={(e) => updateLearningObjective(index, e.target.value)}
              className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
              placeholder={`Objetivo ${index + 1}`}
            />
            {formData.learning_objectives.length > 1 && (
              <button
                type="button"
                onClick={() => removeLearningObjective(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X size={20} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Team Members - only if interdisciplinary */}
      {formData.simulation_type === 'equipo_interdisciplinario' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#334155]">Miembros del Equipo</h3>
            <button
              type="button"
              onClick={addTeamMember}
              className="text-[#005A9C] text-sm hover:underline"
            >
              + Agregar Miembro
            </button>
          </div>
          
          {formData.team_members.map((member, index) => (
            <div key={index} className="border border-[#E2E8F0] rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#64748B]">Miembro {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeTeamMember(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={member.role}
                  onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                  placeholder="Rol (ej: medico, enfermera_senior)"
                />
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                  placeholder="Nombre"
                />
              </div>
              
              <input
                type="text"
                value={member.specialty}
                onChange={(e) => updateTeamMember(index, 'specialty', e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                placeholder="Especialidad"
              />
              
              <textarea
                value={member.description}
                onChange={(e) => updateTeamMember(index, 'description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                placeholder="Descripción del rol en la simulación"
              />
            </div>
          ))}
          
          {formData.team_members.length === 0 && (
            <p className="text-sm text-[#64748B] text-center py-4">
              No hay miembros del equipo. Haz clic en "Agregar Miembro" para empezar.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-[#005A9C] text-white py-3 px-4 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 disabled:opacity-50"
      >
        {isSaving ? 'Guardando...' : (isEditing ? 'Actualizar Caso' : 'Crear Caso')}
      </button>
    </form>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando casos...</p>
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
              <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]" data-testid="teacher-cases-title">
                Gestión de Casos Clínicos
              </h1>
              <p className="text-[#64748B] mt-1">Crea y administra casos para tus estudiantes</p>
            </div>
            
            <div className="flex gap-3">
              <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogTrigger asChild>
                  <button
                    data-testid="generate-case-ai-button"
                    className="bg-[#334155] text-white px-4 py-2 rounded-md font-medium hover:bg-[#121E2A] transition-all duration-200 flex items-center gap-2"
                  >
                    <Sparkle size={18} weight="fill" />
                    Generar con IA
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generar Caso con IA</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleGenerateCase} className="space-y-4">
                    <div>
                      <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
                        Especialidad
                      </label>
                      <input
                        type="text"
                        required
                        value={generateForm.specialty}
                        onChange={(e) => setGenerateForm({...generateForm, specialty: e.target.value})}
                        placeholder="Ej: Cuidado Crítico, Pediatría"
                        className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                      />
                    </div>

                    <div>
                      <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
                        Dificultad
                      </label>
                      <select
                        value={generateForm.difficulty}
                        onChange={(e) => setGenerateForm({...generateForm, difficulty: e.target.value})}
                        className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                      >
                        <option value="fácil">Fácil</option>
                        <option value="medio">Medio</option>
                        <option value="difícil">Difícil</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">
                        Área de Enfoque (Opcional)
                      </label>
                      <input
                        type="text"
                        value={generateForm.focus_area}
                        onChange={(e) => setGenerateForm({...generateForm, focus_area: e.target.value})}
                        placeholder="Ej: Manejo de dolor, Valoración neurológica"
                        className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full bg-[#005A9C] text-white py-2 px-4 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 disabled:opacity-50"
                    >
                      {isGenerating ? 'Generando...' : 'Generar Caso'}
                    </button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <button
                    data-testid="create-case-button"
                    className="bg-[#005A9C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
                  >
                    <Plus size={18} weight="bold" />
                    Crear Caso Manual
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Caso</DialogTitle>
                  </DialogHeader>
                  {renderCaseForm(handleCreateCase, false)}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Cases List */}
        <div className="p-8">
          {cases.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} weight="duotone" className="text-[#64748B] mx-auto mb-4" />
              <p className="text-[#64748B] mb-4">No hay casos creados aún</p>
              <p className="text-sm text-[#64748B]">Crea tu primer caso manualmente o genera uno con IA</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map(caseItem => (
                <div 
                  key={caseItem.case_id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-sm hover:-translate-y-[2px] transition-all duration-200"
                  data-testid={`teacher-case-${caseItem.case_id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      caseItem.difficulty === 'fácil' ? 'bg-[#ECFDF5] text-[#10B981]' :
                      caseItem.difficulty === 'medio' ? 'bg-[#FEF3C7] text-[#F59E0B]' :
                      'bg-[#FEE2E2] text-[#EF4444]'
                    }`}>
                      {caseItem.difficulty}
                    </span>
                    <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full">
                      {caseItem.specialty}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-[#334155] mb-2">{caseItem.title}</h3>
                  <p className="text-sm text-[#64748B] line-clamp-3 mb-4">{caseItem.scenario}</p>

                  <div className="flex gap-2 pt-3 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => openEditDialog(caseItem)}
                      className="flex-1 bg-[#F1F5F9] text-[#334155] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#E2E8F0] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteCase(caseItem.case_id, caseItem.title)}
                      className="flex-1 bg-[#FEE2E2] text-[#EF4444] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#FECACA] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Trash size={16} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Caso</DialogTitle>
          </DialogHeader>
          {renderCaseForm(handleEditCase, true)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TeacherCases;
