import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { getCases, startSimulation, getMe } from '@/lib/api';
import api from '@/lib/api';
import { Play, Target, TrendUp, LockKey, Dice } from '@phosphor-icons/react';
import { toast } from 'sonner';

function CaseLibrary() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [assignedCases, setAssignedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await getMe();
      const userData = userRes.data;
      setUser(userData);
      
      // RBAC: Students see only assigned cases, Teachers/Admins see all
      if (userData.role === 'student') {
        const assignedRes = await api.get('/assignments/my-cases');
        const assignedCasesData = assignedRes.data;
        setAssignedCases(assignedCasesData);
        
        // Extract actual cases from assignments (for directed assignments)
        const casesFromAssignments = assignedCasesData
          .filter(item => item.case !== null)
          .map(item => ({
            ...item.case,
            assignment: item.assignment
          }));
        
        setCases(casesFromAssignments);
      } else {
        // Teachers and Admins see all cases
        const casesRes = await getCases();
        setCases(casesRes.data);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      toast.error('Error al cargar casos');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = async (caseId) => {
    try {
      const response = await startSimulation(caseId);
      toast.success('Simulación iniciada');
      navigate(`/simulation/${response.data.sim_id}`);
    } catch (error) {
      console.error('Error starting simulation:', error);
      if (error.response?.status === 403) {
        toast.error('No tienes acceso a este caso. Contacta a tu docente.');
      } else {
        toast.error('Error al iniciar simulación: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const filteredCases = cases.filter(c => {
    if (selectedDifficulty !== 'all' && c.difficulty !== selectedDifficulty) return false;
    if (selectedSpecialty !== 'all' && c.specialty !== selectedSpecialty) return false;
    return true;
  });

  // Check if user has random assignments (cases without specific case_id)
  const hasRandomAssignments = user?.role === 'student' && 
    assignedCases.some(item => item.case === null && item.assignment.assignment_mode === 'random');

  const specialties = [...new Set(cases.map(c => c.specialty))];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'fácil': return 'bg-[#ECFDF5] text-[#10B981]';
      case 'medio': return 'bg-[#FEF3C7] text-[#F59E0B]';
      case 'difícil': return 'bg-[#FEE2E2] text-[#EF4444]';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
          <h1 className="text-4xl font-semibold tracking-tighter text-[#334155]" data-testid="cases-title">
            {user?.role === 'student' ? 'Mis Casos Asignados' : 'Biblioteca de Casos Clínicos'}
          </h1>
          <p className="text-[#64748B] mt-1">
            {user?.role === 'student' 
              ? 'Casos clínicos asignados por tu docente' 
              : 'Selecciona un caso para iniciar una simulación'}
          </p>
        </div>

        {/* Student Info Banner */}
        {user?.role === 'student' && (
          <div className="px-8 py-4 bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] border-b border-[#3B82F6]/30">
            <div className="flex items-start gap-3">
              <LockKey size={20} className="text-[#3B82F6] mt-0.5" weight="duotone" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#334155]">
                  ℹ️ Solo puedes acceder a los casos asignados por tu docente
                  {cases.length === 0 && ' - Actualmente no tienes casos asignados'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-8 py-6 bg-white border-b border-[#E2E8F0]">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">Dificultad</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                data-testid="difficulty-filter"
                className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
              >
                <option value="all">Todas</option>
                <option value="fácil">Fácil</option>
                <option value="medio">Medio</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] block mb-2">Especialidad</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                data-testid="specialty-filter"
                className="px-4 py-2 border border-[#E2E8F0] rounded-md text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
              >
                <option value="all">Todas</option>
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cases Grid */}
        <div className="p-8">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#64748B]">No hay casos disponibles con estos filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCases.map(caseItem => (
                <div 
                  key={caseItem.case_id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-6 hover:shadow-md hover:-translate-y-[2px] transition-all duration-200"
                  data-testid={`case-card-${caseItem.case_id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getDifficultyColor(caseItem.difficulty)}`}>
                        {caseItem.difficulty}
                      </span>
                      {caseItem.simulation_type === 'equipo_interdisciplinario' && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#E6F0F9] text-[#2563EB]">
                          Equipo Interdisciplinario
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full">
                      {caseItem.specialty}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-[#334155] mb-2">{caseItem.title}</h3>
                  <p className="text-sm text-[#64748B] mb-4 line-clamp-3">{caseItem.scenario}</p>
                  
                  {caseItem.simulation_type === 'equipo_interdisciplinario' && caseItem.team_members && (
                    <div className="mb-4 pb-4 border-b border-[#E2E8F0]">
                      <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] mb-2">
                        Equipo
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {caseItem.team_members.map((member, idx) => (
                          <span key={idx} className="text-xs bg-[#F1F5F9] px-2 py-1 rounded">
                            {member.specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] mb-2 flex items-center gap-2">
                      <Target size={14} weight="duotone" />
                      Objetivos
                    </p>
                    <ul className="text-sm text-[#475569] space-y-1">
                      {caseItem.learning_objectives.slice(0, 2).map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#005A9C] mt-1">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                      {caseItem.learning_objectives.length > 2 && (
                        <li className="text-xs text-[#64748B] italic">+{caseItem.learning_objectives.length - 2} más...</li>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleStartSimulation(caseItem.case_id)}
                    data-testid={`start-case-${caseItem.case_id}`}
                    className="w-full bg-[#005A9C] text-white py-2 px-4 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Play size={18} weight="fill" />
                    Iniciar Simulación
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CaseLibrary;
