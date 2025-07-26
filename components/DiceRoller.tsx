import React, { useState } from 'react';
import type { RollResult, DiceType, RollOutcome } from '../types';
import { D20Icon } from './Icons';

interface DiceRollerProps {
    history: RollResult[];
    onManualRoll: (sides: DiceType) => void;
}

const outcomeColors: Record<RollOutcome, string> = {
    'Sucesso Crítico': 'text-yellow-300',
    'Sucesso Bom': 'text-green-400',
    'Sucesso': 'text-cyan-400',
    'Fracasso': 'text-red-400',
    'Fracasso Crítico': 'text-red-600 font-bold',
};

export const DiceRoller: React.FC<DiceRollerProps> = ({ history, onManualRoll }) => {
  const [isOpen, setIsOpen] = useState(true);

  const dice: DiceType[] = [2, 4, 6, 8, 10, 12, 20, 100];

  const renderHistoryItem = (roll: RollResult) => {
    if (roll.type === 'attribute' && roll.outcome && roll.targetValue) {
      return (
        <div key={roll.id} className="text-sm mb-1 animate-fade-in border-b border-gray-800/50 pb-1">
            <div className="flex justify-between items-baseline">
                <span className="text-gray-400">Teste de {roll.source}</span>
                <span className="text-xl font-bold text-white">{roll.rollValue}</span>
            </div>
            <div className={`text-right text-xs ${outcomeColors[roll.outcome]}`}>
                {roll.outcome} (Alvo: {roll.targetValue})
            </div>
        </div>
      );
    }

    // Manual roll
    return (
      <div key={roll.id} className="flex justify-between items-center text-sm mb-1 animate-fade-in">
        <span className="text-gray-400">D{roll.source}:</span>
        <span className="text-xl font-bold text-white">{roll.rollValue}</span>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 text-gray-200">
      <div className={`bg-black/80 backdrop-blur-sm border border-gray-700/50 p-3 transition-all duration-300 ${isOpen ? 'w-64' : 'w-auto'}`}>
        <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left text-lg mb-2 uppercase tracking-wider flex items-center gap-2">
            <D20Icon className="w-5 h-5 flex-shrink-0 text-gray-200" />
            <span>Dados {isOpen ? '▼' : '▲'}</span>
        </button>
        {isOpen && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {dice.map(d => (
                <button
                  key={d}
                  onClick={() => onManualRoll(d)}
                  className="border border-gray-600 hover:bg-gray-700/50 p-1 text-sm transition-colors"
                >
                  D{d}
                </button>
              ))}
            </div>
            <div className="h-48 overflow-y-auto pr-2">
              {history.length === 0 ? (
                <p className="text-gray-600 text-center">...</p>
              ) : (
                history.map(renderHistoryItem)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};