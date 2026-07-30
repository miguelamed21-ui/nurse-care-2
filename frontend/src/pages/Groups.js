import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe } from '@/lib/api';
import api from '@/lib/api';
import { Users, Plus, Pencil, Trash, X, Check, UserPlus } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

function Groups() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    student_ids: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // First check user role before making other API calls
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);
      
      // Check permissions
      if (userData.role !== 'teacher' && userData.role !== 'admin') {
        toast.error('Solo docentes y administradores pueden acceder a esta página');
        navigate('/dashboard');
        return;
      }
      
      // Only fetch data if user has permission
      const [groupsRes, studentsRes] = await Promise.all([
        api.get('/groups'),
        api.get('/users?role=student')
      ]);
      
      setGroups(groupsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }

    try {
      await api.post('/groups', formData);
      toast.success('Grupo creado exitosamente');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', student_ids: [] });
      loadData();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Error al crear grupo: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }

    try {
      await api.put(`/groups/${selectedGroup.group_id}`, formData);
      toast.success('Grupo actualizado exitosamente');
      setShowEditModal(false);
      setSelectedGroup(null);
      setFormData({ name: '', description: '', student_ids: [] });
      loadData();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Error al actualizar grupo: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      await api.delete(`/groups/${groupToDelete}`);
      toast.success('Grupo eliminado exitosamente');
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Error al eliminar grupo: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openEditModal = (group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      student_ids: group.student_ids || []
    });
    setShowEditModal(true);
  };

  const toggleStudent = (studentId) => {
    setFormData(prev => ({
      ...prev,
      student_ids: prev.student_ids.includes(studentId)
        ? prev.student_ids.filter(id => id !== studentId)
        : [...prev.student_ids, studentId]
    }));
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.user_id === studentId);
    return student ? student.name : 'Desconocido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando grupos...</p>
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
                Gestión de Grupos
              </h1>
              <p className="text-[#64748B] mt-1">
                Crea y administra grupos de estudiantes
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({ name: '', description: '', student_ids: [] });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-[#005A9C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200"
            >
              <Plus size={20} weight="bold" />
              Crear Grupo
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {groups.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center">
              <Users size={64} className="text-[#CBD5E1] mx-auto mb-4" weight="duotone" />
              <h3 className="text-xl font-semibold text-[#334155] mb-2">
                No hay grupos creados
              </h3>
              <p className="text-[#64748B] mb-6">
                Comienza creando tu primer grupo de estudiantes
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 inline-flex items-center gap-2"
              >
                <Plus size={20} weight="bold" />
                Crear Primer Grupo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div
                  key={group.group_id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#334155] mb-1">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-sm text-[#64748B]">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(group)}
                        className="p-2 text-[#64748B] hover:text-[#005A9C] hover:bg-[#EFF6FF] rounded-md transition-all"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setGroupToDelete(group.group_id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-all"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={18} className="text-[#64748B]" weight="duotone" />
                      <span className="text-sm font-medium text-[#64748B]">
                        {group.student_ids?.length || 0} estudiantes
                      </span>
                    </div>
                    
                    {group.student_ids?.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {group.student_ids.slice(0, 5).map((studentId) => (
                          <div
                            key={studentId}
                            className="text-sm text-[#475569] flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></div>
                            {getStudentName(studentId)}
                          </div>
                        ))}
                        {group.student_ids.length > 5 && (
                          <p className="text-xs text-[#64748B] italic">
                            +{group.student_ids.length - 5} más
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Enfermería Cuidado Crítico - Grupo A"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del grupo..."
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C] min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Estudiantes ({formData.student_ids.length} seleccionados)
                </label>
                <div className="border border-[#E2E8F0] rounded-md max-h-64 overflow-y-auto">
                  {students.length === 0 ? (
                    <p className="p-4 text-center text-[#64748B]">
                      No hay estudiantes disponibles
                    </p>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                      {students.map((student) => (
                        <label
                          key={student.user_id}
                          className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.student_ids.includes(student.user_id)}
                            onChange={() => toggleStudent(student.user_id)}
                            className="w-4 h-4 text-[#005A9C] border-[#E2E8F0] rounded focus:ring-[#005A9C]"
                          />
                          <div>
                            <p className="text-sm font-medium text-[#334155]">{student.name}</p>
                            <p className="text-xs text-[#64748B]">{student.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 bg-[#005A9C] text-white rounded-md hover:bg-[#004578] transition-all flex items-center gap-2"
                >
                  <Check size={18} weight="bold" />
                  Crear Grupo
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Grupo</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C] min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#334155] block mb-2">
                  Estudiantes ({formData.student_ids.length} seleccionados)
                </label>
                <div className="border border-[#E2E8F0] rounded-md max-h-64 overflow-y-auto">
                  <div className="divide-y divide-[#E2E8F0]">
                    {students.map((student) => (
                      <label
                        key={student.user_id}
                        className="flex items-center gap-3 p-3 hover:bg-[#F8FAFC] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.student_ids.includes(student.user_id)}
                          onChange={() => toggleStudent(student.user_id)}
                          className="w-4 h-4 text-[#005A9C] border-[#E2E8F0] rounded focus:ring-[#005A9C]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#334155]">{student.name}</p>
                          <p className="text-xs text-[#64748B]">{student.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateGroup}
                  className="px-4 py-2 bg-[#005A9C] text-white rounded-md hover:bg-[#004578] transition-all flex items-center gap-2"
                >
                  <Check size={18} weight="bold" />
                  Guardar Cambios
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
                ¿Estás seguro de eliminar este grupo? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setGroupToDelete(null);
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteGroup}
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

export default Groups;
