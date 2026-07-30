import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSimulation, getCase, endSimulation, generateEvaluation, getMe } from '@/lib/api';
import { ArrowLeft, PaperPlaneRight, CheckCircle, Heartbeat, ThermometerSimple, BookOpen } from '@phosphor-icons/react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import InstructionsModal from '@/components/InstructionsModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function SimulationView() {
  const { sim_id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState('paciente');
  const [showInstructions, setShowInstructions] = useState(false);
  const messagesEndRef = useRef(null);
  const currentStreamRef = useRef('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      const [userRes, simRes] = await Promise.all([
        getMe(),
        getSimulation(sim_id)
      ]);
      
      setUser(userRes.data);
      setSimulation(simRes.data);
      
      const caseRes = await getCase(simRes.data.case_id);
      setCaseData(caseRes.data);
      
      setMessages(simRes.data.conversation);
      
      // Show instructions modal if case has instructions and no messages yet
      if (caseRes.data.instructions && simRes.data.conversation.length === 0) {
        setShowInstructions(true);
      }
    } catch (error) {
      console.error('Error loading simulation:', error);
      toast.error('Error al cargar simulación');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message immediately
    const newUserMsg = { role: 'student', content: userMessage, target: selectedParticipant };
    setMessages(prev => [...prev, newUserMsg]);
    
    setIsStreaming(true);
    currentStreamRef.current = '';
    
    // Add placeholder for AI response
    const aiMsgIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: selectedParticipant, content: '' }]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/simulations/${sim_id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          message: userMessage,
          target_participant: selectedParticipant
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentParticipant = selectedParticipant;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.participant) {
                currentParticipant = data.participant;
              }
              
              if (data.content) {
                currentStreamRef.current += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[aiMsgIndex] = { role: currentParticipant, content: currentStreamRef.current };
                  return updated;
                });
              }
              
              if (data.done) {
                break;
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      // Remove placeholder message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      currentStreamRef.current = '';
    }
  };

  const handleEndSimulation = async () => {
    // Note: window.confirm() doesn't work in sandboxed iframes (Emergent preview)
    // Removed confirmation dialog to allow button to work
    
    try {
      toast.loading('Finalizando simulación...');
      await endSimulation(sim_id);
      
      toast.success('Simulación finalizada. Ahora procede a evaluar el caso.');
      
      // Redirect to case evaluation form
      setTimeout(() => {
        navigate(`/case-evaluation/${sim_id}`);
      }, 1000);
    } catch (error) {
      console.error('Error ending simulation:', error);
      toast.error('Error al finalizar simulación: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A9C] mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando simulación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              data-testid="back-button"
              className="text-[#475569] hover:text-[#334155] transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#334155]" data-testid="simulation-title">
                {caseData?.title}
              </h1>
              <p className="text-sm text-[#64748B]">{caseData?.specialty} - {caseData?.difficulty}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInstructions(true)}
              data-testid="view-instructions-button"
              className="bg-[#F8FAFC] text-[#005A9C] px-4 py-2 rounded-md font-medium hover:bg-[#F1F5F9] transition-all duration-200 flex items-center gap-2 border border-[#E2E8F0]"
            >
              <BookOpen size={18} weight="duotone" />
              Ver Instrucciones
            </button>
            <button
              onClick={handleEndSimulation}
              data-testid="end-simulation-button"
              className="bg-[#005A9C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 flex items-center gap-2"
            >
              <CheckCircle size={18} weight="fill" />
              Finalizar Simulación
            </button>
          </div>
        </div>
      </div>

      {/* Three-pane layout: 3-6-3 grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Patient Context - 3 cols */}
          <div className="lg:col-span-3 space-y-4" data-testid="patient-context">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <h3 className="text-sm font-semibold text-[#334155] mb-3 flex items-center gap-2">
                <Heartbeat size={16} weight="duotone" />
                Perfil del Paciente
              </h3>
              {caseData?.patient_profile && (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-[#64748B]">Nombre</p>
                    <p className="text-[#334155] font-medium">{caseData.patient_profile.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Edad / Género</p>
                    <p className="text-[#334155]">{caseData.patient_profile.age} años / {caseData.patient_profile.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Motivo de consulta</p>
                    <p className="text-[#334155]">{caseData.patient_profile.chief_complaint}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <h3 className="text-sm font-semibold text-[#334155] mb-3 flex items-center gap-2">
                <ThermometerSimple size={16} weight="duotone" />
                Signos Vitales
              </h3>
              {caseData?.patient_profile?.vital_signs && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between" title="Frecuencia Cardíaca">
                    <span className="text-[#64748B]">Frecuencia Cardíaca:</span>
                    <span className="text-[#334155] font-medium">{caseData.patient_profile.vital_signs.hr} lpm</span>
                  </div>
                  <div className="flex justify-between" title="Presión Arterial">
                    <span className="text-[#64748B]">Presión Arterial:</span>
                    <span className="text-[#334155] font-medium">{caseData.patient_profile.vital_signs.bp} mmHg</span>
                  </div>
                  <div className="flex justify-between" title="Temperatura">
                    <span className="text-[#64748B]">Temperatura:</span>
                    <span className="text-[#334155] font-medium">{caseData.patient_profile.vital_signs.temp}°C</span>
                  </div>
                  <div className="flex justify-between" title="Frecuencia Respiratoria">
                    <span className="text-[#64748B]">Frecuencia Respiratoria:</span>
                    <span className="text-[#334155] font-medium">{caseData.patient_profile.vital_signs.rr} rpm</span>
                  </div>
                  <div className="flex justify-between" title="Saturación de Oxígeno">
                    <span className="text-[#64748B]">Saturación de Oxígeno:</span>
                    <span className="text-[#334155] font-medium">{caseData.patient_profile.vital_signs.spo2}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Chat - 6 cols */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-[#E2E8F0] flex flex-col" style={{ height: '70vh' }} data-testid="chat-container">
            {/* Team selector for interdisciplinary simulations */}
            {caseData?.simulation_type === 'equipo_interdisciplinario' && caseData?.team_members && (
              <div className="border-b border-[#E2E8F0] p-4">
                <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] mb-2">Hablar con:</p>
                <div className="flex gap-2 flex-wrap">
                  {caseData.team_members.map((member) => (
                    <button
                      key={member.role}
                      onClick={() => setSelectedParticipant(member.role)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        selectedParticipant === member.role
                          ? 'bg-[#005A9C] text-white'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                      }`}
                      data-testid={`select-${member.role}`}
                    >
                      {member.name} - {member.specialty}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-[#64748B]">
                  <p>{caseData?.simulation_type === 'equipo_interdisciplinario' 
                    ? 'Selecciona un miembro del equipo y comienza la conversación...' 
                    : 'Comienza la conversación con el paciente...'}
                  </p>
                </div>
              )}
              
              {messages.map((msg, idx) => {
                const isStudent = msg.role === 'student';
                const participantName = isStudent 
                  ? 'ESTUDIANTE' 
                  : caseData?.team_members?.find(m => m.role === msg.role)?.name?.toUpperCase() || 'PACIENTE';
                
                return (
                  <div 
                    key={idx}
                    className={`border-l-4 pl-4 py-2 ${
                      isStudent 
                        ? 'border-[#334155] bg-[#F1F5F9]' 
                        : 'border-[#005A9C] bg-[#FEF3C7]'
                    }`}
                    data-testid={`message-${idx}`}
                  >
                    <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] mb-1">
                      {participantName}
                    </p>
                    <div className="text-[#334155] leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#E2E8F0] p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe tu mensaje al paciente..."
                  disabled={isStreaming}
                  data-testid="chat-input"
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#005A9C] disabled:bg-[#F1F5F9] disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isStreaming || !inputMessage.trim()}
                  data-testid="send-message-button"
                  className="bg-[#005A9C] text-white px-6 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <PaperPlaneRight size={18} weight="fill" />
                  {isStreaming ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Objectives/Tips - 3 cols */}
          <div className="lg:col-span-3 space-y-4" data-testid="objectives-panel">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
              <h3 className="text-sm font-semibold text-[#334155] mb-3">Objetivos de Aprendizaje</h3>
              <ul className="space-y-2 text-sm text-[#475569]">
                {caseData?.learning_objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#005A9C] mt-1">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#ECFDF5] rounded-lg border border-[#10B981]/20 p-4">
              <h3 className="text-sm font-semibold text-[#10B981] mb-3">Consejos</h3>
              <ul className="space-y-2 text-sm text-[#10B981]/80">
                <li>• Presenta te profesionalmente</li>
                <li>• Haz preguntas abiertas</li>
                <li>• Valora integralmente al paciente</li>
                <li>• Muestra empatía y escucha activa</li>
                <li>• Registra hallazgos importantes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions Modal */}
      <InstructionsModal 
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        caseData={caseData}
      />
    </div>
  );
}

export default SimulationView;
