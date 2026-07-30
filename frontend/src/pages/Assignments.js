import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe } from '@/lib/api';
import api from '@/lib/api';
import { BookOpen, Users, User, DiceFive, Target, Trash, Calendar } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

function Assignments() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    assignment_type: 'individual', // 'individual' | 'group'
    assigned_to: '',
    assignment_mode: 'directed', // 'directed' | 'random'
    case_id: '',
    random_filters: {
      difficulty: '',
      specialty: ''
    }
  });

  const difficulties = ['Principiante', 'Intermedio', 'Avanzado'];
  const specialties = [
    'Cuidado Crítico',
    'Urgencias',
    'Pediatría',
    'Salud Mental',
    'Comunitaria',
    'Quirúrgica',
    'Maternidad'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // First check user role before making other API calls
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);
      
      if (userData.role !== 'teacher' && userData.role !== 'admin') {
        toast.error('Solo docentes y administradores pueden acceder a esta página');
        navigate('/dashboard');
        return;
      }
      
      // Only fetch data if user has permission
      const [assignmentsRes, groupsRes, studentsRes, casesRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/groups'),
        api.get('/users?role=student'),
        api.get('/cases')
      ]);
      
      setAssignments(assignmentsRes.data);
      setGroups(groupsRes.data);
      setStudents(studentsRes.data);
      setCases(casesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    // Validation
    if (!formData.assigned_to) {
      toast.error('Debes seleccionar un estudiante o grupo');
      return;
    }

    if (formData.assignment_mode === 'directed' && !formData.case_id) {
      toast.error('Debes seleccionar un caso para asignación dirigida');
      return;
    }

    if (formData.assignment_mode === 'random') {
      if (!formData.random_filters.difficulty || !formData.random_filters.specialty) {
        toast.error('Debes configurar los filtros para asignación aleatoria');
        return;
      }
    }

    try {
      const payload = {
        assignment_type: formData.assignment_type,
        assigned_to: formData.assigned_to,
        assignment_mode: formData.assignment_mode,
        case_id: formData.assignment_mode === 'directed' ? formData.case_id : null,
        random_filters: formData.assignment_mode === 'random' ? formData.random_filters : null
      };

      await api.post('/assignments', payload);
      toast.success('Asignación creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Error al crear asignación: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      await api.delete(`/assignments/${assignmentToDelete}`);
      toast.success('Asignación eliminada exitosamente');
      setShowDeleteConfirm(false);
      setAssignmentToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Error al eliminar asignación');
    }
  };

  const resetForm = () => {
    setFormData({
      assignment_type: 'individual',
      assigned_to: '',
      assignment_mode: 'directed',
      case_id: '',
      random_filters: { difficulty: '', specialty: '' }
    });
  };

  const getAssignedToName = (assignment) => {
    if (assignment.assignment_type === 'individual') {
      const student = students.find(s => s.user_id === assignment.assigned_to);
      return student ? student.name : 'Desconocido';
    } else {
      const group = groups.find(g => g.group_id === assignment.assigned_to);
      return group ? group.name : 'Grupo Desconocido';
    }
  };

  const getCaseName = (caseId) => {
    const caseData = cases.find(c => c.case_id === caseId);
    return caseData ? caseData.title : 'Caso no disponible';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando asignaciones...</p>
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
              <h1 className="text-3xl font-semibold text-[#334155]">
                Asignación de Casos
              </h1>
              <p className="text-[#64748B] mt-1">
                Asigna casos clínicos a estudiantes o grupos
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-[#005A9C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200"
            >
              <BookOpen size={20} weight="bold" />
              Nueva Asignación
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center">
              <BookOpen size={64} className="text-[#CBD5E1] mx-auto mb-4" weight="duotone" />
              <h3 className="text-xl font-semibold text-[#334155] mb-2">
                No hay asignaciones creadas
              </h3>
              <p className="text-[#64748B] mb-6">
                Comienza asignando casos a tus estudiantes
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 inline-flex items-center gap-2"
              >
                <BookOpen size={20} weight="bold" />
                Crear Primera Asignación
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {assignment.assignment_type === 'individual' ? (
                          <User size={20} className="text-[#64748B]" weight="duotone" />
                        ) : (
                          <Users size={20} className="text-[#64748B]" weight="duotone" />
                        )}
                        <h3 className="text-lg font-semibold text-[#334155]">
                          {getAssignedToName(assignment)}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assignment.assignment_type === 'individual'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {assignment.assignment_type === 'individual' ? 'Individual' : 'Grupal'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assignment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : assignment.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {assignment.status === 'pending' ? 'Pendiente' : assignment.status === 'in_progress' ? 'En Progreso' : 'Completado'}
                        </span>
                      </div>

                      <div className="space-y-2 mt-4">
                        {assignment.assignment_mode === 'directed' ? (
                          <div className="flex items-center gap-2 text-sm text-[#475569]">
                            <Target size={16} className="text-[#10B981]" weight="fill" />
                            <span className="font-medium">Asignación Dirigida:</span>
                            <span>{getCaseName(assignment.case_id)}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-[#475569]">
                              <DiceFive size={16} className="text-[#F59E0B]" weight="fill" />
                              <span className="font-medium">Asignación Aleatoria</span>
                            </div>
                            <div className="ml-6 text-xs text-[#64748B]">
                              <p>Dificultad: {assignment.random_filters?.difficulty || 'N/A'}</p>
                              <p>Especialidad: {assignment.random_filters?.specialty || 'N/A'}</p>
                              {assignment.case_id && (
                                <p className="text-[#10B981] mt-1">
                                  Caso seleccionado: {getCaseName(assignment.case_id)}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-[#64748B]">
                          <Calendar size={14} />
                          <span>
                            Asignado el {new Date(assignment.assigned_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAssignmentToDelete(assignment.assignment_id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-all"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Assignment Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Asignación de Caso</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Assignment Type */}
              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Tipo de Asignación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, assignment_type: 'individual', assigned_to: '' }))}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.assignment_type === 'individual'
                        ? 'border-[#005A9C] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <User size={24} className="mx-auto mb-2" weight="duotone" />
                    <p className="text-sm font-medium">Individual</p>
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, assignment_type: 'group', assigned_to: '' }))}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.assignment_type === 'group'
                        ? 'border-[#005A9C] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <Users size={24} className="mx-auto mb-2" weight="duotone" />
                    <p className="text-sm font-medium">Grupal</p>
                  </button>
                </div>
              </div>

              {/* Select Student or Group */}
              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  {formData.assignment_type === 'individual' ? 'Seleccionar Estudiante *' : 'Seleccionar Grupo *'}
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                >
                  <option value="">-- Seleccionar --</option>
                  {formData.assignment_type === 'individual' ? (
                    students.map(student => (
                      <option key={student.user_id} value={student.user_id}>
                        {student.name} ({student.email})
                      </option>
                    ))
                  ) : (
                    groups.map(group => (
                      <option key={group.group_id} value={group.group_id}>
                        {group.name} ({group.student_ids?.length || 0} estudiantes)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Assignment Mode */}
              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Modalidad de Asignación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, assignment_mode: 'directed', case_id: '' }))}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.assignment_mode === 'directed'
                        ? 'border-[#10B981] bg-[#ECFDF5]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <Target size={24} className="mx-auto mb-2 text-[#10B981]" weight="fill" />
                    <p className="text-sm font-medium">Dirigida</p>
                    <p className="text-xs text-[#64748B] mt-1">Seleccionar caso específico</p>
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, assignment_mode: 'random', case_id: '', random_filters: { difficulty: '', specialty: '' } }))}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.assignment_mode === 'random'
                        ? 'border-[#F59E0B] bg-[#FEF3C7]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <DiceFive size={24} className="mx-auto mb-2 text-[#F59E0B]" weight="fill" />
                    <p className="text-sm font-medium">Aleatoria</p>
                    <p className="text-xs text-[#64748B] mt-1">Configurar filtros</p>
                  </button>
                </div>
              </div>

              {/* Directed: Select Case */}
              {formData.assignment_mode === 'directed' && (
                <div>
                  <label className="text-sm font-medium text-[#334155] block mb-2">
                    Seleccionar Caso Clínico *
                  </label>
                  <select
                    value={formData.case_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, case_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                  >
                    <option value="">-- Seleccionar Caso --</option>
                    {cases.map(caseItem => (
                      <option key={caseItem.case_id} value={caseItem.case_id}>
                        {caseItem.title} ({caseItem.difficulty} - {caseItem.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Random: Configure Filters */}
              {formData.assignment_mode === 'random' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#334155] block mb-2">
                      Nivel de Dificultad *
                    </label>
                    <select
                      value={formData.random_filters.difficulty}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        random_filters: { ...prev.random_filters, difficulty: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                    >
                      <option value="">-- Seleccionar Dificultad --</option>
                      {difficulties.map(diff => (
                        <option key={diff} value={diff}>{diff}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#334155] block mb-2">
                      Especialidad de Enfermería *
                    </label>
                    <select
                      value={formData.random_filters.specialty}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        random_filters: { ...prev.random_filters, specialty: e.target.value }
                      }))}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                    >
                      <option value="">-- Seleccionar Especialidad --</option>
                      {specialties.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-lg p-3">
                    <p className="text-xs text-[#92400E]">
                      ℹ️ El sistema seleccionará un caso al azar que cumpla con estos filtros cuando el estudiante inicie la simulación
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAssignment}
                  className="px-4 py-2 bg-[#005A9C] text-white rounded-md hover:bg-[#004578] transition-all"
                >
                  Crear Asignación
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-[#475569]">
                ¿Estás seguro de eliminar esta asignación? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setAssignmentToDelete(null);
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAssignment}
                  className="px-4 py-2 bg-[#DC2626] text-white rounded-md hover:bg-[#B91C1C] transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Assignments;
