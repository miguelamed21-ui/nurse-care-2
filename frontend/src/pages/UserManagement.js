import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getMe } from '@/lib/api';
import api from '@/lib/api';
import { 
  Users, Plus, Pencil, Trash, UserCircle, ShieldCheck, 
  GraduationCap, ChalkboardTeacher, X 
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function UserManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student'
  });

  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);

      if (userData.role !== 'admin') {
        toast.error('Solo administradores pueden acceder a esta página');
        navigate('/dashboard');
        return;
      }

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    try {
      await api.post('/admin/users', formData);
      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', role: 'student' });
      loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/admin/users/${selectedUser.user_id}`, {
        name: formData.name,
        role: formData.role
      });
      toast.success('Usuario actualizado exitosamente');
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', role: 'student' });
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.detail || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await api.delete(`/admin/users/${userToDelete}`);
      toast.success('Usuario eliminado exitosamente');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const openEditModal = (userToEdit) => {
    setSelectedUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      role: userToEdit.role
    });
    setShowEditModal(true);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck size={20} weight="fill" className="text-[#DC2626]" />;
      case 'teacher':
        return <ChalkboardTeacher size={20} weight="fill" className="text-[#005A9C]" />;
      case 'student':
        return <GraduationCap size={20} weight="fill" className="text-[#10B981]" />;
      default:
        return <UserCircle size={20} weight="fill" className="text-[#64748B]" />;
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'teacher':
        return 'Docente';
      case 'student':
        return 'Estudiante';
      default:
        return role;
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {getRoleIcon(role)}
        {getRoleName(role)}
      </span>
    );
  };

  const filteredUsers = filterRole === 'all' 
    ? users 
    : users.filter(u => u.role === filterRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando usuarios...</p>
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
              <Users size={32} className="text-[#005A9C]" weight="duotone" />
              <div>
                <h1 className="text-3xl font-semibold text-[#334155]">
                  Gestión de Usuarios
                </h1>
                <p className="text-[#64748B] mt-1">
                  Administra usuarios, roles y permisos del sistema
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#005A9C] text-white px-6 py-3 rounded-md font-medium hover:bg-[#004578] transition-all flex items-center gap-2"
            >
              <Plus size={20} weight="bold" />
              Crear Usuario
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-6 bg-white border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#64748B]">Filtrar por rol:</span>
            <div className="flex gap-2">
              {['all', 'admin', 'teacher', 'student'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterRole === role
                      ? 'bg-[#005A9C] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {role === 'all' ? 'Todos' : getRoleName(role)}
                </button>
              ))}
            </div>
            <span className="ml-auto text-sm text-[#64748B]">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="p-8">
          <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B]">Usuario</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B]">Email</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-[#64748B]">Rol</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-[#64748B]">Fecha Creación</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-[#64748B]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.user_id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {userItem.picture ? (
                          <img
                            src={userItem.picture}
                            alt={userItem.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle size={40} weight="fill" className="text-[#CBD5E1]" />
                        )}
                        <div>
                          <p className="font-medium text-[#334155]">{userItem.name}</p>
                          <p className="text-xs text-[#64748B]">{userItem.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#475569]">{userItem.email}</td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        {getRoleBadge(userItem.role)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center text-sm text-[#64748B]">
                      {new Date(userItem.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(userItem)}
                          className="p-2 text-[#64748B] hover:text-[#005A9C] hover:bg-[#EFF6FF] rounded-md transition-all"
                          title="Editar usuario"
                        >
                          <Pencil size={18} weight="fill" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(userItem.user_id);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-all"
                          title="Eliminar usuario"
                          disabled={userItem.user_id === user?.user_id}
                        >
                          <Trash size={18} weight="fill" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', email: '', role: 'student' });
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-[#005A9C] text-white rounded-md hover:bg-[#004578] transition-all"
                >
                  Crear Usuario
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] text-[#64748B] cursor-not-allowed"
                />
                <p className="text-xs text-[#64748B] mt-1">El email no puede ser modificado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setFormData({ name: '', email: '', role: 'student' });
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditUser}
                  className="px-4 py-2 bg-[#005A9C] text-white rounded-md hover:bg-[#004578] transition-all"
                >
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
                ¿Estás seguro de eliminar este usuario? Esta acción:
              </p>
              <ul className="list-disc list-inside text-sm text-[#64748B] space-y-1">
                <li>Eliminará todas sus sesiones</li>
                <li>Eliminará todas sus simulaciones y evaluaciones</li>
                <li>Lo removerá de todos los grupos</li>
                <li>Eliminará sus asignaciones de casos</li>
                <li><strong>Esta acción no se puede deshacer</strong></li>
              </ul>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#475569] hover:bg-[#F1F5F9] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-[#DC2626] text-white rounded-md hover:bg-[#B91C1C] transition-all"
                >
                  Eliminar Usuario
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default UserManagement;
