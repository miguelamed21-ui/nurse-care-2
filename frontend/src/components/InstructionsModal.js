import React from 'react';
import { X, BookOpen } from '@phosphor-icons/react';

function InstructionsModal({ isOpen, onClose, caseData }) {
  if (!isOpen || !caseData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005A9C] to-[#10B981] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            data-testid="close-instructions"
          >
            <X size={24} weight="bold" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={32} weight="duotone" />
            <h2 className="text-2xl font-bold">Instrucciones del Caso</h2>
          </div>
          <p className="text-white/90 text-sm">{caseData.title}</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {caseData.instructions ? (
            <div className="space-y-4">
              {caseData.instructions.split('\n\n').map((paragraph, idx) => {
                // Check if paragraph is a heading (starts with emoji + text in caps)
                if (paragraph.match(/^[📋🎯💡⚠️⏱️]/)) {
                  const [icon, ...rest] = paragraph.split(' ');
                  const text = rest.join(' ');
                  
                  return (
                    <div key={idx} className="mb-3">
                      <h3 className="text-lg font-semibold text-[#005A9C] mb-2 flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <span>{text.split(':')[0]}:</span>
                      </h3>
                      <div className="ml-8 text-[#334155] leading-relaxed">
                        {text.split(':').slice(1).join(':').split('\n').map((line, lineIdx) => {
                          if (line.trim().match(/^\d+\./)) {
                            // Numbered list
                            return <p key={lineIdx} className="mb-1 pl-2">{line.trim()}</p>;
                          } else if (line.trim().startsWith('-')) {
                            // Bullet list
                            return <p key={lineIdx} className="mb-1 pl-2">{line.trim()}</p>;
                          } else {
                            return <p key={lineIdx} className="mb-2">{line.trim()}</p>;
                          }
                        })}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <p key={idx} className="text-[#334155] leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[#64748B]">
              <p>No hay instrucciones específicas para este caso.</p>
              <p className="text-sm mt-2">Proceda con la valoración estándar del paciente.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E2E8F0] flex justify-between items-center">
          <p className="text-sm text-[#64748B]">
            Lea cuidadosamente antes de comenzar
          </p>
          <button
            onClick={onClose}
            data-testid="start-simulation-button"
            className="bg-[#005A9C] text-white px-6 py-2 rounded-md font-medium hover:bg-[#004578] transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Comenzar Simulación
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstructionsModal;
