import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { getMe, getCompetencies } from '@/lib/api';
import { User, EnvelopeSimple, IdentificationBadge, ChartBar, Camera } from '@phosphor-icons/react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Profile() {
  const [user, setUser] = useState(null);
  const [competencies, setCompetencies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, compRes] = await Promise.all([
        getMe(),
        getCompetencies()
      ]);
      
      setUser(userRes.data);
      setCompetencies(compRes.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPEG, PNG o WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/api/auth/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await response.json();
      
      // Update user state with new picture
      setUser(prev => ({ ...prev, picture: data.picture }));
      toast.success('Foto de perfil actualizada');
      
      // Reload to update sidebar
      await loadData();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la foto de perfil');
    } finally {
      setUploadingAvatar(false);
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando perfil...</p>
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
          <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]" data-testid="profile-title">
            Mi Perfil
          </h1>
          <p className="text-[#64748B] mt-1">Información personal y progreso académico</p>
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Info */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <img 
                    src={user?.picture || 'https://via.placeholder.com/80'} 
                    alt={user?.name}
                    className="w-20 h-20 rounded-full object-cover"
                    data-testid="profile-avatar"
                  />
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 bg-[#005A9C] text-white p-2 rounded-full hover:bg-[#004578] transition-all duration-200 disabled:opacity-50 shadow-lg"
                    data-testid="change-avatar-button"
                    title="Cambiar foto de perfil"
                  >
                    <Camera size={16} weight="bold" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="avatar-file-input"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#334155]" data-testid="profile-name">{user?.name}</h2>
                  <p className="text-sm text-[#64748B] capitalize" data-testid="profile-role">{user?.role}</p>
                  {uploadingAvatar && (
                    <p className="text-xs text-[#005A9C] mt-1">Subiendo imagen...</p>
                  )}
                  {!uploadingAvatar && (
                    <p className="text-xs text-[#64748B] mt-1">Click en cámara para cambiar</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#F1F5F9] p-2 rounded-lg">
                    <EnvelopeSimple size={20} weight="duotone" className="text-[#475569]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Correo electrónico</p>
                    <p className="text-sm text-[#334155]" data-testid="profile-email">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#F1F5F9] p-2 rounded-lg">
                    <IdentificationBadge size={20} weight="duotone" className="text-[#475569]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">ID de Usuario</p>
                    <p className="text-sm text-[#334155] font-mono" data-testid="profile-user-id">{user?.user_id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Competency Summary */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h3 className="text-lg font-semibold text-[#334155] mb-4 flex items-center gap-2">
                <ChartBar size={20} weight="duotone" />
                Resumen de Competencias
              </h3>
              
              {competencies && competencies.simulations_count > 0 ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-[#FEF3C7] rounded-lg">
                    <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#F59E0B]">Puntaje IDEC</p>
                    <p className="text-4xl font-semibold text-[#005A9C] mt-2" data-testid="profile-idec">
                      {competencies.idec_score.toFixed(1)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] mb-2">Simulaciones Completadas</p>
                    <p className="text-2xl font-semibold text-[#334155]" data-testid="profile-sim-count">{competencies.simulations_count}</p>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0]">
                    <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] mb-3">Desglose de Competencias</p>
                    <div className="space-y-2">
                      {Object.entries(competencies.competencies).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize text-[#475569]">{key.replace('_', ' ')}</span>
                            <span className="font-semibold text-[#334155]">{value.toFixed(1)}</span>
                          </div>
                          <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                            <div 
                              className="bg-[#005A9C] h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[#64748B]">
                  <p>Completa simulaciones para ver tu progreso</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
