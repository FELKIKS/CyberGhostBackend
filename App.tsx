




import React, { useState, useCallback, useMemo, ChangeEvent, useEffect, useRef } from 'react';
import axios from 'axios';
import type { Character, Stat, Attribute, Skill, Weapon, Archetype, ImageSet, InventoryItem, MaskForm, Ritual, MasterItemTemplate, MasterRitualTemplate, RollResult, DiceType, RollOutcome, Background, MasterAttributeTemplate, MasterSkillTemplate } from './types';
import { LogoIcon, D20Icon, ritualSignComponents, RitualSignSelector } from './components/Icons';
import { DiceRoller } from './components/DiceRoller';
import { Inventory } from './components/Inventory';

// --- API CLIENT ---
// Helper function to determine the API base URL
const getApiBaseUrl = () => {
    // For local development, use the localhost address
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001/api';
    }
    // For production, use the public URL of your Render backend service.
    // !!! IMPORTANT: REPLACE 'your-backend-service-name' WITH YOUR ACTUAL SERVICE NAME !!!
    return 'https://your-backend-service-name.onrender.com/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Character endpoints
const getCharacters = () => api.get<Character[]>('/characters');
const getCharacter = (id: string) => api.get<Character>(`/characters/${id}`);
const createCharacter = (characterData: Omit<Character, 'id'> | Character) => api.post<Character>('/characters', characterData);
const updateCharacter = (id: string, characterData: Omit<Character, 'id'> | Character) => api.put(`/characters/${id}`, characterData);
const deleteCharacter = (id: string) => api.delete(`/characters/${id}`);

// Master Data endpoints
const getMasterAttributes = () => api.get<MasterAttributeTemplate[]>('/master-data/attributes');
const saveMasterAttributes = (data: MasterAttributeTemplate[]) => api.put('/master-data/attributes', data);

const getMasterSkills = () => api.get<MasterSkillTemplate[]>('/master-data/skills');
const saveMasterSkills = (data: MasterSkillTemplate[]) => api.put('/master-data/skills', data);

const getMasterItemTemplates = () => api.get<MasterItemTemplate[]>('/master-data/items');
const saveMasterItemTemplates = (data: MasterItemTemplate[]) => api.put('/master-data/items', data);

const getMasterRitualTemplates = () => api.get<MasterRitualTemplate[]>('/master-data/rituals');
const saveMasterRitualTemplates = (data: MasterRitualTemplate[]) => api.put('/master-data/rituals', data);


// --- DEFAULT DATA & TEMPLATES ---

const initialCharacterTemplate: Omit<Character, 'id' | 'attributePoints' | 'skillPoints' | 'attributes' | 'skills'> = {
  personalDetails: {
    name: 'Novo Operativo', player: 'Jogador', occupation: 'Ocupação', age: 'Idade',
    gender: 'Gênero', birthplace: 'Local de Nascimento', residence: 'Localização Atual',
  },
  imageSet: {
    base: null,
    variants: [],
    wounded: null,
    critical: null,
  },
  background: {
    personalDescription: "Descreva a aparência e o equipamento do operativo...",
    characteristics: "",
    phobiasManias: [],
    importantPeople: [],
    valuableBelongings: [],
    importantPlaces: [],
  },
  archetype: 'Nenhum',
  stats: {
    life: { current: 20, max: 20 },
    sanity: { current: 80, max: 80 },
    occultism: { current: 5, max: 100 },
    effort: { current: 15, max: 15 },
  },
  movement: 7,
  size: 10,
  combat: [
    {
      id: 'unarmed_soco', name: 'Soco', type: 'Contusão', damage: '1d3', currentAmmo: 0, maxAmmo: 0,
      attacks: '1', range: 'Toque', malfunction: '-', area: '-', isUnarmed: true,
    },
  ],
  rituals: [],
  inventory: [],
  maskForm: null,
  money: 1000,
};

const maskFormsData: Record<MaskForm, { name: string; description: string; passive: string; weapon?: Omit<Weapon, 'id'>; rituals?: Omit<Ritual, 'id'>[] }> = {
    'Oni': {
        name: 'Forma de Oni',
        description: 'A máscara se contorce em uma face demoníaca com presas. Seus músculos se enrijecem e sua pele adquire um tom avermelhado.',
        passive: `Berserker: Quanto mais ódio (dano recebido), mais resistente você se torna.`,
        weapon: { name: 'Kanabo Demoníaco', type: 'Pesada', damage: '2d8+Força', attacks: '1', range: 'Corpo a corpo', currentAmmo: 0, maxAmmo: 0, malfunction: '-', area: 'Esmagamento', isMaskWeapon: true },
    },
    'Besta': {
        name: 'Forma de Besta',
        description: 'Seus traços se tornam animalescos, garras afiadas brotam de seus dedos e um rosnado gutural escapa de seus lábios.',
        passive: `Fúria: Quanto mais tempo em combate, mais dano você causa. Desvantagem: Pode atacar aliados se não houver inimigos.`,
        weapon: { name: 'Garras Ferais', type: 'Leve', damage: '1d10+Destreza', attacks: '2', range: 'Toque', currentAmmo: 0, maxAmmo: 0, malfunction: '-', area: 'Corte', isMaskWeapon: true },
    },
    'Ninja': {
        name: 'Forma de Ninja',
        description: 'A máscara se torna lisa e sem traços, e seu corpo é envolto em sombras que se movem com você.',
        passive: `Sombra Mortal: Ataques surpresa causam dano massivo. Ganha acesso a Ninjutsus.`,
        weapon: { name: 'Katana Sombria', type: 'Média', damage: '2d6', attacks: '1', range: 'Corpo a corpo', currentAmmo: 0, maxAmmo: 0, malfunction: '-', area: 'Corte preciso', isMaskWeapon: true },
        rituals: [
            { name: 'Ninjutsu: Invisibilidade', cost: '1 Ação', execution: 'Concentração', range: 'Pessoal', duration: 'Até atacar', description: 'Fica invisível, o próximo ataque surpresa tem dano bufado. Após atacar, gasta uma ação para se concentrar e ficar invisível novamente.', isMaskRitual: true }
        ]
    },
    'Cultista': {
        name: 'Forma de Cultista',
        description: 'Símbolos arcanos brilham em sua pele e a máscara ganha um terceiro olho que pulsa com uma luz sinistra. Você sussurra em uma língua morta.',
        passive: `Harmonia Paranormal: Através do Grimório da Loucura manifestado pela máscara, seus rituais são mais potentes e você ganha acesso a novos poderes.`,
        rituals: [
            { name: 'Breo', cost: '1 Ação', execution: 'Instantânea', range: 'Médio', duration: '1d4 turnos', description: 'Deixa a pessoa cega.', isMaskRitual: true },
            { name: 'Telecinese', cost: '1 Ação', execution: 'Concentração', range: 'Longo', duration: 'Mantido', description: 'Poderes psíquicos para mover objetos.', isMaskRitual: true },
            { name: 'Teleporte', cost: '1 Ação', execution: 'Instantânea', range: 'Pessoal/Toque', duration: 'Instantânea', description: 'Teleporta para um local conhecido.', isMaskRitual: true },
        ]
    },
    'Franco Atirador': {
        name: 'Forma de Franco Atirador',
        description: 'Seus olhos brilham com uma precisão sobrenatural e sua postura se torna perfeitamente estável, como uma estátua.',
        passive: `Olho Distante: Dano aumenta drasticamente com a distância e se o alvo não souber sua localização.`,
        weapon: { name: 'Rifle do Outro Lado', type: 'À Distância', damage: '3d10', attacks: '1', range: 'Extremo', currentAmmo: 1, maxAmmo: 1, malfunction: '1', area: 'Perfuração', isMaskWeapon: true },
        rituals: [
            { name: 'Poder: Manipulação de Patente', cost: 'Especial', execution: 'Instantânea', range: 'Pessoal', duration: 'Mantido', description: 'Pode manipular sua patente (de recruta a coronel), mudando seu uniforme e equipamento (incluindo a arma).', isMaskRitual: true },
            { name: 'Poder: Taps', cost: '1 Minuto', execution: 'Canalização', range: 'Auditivo (Time)', duration: 'Combate', description: 'Toca uma corneta. Remove todos os debuffs e efeitos físicos do time. O time não sente dor. Aliados caídos se levantam.', isMaskRitual: true },
        ]
    },
    'Duelista': {
        name: 'Forma de Duelista',
        description: 'Seu corpo se move com uma graça impossível e seus reflexos são afiados a um nível sobrenatural.',
        passive: `Estilo de Duelo: Ganha acesso a um repertório de habilidades de esgrima superiores.`,
        weapon: { name: 'Rapieira Espectral', type: 'Ágil', damage: '1d12', attacks: '1', range: 'Corpo a corpo', currentAmmo: 0, maxAmmo: 0, malfunction: '-', area: 'Estocada', isMaskWeapon: true },
        rituals: [
            { name: 'Habilidade: Rajadas de Estocadas', cost: '1 Ação', execution: 'Instantânea', range: 'Corpo a corpo', duration: 'Instantânea', description: 'Realiza um Dx de estocadas, com Dx de dano em cada acerto, rodando cada dado.', isMaskRitual: true },
            { name: 'Habilidade: Esquivas e Contra-Ataques', cost: 'Reação', execution: 'Especial', range: 'Pessoal', duration: 'Instantânea', description: 'Vantagens em desviar. Se conseguir, roda um dado para atacar novamente com vantagem no dano. Pode desarmar ou desequilibrar.', isMaskRitual: true },
            { name: 'Habilidade: Determinação de Mosqueteiro', cost: '1 Ação (Canalizar)', execution: 'Concentração', range: 'Pessoal', duration: 'Combate', description: 'A Rapieira brilha. Permite atacar 2 vezes por turno com mais velocidade e agilidade.', isMaskRitual: true },
            { name: 'Habilidade: Redirecionar Ataque', cost: 'Reação', execution: 'Especial', range: 'Pessoal', duration: 'Instantânea', description: 'Pode anular e redirecionar ataques físicos. Contra magias, tenta cortar/desviar; se falhar, toma metade do dano.', isMaskRitual: true },
        ]
    }
};

const tarotCardWeaponsData: Omit<Weapon, 'id' | 'isTarotCard'>[] = [
    { name: 'Hierofante', type: 'Arcana', damage: '1d6', currentAmmo: 0, maxAmmo: 0, attacks: '1', range: 'Médio', malfunction: '-', area: 'Projétil Místico' },
    { name: 'O Diabo', type: 'Arcana', damage: '1d8/turno', currentAmmo: 0, maxAmmo: 0, attacks: '1', range: 'Médio', malfunction: '-', area: 'Dano Contínuo (3 turnos)' },
];

const tarotCardRitualsData: Omit<Ritual, 'id' | 'isTarotRitual'>[] = [
    { name: 'O Enforcado', cost: '1 Ação', execution: 'Instantânea', range: 'Médio', duration: 'd3 turnos', description: 'Aprisiona um alvo.' },
    { name: 'A Sacerdotisa', cost: '1 Ação', execution: 'Instantânea', range: 'Toque', duration: 'Instantânea', description: 'Cura 1d8 de vida.' },
    { name: 'O Sol', cost: '1 Ação', execution: 'Instantânea', range: 'Curto', duration: '1 turno', description: 'Cria um clarão de luz que pode cegar.' },
];

// --- DATA HELPERS ---
const exportDataAsJson = (data: any, filename: string) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Falha ao exportar dados:", error);
        alert("Ocorreu um erro ao tentar exportar os dados.");
    }
};

// --- UTILITY HOOKS ---
function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  wait: number
) {
  const argsRef = useRef<A>();
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  function cleanup() {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }

  useEffect(() => {
    return cleanup;
  }, []);

  return function debouncedCallback(...args: A) {
    argsRef.current = args;
    cleanup();
    timeout.current = setTimeout(() => {
      if (argsRef.current) {
        callback(...argsRef.current);
      }
    }, wait);
  };
}


// --- IMAGE HELPERS ---
const getCurrentImage = (character: Character): { url: string | null; isDying: boolean } => {
  if (!character) return { url: null, isDying: false };
  const { imageSet, stats } = character;
  const lifePercent = stats.life.max > 0 ? (stats.life.current / stats.life.max) : 1;
  
  let url = imageSet.base;
  if (lifePercent <= 0.25 && imageSet.critical) {
    url = imageSet.critical;
  } else if (lifePercent <= 0.50 && imageSet.wounded) {
    url = imageSet.wounded;
  }

  const isDying = lifePercent <= 0.15;
  
  return { url, isDying };
};


// --- PAGE COMPONENTS ---

const LoginPage: React.FC<{ onLoginSuccess: () => void; }> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // This is a simple, non-secure login.
        // In a real app, this should be a call to a secure backend authentication endpoint.
        if (username === 'Felks' && password === 'exterminador1') {
            setError('');
            sessionStorage.setItem('isMasterLoggedIn', 'true');
            onLoginSuccess();
        } else {
            setError('CREDENCIAS INVÁLIDAS. ACESSO NEGADO.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 border border-gray-700/50 bg-black/70 backdrop-blur-sm w-full max-w-sm shadow-lg shadow-gray-900/50">
                <h1 className="text-3xl text-center uppercase tracking-[0.2em] mb-6 text-gray-100">ACESSO MESTRE</h1>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="USUÁRIO"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-black/50 border border-gray-600 px-3 py-2 text-lg focus:outline-none focus:border-gray-300 focus:bg-black/70 text-gray-200 placeholder:text-gray-500"
                        aria-label="Login"
                    />
                    <input
                        type="password"
                        placeholder="SENHA"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-black/50 border border-gray-600 px-3 py-2 text-lg focus:outline-none focus:border-gray-300 focus:bg-black/70 text-gray-200 placeholder:text-gray-500"
                        aria-label="Senha"
                    />
                    <button type="submit" className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        Autorizar
                    </button>
                    {error && <p className="text-red-400 text-center mt-2 animate-pulse">{error}</p>}
                </form>
            </div>
        </div>
    );
};

const MiniStatBar: React.FC<{ current: number, max: number, color: string }> = ({ current, max, color }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return (
        <div className="w-full bg-black/50 h-2 border border-black/80 overflow-hidden">
            <div className={`${color} h-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const GrantPointsModal: React.FC<{
    character: Character;
    onClose: () => void;
    onSave: (charId: string, attrPoints: number, skillPoints: number) => void;
}> = ({ character, onClose, onSave }) => {
    const [attrPoints, setAttrPoints] = useState(0);
    const [skillPoints, setSkillPoints] = useState(0);

    const handleSave = () => {
        onSave(character.id, attrPoints, skillPoints);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-black border border-gray-700 w-full max-w-md p-6 shadow-2xl shadow-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl uppercase tracking-widest">Conceder Pontos</h2>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>
                <p className="mb-6 text-gray-400">Adicione pontos para <span className="text-white font-bold">{character.personalDetails.name}</span>.</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-300 mb-1">Pontos de Atributo</label>
                        <input
                            type="number"
                            value={attrPoints}
                            onChange={(e) => setAttrPoints(parseInt(e.target.value) || 0)}
                            className="w-full bg-black/50 border border-gray-600 px-3 py-2 text-lg focus:outline-none focus:border-gray-300 text-gray-200"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-1">Pontos de Perícia</label>
                        <input
                            type="number"
                            value={skillPoints}
                            onChange={(e) => setSkillPoints(parseInt(e.target.value) || 0)}
                             className="w-full bg-black/50 border border-gray-600 px-3 py-2 text-lg focus:outline-none focus:border-gray-300 text-gray-200"
                        />
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end">
                    <button onClick={handleSave} className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-8">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const CreateItemModal: React.FC<{
    onClose: () => void;
    onSave: (newItem: MasterItemTemplate) => void;
}> = ({ onClose, onSave }) => {
    const [item, setItem] = useState<Omit<MasterItemTemplate, 'weapon'> & { isWeapon: boolean; weapon?: MasterItemTemplate['weapon'] }>({
        name: '', width: 1, height: 1, weight: 0.1, description: '', isWeapon: false,
    });

    const handleItemChange = (field: keyof Omit<MasterItemTemplate, 'weapon'>, value: string | number) => {
        setItem(prev => ({ ...prev, [field]: value }));
    };

    const handleWeaponChange = (field: keyof NonNullable<MasterItemTemplate['weapon']>, value: string | number) => {
        setItem(prev => ({
            ...prev,
            weapon: { ...prev.weapon, [field]: value }
        }));
    };

    const handleToggleWeapon = () => {
        setItem(prev => ({
            ...prev,
            isWeapon: !prev.isWeapon,
            weapon: !prev.isWeapon
                ? { type: 'Balística', damage: '1d6', currentAmmo: 10, maxAmmo: 10, attacks: '1', range: 'Médio', malfunction: '96', area: '-' }
                : undefined
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { isWeapon, ...itemToSave } = item;
        onSave(itemToSave);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-black border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl shadow-black">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl uppercase tracking-widest">Criar Novo Item</h2>
                    <button type="button" onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-4 space-y-4">
                    {/* Item Fields */}
                    <input type="text" placeholder="Nome do Item" value={item.name} onChange={e => handleItemChange('name', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" required />
                    <textarea placeholder="Descrição" value={item.description} onChange={e => handleItemChange('description', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200 h-20 resize-none" />
                    <div className="grid grid-cols-3 gap-4">
                        <input type="number" placeholder="Peso" value={item.weight} onChange={e => handleItemChange('weight', parseFloat(e.target.value) || 0)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" step="0.1" min="0" />
                        <input type="number" placeholder="Largura" value={item.width} onChange={e => handleItemChange('width', parseInt(e.target.value) || 1)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" min="1" />
                        <input type="number" placeholder="Altura" value={item.height} onChange={e => handleItemChange('height', parseInt(e.target.value) || 1)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" min="1" />
                    </div>

                    {/* Weapon Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={item.isWeapon} onChange={handleToggleWeapon} className="w-5 h-5 bg-gray-700 border-gray-500 text-cyan-400 focus:ring-cyan-500" />
                        <span className="text-gray-200">É uma arma?</span>
                    </label>

                    {/* Weapon Fields */}
                    {item.isWeapon && item.weapon && (
                        <div className="border border-gray-800 p-4 space-y-4 animate-fade-in">
                             <div className="grid grid-cols-2 gap-4">
                                 <input type="text" placeholder="Tipo (Ex: Corte, Balística)" value={item.weapon.type} onChange={e => handleWeaponChange('type', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                                 <input type="text" placeholder="Dano (Ex: 1d8)" value={item.weapon.damage} onChange={e => handleWeaponChange('damage', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <input type="number" placeholder="Mun. Atual" value={item.weapon.currentAmmo} onChange={e => handleWeaponChange('currentAmmo', parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                                <input type="number" placeholder="Mun. Máxima" value={item.weapon.maxAmmo} onChange={e => handleWeaponChange('maxAmmo', parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                                <input type="text" placeholder="Ataques" value={item.weapon.attacks} onChange={e => handleWeaponChange('attacks', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                                <input type="text" placeholder="Defeito" value={item.weapon.malfunction} onChange={e => handleWeaponChange('malfunction', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Alcance" value={item.weapon.range} onChange={e => handleWeaponChange('range', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                                <input type="text" placeholder="Área" value={item.weapon.area} onChange={e => handleWeaponChange('area', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700 text-right flex-shrink-0">
                    <button type="submit" className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-8">Salvar Item</button>
                </div>
            </form>
        </div>
    );
};

const RitualDetailsModal: React.FC<{ ritual: MasterRitualTemplate; onClose: () => void; }> = ({ ritual, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-black border border-yellow-400/20 w-full max-w-lg p-6 shadow-2xl shadow-yellow-400/10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-3xl uppercase tracking-widest text-yellow-300">{ritual.name}</h2>
                        <p className="text-gray-400 italic">{ritual.description}</p>
                    </div>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-40 h-40 flex-shrink-0 border border-yellow-400/30 p-2 text-yellow-400 bg-black">
                        <RitualSignSelector signKey={ritual.invocationSign} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-gray-300 flex-grow">
                        <div><strong className="text-gray-500 block uppercase text-xs">Custo:</strong> {ritual.cost}</div>
                        <div><strong className="text-gray-500 block uppercase text-xs">Execução:</strong> {ritual.execution}</div>
                        <div><strong className="text-gray-500 block uppercase text-xs">Alcance:</strong> {ritual.range}</div>
                        <div><strong className="text-gray-500 block uppercase text-xs">Duração:</strong> {ritual.duration}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RitualEditorModal: React.FC<{
    ritual?: MasterRitualTemplate;
    onClose: () => void;
    onSave: (ritual: MasterRitualTemplate) => void;
}> = ({ ritual, onClose, onSave }) => {
    const [editedRitual, setEditedRitual] = useState<MasterRitualTemplate>(
        ritual || { id: `master_${Date.now()}`, name: '', description: '', cost: '', execution: '', range: '', duration: '', invocationSign: 'fragmentado' }
    );

    const handleChange = (field: keyof Omit<MasterRitualTemplate, 'id'>, value: string) => {
        setEditedRitual(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedRitual);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-black border border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col p-6 shadow-2xl shadow-black">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl uppercase tracking-widest">{ritual ? 'Editar Ritual' : 'Criar Novo Ritual'}</h2>
                    <button type="button" onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-4 space-y-4">
                    <input type="text" placeholder="Nome do Ritual" value={editedRitual.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" required />
                    <textarea placeholder="Descrição" value={editedRitual.description} onChange={e => handleChange('description', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200 h-24 resize-none" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input type="text" placeholder="Custo" value={editedRitual.cost} onChange={e => handleChange('cost', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                        <input type="text" placeholder="Execução" value={editedRitual.execution} onChange={e => handleChange('execution', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                        <input type="text" placeholder="Alcance" value={editedRitual.range} onChange={e => handleChange('range', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                        <input type="text" placeholder="Duração" value={editedRitual.duration} onChange={e => handleChange('duration', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">Sinal de Invocação</label>
                        <div className="grid grid-cols-5 gap-2">
                            {Object.keys(ritualSignComponents).map(key => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleChange('invocationSign', key)}
                                    className={`w-full h-20 p-2 border-2 transition-colors ${editedRitual.invocationSign === key ? 'border-yellow-400 bg-yellow-900/30' : 'border-gray-700 bg-black/50 hover:border-gray-500'}`}
                                >
                                    <div className="text-yellow-400 w-full h-full">
                                      <RitualSignSelector signKey={key} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700 text-right flex-shrink-0">
                    <button type="submit" className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-8">Salvar Ritual</button>
                </div>
            </form>
        </div>
    );
};

const MasterAttributeModal: React.FC<{
    attribute?: MasterAttributeTemplate;
    onClose: () => void;
    onSave: (attr: MasterAttributeTemplate) => void;
}> = ({ attribute, onClose, onSave }) => {
    const [editedAttr, setEditedAttr] = useState<MasterAttributeTemplate>(
        attribute || { id: `attr_${Date.now()}`, name: '', description: '' }
    );

    const handleChange = (field: keyof Omit<MasterAttributeTemplate, 'id'>, value: string) => {
        setEditedAttr(prev => ({...prev, [field]: value}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedAttr);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-black border border-gray-700 w-full max-w-lg p-6 shadow-2xl shadow-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl uppercase tracking-widest">{attribute ? 'Editar Atributo' : 'Novo Atributo'}</h2>
                    <button type="button" onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome do Atributo" value={editedAttr.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" required />
                    <textarea placeholder="Descrição" value={editedAttr.description} onChange={e => handleChange('description', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200 h-24 resize-none" />
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700 text-right">
                    <button type="submit" className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-8">Salvar</button>
                </div>
            </form>
        </div>
    )
}

const MasterSkillModal: React.FC<{
    skill?: MasterSkillTemplate;
    onClose: () => void;
    onSave: (skill: MasterSkillTemplate) => void;
}> = ({ skill, onClose, onSave }) => {
     const [editedSkill, setEditedSkill] = useState<MasterSkillTemplate>(
        skill || { id: `skill_${Date.now()}`, name: '', description: '' }
    );

    const handleChange = (field: keyof Omit<MasterSkillTemplate, 'id'>, value: string) => {
        setEditedSkill(prev => ({...prev, [field]: value}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedSkill);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-black border border-gray-700 w-full max-w-lg p-6 shadow-2xl shadow-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl uppercase tracking-widest">{skill ? 'Editar Perícia' : 'Nova Perícia'}</h2>
                    <button type="button" onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome da Perícia" value={editedSkill.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200" required />
                    <textarea placeholder="Descrição" value={editedSkill.description} onChange={e => handleChange('description', e.target.value)} className="w-full bg-black/50 border border-gray-600 p-2 text-gray-200 h-24 resize-none" />
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700 text-right">
                    <button type="submit" className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-8">Salvar</button>
                </div>
            </form>
        </div>
    )
}

const DashboardPage: React.FC<{ onNavigate: (path: string) => void; onLogout: () => void; }> = ({ onNavigate, onLogout }) => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [masterItems, setMasterItems] = useState<MasterItemTemplate[]>([]);
    const [masterRituals, setMasterRituals] = useState<MasterRitualTemplate[]>([]);
    const [masterAttributes, setMasterAttributes] = useState<MasterAttributeTemplate[]>([]);
    const [masterSkills, setMasterSkills] = useState<MasterSkillTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [copiedInfo, setCopiedInfo] = useState<{ id: string, type: 'sheet' | 'portrait' } | null>(null);
    const [grantingPointsFor, setGrantingPointsFor] = useState<Character | null>(null);
    const [creatingItem, setCreatingItem] = useState(false);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'items' | 'rituals' | 'attributes' | 'skills'>('items');
    
    const [viewingRitual, setViewingRitual] = useState<MasterRitualTemplate | null>(null);
    const [editingRitual, setEditingRitual] = useState<MasterRitualTemplate | undefined>(undefined);
    const [editingAttribute, setEditingAttribute] = useState<MasterAttributeTemplate | undefined>(undefined);
    const [editingSkill, setEditingSkill] = useState<MasterSkillTemplate | undefined>(undefined);

    const fileImportRef = useRef<HTMLInputElement>(null);
    const [importType, setImportType] = useState<'character' | 'items' | 'rituals' | 'attributes' | 'skills' | null>(null);

    const handleDragStart = (e: React.DragEvent, item: MasterItemTemplate) => {
        const itemPayload: Omit<InventoryItem, 'id' | 'x' | 'y' | 'rotated' | 'containerId'> = {
            name: item.name,
            width: item.width,
            height: item.height,
            weight: item.weight,
            description: item.description,
        };
        e.dataTransfer.setData('application/json', JSON.stringify(itemPayload));
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setIsLoading(true);
                const [
                    charsRes,
                    itemsRes,
                    ritualsRes,
                    attrsRes,
                    skillsRes
                ] = await Promise.all([
                    getCharacters(),
                    getMasterItemTemplates(),
                    getMasterRitualTemplates(),
                    getMasterAttributes(),
                    getMasterSkills(),
                ]);
                setCharacters(charsRes.data);
                setMasterItems(itemsRes.data);
                setMasterRituals(ritualsRes.data);
                setMasterAttributes(attrsRes.data);
                setMasterSkills(skillsRes.data);
            } catch (error) {
                console.error("Falha ao buscar dados do mestre:", error);
                alert("Não foi possível carregar os dados do servidor. Verifique a conexão com o backend.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const handleCreateCharacter = async () => {
        const newCharacterData: Omit<Character, 'id'> = {
            ...JSON.parse(JSON.stringify(initialCharacterTemplate)),
            personalDetails: {
                ...initialCharacterTemplate.personalDetails,
                name: `Operativo #${(characters.length + 1).toString().padStart(3, '0')}`,
            },
            attributes: masterAttributes.map(attr => ({
                id: attr.id, name: attr.name, value: 10,
            })),
            skills: masterSkills.map(skill => ({
                id: skill.id, name: skill.name, value: 10, isFavorite: false,
            })),
            attributePoints: 0,
            skillPoints: 0,
        };
        
        try {
            const response = await createCharacter(newCharacterData);
            const newChar = response.data;
            setCharacters(prev => [...prev, newChar]);
            onNavigate(`#/character/${newChar.id}`);
        } catch (error) {
            console.error("Falha ao criar personagem:", error);
            alert("Erro ao criar novo personagem.");
        }
    };

    const handleDeleteCharacter = async (id: string, name: string) => {
        if (window.confirm(`Você tem certeza que deseja apagar o arquivo de "${name}"? Esta ação é irreversível.`)) {
            try {
                await deleteCharacter(id);
                setCharacters(prev => prev.filter(char => char.id !== id));
            } catch (error) {
                console.error("Falha ao excluir personagem:", error);
                alert("Erro ao excluir personagem.");
            }
        }
    };
    
    const handleCopyLink = (id: string, type: 'sheet' | 'portrait') => {
        const path = type === 'sheet' ? `#/character/${id}` : `#/portrait/${id}`;
        const url = `${window.location.origin}${window.location.pathname}${path}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedInfo({id, type});
            setTimeout(() => setCopiedInfo(null), 2000);
        }).catch(err => {
            console.error("Falha ao copiar o link: ", err);
            alert("Falha ao copiar o link.");
        });
    };
    
    const handleGrantPoints = async (charId: string, attrPoints: number, skillPoints: number) => {
        const character = characters.find(c => c.id === charId);
        if (!character) return;

        const updatedCharacter = {
            ...character,
            attributePoints: character.attributePoints + attrPoints,
            skillPoints: character.skillPoints + skillPoints,
        };
        const { id, ...charData } = updatedCharacter;
        
        try {
            await updateCharacter(id, charData);
            setCharacters(prev => prev.map(c => c.id === id ? updatedCharacter : c));
        } catch (error) {
            console.error("Falha ao conceder pontos:", error);
            alert("Erro ao salvar a concessão de pontos.");
        }
    };

    const handleSaveMasterData = async <T,>(
        data: T[],
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        saveFn: (data: T[]) => Promise<any>
    ) => {
        try {
            await saveFn(data);
            setter(data);
        } catch (error) {
            console.error("Falha ao salvar dados de mestre:", error);
            alert("Erro ao salvar dados de mestre. As alterações podem não ter sido persistidas.");
        }
    };

    const handleSaveNewMasterItem = (newItem: MasterItemTemplate) => {
        const updatedItems = [...masterItems, newItem];
        handleSaveMasterData(updatedItems, setMasterItems, saveMasterItemTemplates);
    };

    const handleSaveRitual = (ritualToSave: MasterRitualTemplate) => {
        const existingIndex = masterRituals.findIndex(r => r.id === ritualToSave.id);
        let updatedRituals;
        if (existingIndex > -1) {
            updatedRituals = masterRituals.map(r => r.id === ritualToSave.id ? ritualToSave : r);
        } else {
            updatedRituals = [...masterRituals, ritualToSave];
        }
        handleSaveMasterData(updatedRituals, setMasterRituals, saveMasterRitualTemplates);
        setEditingRitual(undefined);
    };

    const handleSaveMasterAttribute = (attrToSave: MasterAttributeTemplate) => {
        const existingIndex = masterAttributes.findIndex(a => a.id === attrToSave.id);
        const updatedAttributes = existingIndex > -1
            ? masterAttributes.map(a => a.id === attrToSave.id ? attrToSave : a)
            : [...masterAttributes, attrToSave];
        
        // Note: Logic to update all character sheets should now be handled by the backend.
        // We just save the master list here.
        handleSaveMasterData(updatedAttributes, setMasterAttributes, saveMasterAttributes);
        setEditingAttribute(undefined);
    };

    const handleDeleteMasterAttribute = (attrToDelete: MasterAttributeTemplate) => {
        if (!window.confirm(`Tem certeza que deseja apagar o atributo "${attrToDelete.name}"? O backend deve lidar com a remoção das fichas.`)) return;
        const updatedAttributes = masterAttributes.filter(a => a.id !== attrToDelete.id);
        handleSaveMasterData(updatedAttributes, setMasterAttributes, saveMasterAttributes);
    };
    
    const handleSaveMasterSkill = (skillToSave: MasterSkillTemplate) => {
        const existingIndex = masterSkills.findIndex(s => s.id === skillToSave.id);
        const updatedSkills = existingIndex > -1
            ? masterSkills.map(s => s.id === skillToSave.id ? skillToSave : s)
            : [...masterSkills, skillToSave];

        handleSaveMasterData(updatedSkills, setMasterSkills, saveMasterSkills);
        setEditingSkill(undefined);
    };
    
    const handleDeleteMasterSkill = (skillToDelete: MasterSkillTemplate) => {
        if (!window.confirm(`Tem certeza que deseja apagar a perícia "${skillToDelete.name}"? O backend deve lidar com a remoção das fichas.`)) return;
        const updatedSkills = masterSkills.filter(s => s.id !== skillToDelete.id);
        handleSaveMasterData(updatedSkills, setMasterSkills, saveMasterSkills);
    };

    const handleDrop = async (e: React.DragEvent, characterId: string) => {
        e.preventDefault();
        setDropTargetId(null);
        
        const character = characters.find(c => c.id === characterId);
        if(!character) return;

        try {
            const itemTemplate: Omit<InventoryItem, 'id' | 'x' | 'y' | 'rotated' | 'containerId'> = JSON.parse(e.dataTransfer.getData('application/json'));
            const { inventory } = character;

            const isGridOccupied = (x: number, y: number, width: number, height: number, items: InventoryItem[]): boolean => {
                for (const item of items) {
                    if (item.containerId) continue;
                    const itemWidth = item.rotated ? item.height : item.width;
                    const itemHeight = item.rotated ? item.width : item.height;
                    if (x < item.x + itemWidth && x + width > item.x && y < item.y + itemHeight && y + height > item.y) {
                        return true;
                    }
                }
                return false;
            };

            let foundSpot = false;
            let newItem: InventoryItem | undefined;
            for (let yPos = 0; yPos <= 10 - itemTemplate.height; yPos++) {
                for (let xPos = 0; xPos <= 10 - itemTemplate.width; xPos++) {
                    if (!isGridOccupied(xPos, yPos, itemTemplate.width, itemTemplate.height, inventory)) {
                        newItem = {
                            ...itemTemplate,
                            id: `master_${Date.now()}`,
                            x: xPos,
                            y: yPos,
                            rotated: false
                        };
                        foundSpot = true;
                        break;
                    }
                }
                if (foundSpot) break;
            }

            if (foundSpot && newItem) {
                const updatedCharacter = { ...character, inventory: [...character.inventory, newItem] };
                const { id, ...charData } = updatedCharacter;
                await updateCharacter(id, charData);
                setCharacters(prev => prev.map(c => c.id === id ? updatedCharacter : c));
            } else {
                alert(`Inventário de ${character.personalDetails.name} está cheio.`);
            }

        } catch (error) {
            console.error("Falha ao soltar o item:", error);
        }
    };
    
    // --- Import / Export ---
    const triggerImport = (type: 'character' | 'items' | 'rituals' | 'attributes' | 'skills') => {
        setImportType(type);
        fileImportRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !importType) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("O arquivo não pôde ser lido.");
                const data = JSON.parse(text);

                if (importType === 'character') {
                     if (!data.id || !data.personalDetails || !data.attributes) {
                        throw new Error("Arquivo JSON não parece ser uma ficha de personagem válida.");
                    }
                    const importedChar = data as Character;
                    const existingChar = characters.find(c => c.id === importedChar.id);
                    if (existingChar) {
                        if (window.confirm(`Já existe um personagem com este ID (${existingChar.personalDetails.name}). Deseja sobrescrevê-lo?`)) {
                            await updateCharacter(importedChar.id, importedChar);
                            setCharacters(prev => prev.map(c => c.id === importedChar.id ? importedChar : c));
                        }
                    } else {
                        await createCharacter(importedChar);
                        setCharacters(prev => [...prev, importedChar]);
                    }
                    alert(`Personagem "${importedChar.personalDetails.name}" importado com sucesso!`);
                } else if (importType === 'items') {
                    await handleSaveMasterData(data, setMasterItems, saveMasterItemTemplates);
                    alert(`${data.length} itens de mestre importados com sucesso!`);
                } else if (importType === 'rituals') {
                    await handleSaveMasterData(data, setMasterRituals, saveMasterRitualTemplates);
                    alert(`${data.length} rituais de mestre importados com sucesso!`);
                } else if (importType === 'attributes') {
                    await handleSaveMasterData(data, setMasterAttributes, saveMasterAttributes);
                    alert(`${data.length} atributos de mestre importados! O backend deve sincronizar as fichas.`);
                } else if (importType === 'skills') {
                    await handleSaveMasterData(data, setMasterSkills, saveMasterSkills);
                    alert(`${data.length} perícias de mestre importadas! O backend deve sincronizar as fichas.`);
                }
            } catch (error) {
                console.error("Falha na importação:", error);
                alert(`Erro ao importar arquivo: ${error instanceof Error ? error.message : 'Formato inválido.'}`);
            } finally {
                if(event.target) event.target.value = '';
                setImportType(null);
            }
        };
        reader.readAsText(file);
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">CONECTANDO AO SERVIDOR...</div>;
    }

    return (
        <div className="text-gray-200 min-h-screen p-4 md:p-8">
            <input type="file" ref={fileImportRef} onChange={handleFileImport} className="hidden" accept=".json,application/json" />
            <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <LogoIcon />
                    <div>
                        <h1 className="text-4xl uppercase tracking-[0.2em]">PAINEL DE CONTROLE</h1>
                        <p className="text-sm text-gray-500">//ARSENAL.LOG</p>
                    </div>
                </div>
                <button onClick={onLogout} className="border border-gray-700 text-gray-300 hover:bg-gray-800 px-4 py-2 mt-4 sm:mt-0 text-sm transition-colors uppercase">
                    SAIR
                </button>
            </header>
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <main className="xl:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl uppercase tracking-wider">Arquivos de Operativos</h2>
                         <div className="flex gap-2">
                            <button onClick={() => triggerImport('character')} className="border border-gray-700 text-gray-200 hover:bg-gray-800 px-4 py-2 text-sm transition-colors uppercase">
                                Importar Arquivo
                            </button>
                            <button onClick={handleCreateCharacter} className="border border-gray-700 text-gray-200 hover:bg-gray-800 px-4 py-2 text-sm transition-colors uppercase">
                                + Novo Arquivo
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {characters.length > 0 ? (
                            characters.map(char => {
                                const { url: currentImageUrl, isDying } = getCurrentImage(char);
                                const isDropTarget = dropTargetId === char.id;
                                return (
                                    <div 
                                        key={char.id} 
                                        className={`bg-black/70 backdrop-blur-sm border p-4 flex flex-col sm:flex-row gap-4 transition-all duration-200 ${isDropTarget ? 'border-cyan-400 border-2 shadow-lg shadow-cyan-500/20' : 'border-gray-700 hover:border-gray-500'}`}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragEnter={(e) => { e.preventDefault(); setDropTargetId(char.id); }}
                                        onDragLeave={() => setDropTargetId(null)}
                                        onDrop={(e) => handleDrop(e, char.id)}
                                    >
                                        <div className="flex-shrink-0 w-24 h-24 bg-black border border-gray-800 rounded-full mx-auto sm:mx-0">
                                            {currentImageUrl ? (
                                                <img src={currentImageUrl} alt={char.personalDetails.name} className={`w-full h-full object-cover rounded-full transition-all ${isDying ? 'filter brightness-50' : ''}`} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs text-center">SEM IMAGEM</div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-xl text-gray-100">{char.personalDetails.name}</h3>
                                            {char.archetype && char.archetype !== 'Nenhum' && (
                                                <p className="text-sm text-cyan-400 tracking-wider -mt-1">{char.archetype}</p>
                                            )}
                                            <p className="text-sm text-gray-500 mb-2">{char.personalDetails.occupation || 'Nenhuma Ocupação Atribuída'}</p>
                                            
                                            <div className="flex flex-col gap-1 text-xs mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-20 text-gray-400 flex-shrink-0">VITALIDADE:</span>
                                                    <div className="flex-grow"><MiniStatBar current={char.stats.life.current} max={char.stats.life.max} color="bg-green-500" /></div>
                                                    <span className="w-16 text-right text-gray-300">{char.stats.life.current}/{char.stats.life.max}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-20 text-gray-400 flex-shrink-0">ESTABILIDADE:</span>
                                                    <div className="flex-grow"><MiniStatBar current={char.stats.sanity.current} max={char.stats.sanity.max} color="bg-cyan-500" /></div>
                                                    <span className="w-16 text-right text-gray-300">{char.stats.sanity.current}/{char.stats.sanity.max}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-20 text-gray-400 flex-shrink-0">EXPOSIÇÃO:</span>
                                                    <div className="flex-grow"><MiniStatBar current={char.stats.occultism.current} max={char.stats.occultism.max} color="bg-fuchsia-500" /></div>
                                                    <span className="w-16 text-right text-gray-300">{char.stats.occultism.current}/{char.stats.occultism.max}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-20 text-gray-400 flex-shrink-0">ESFORÇO:</span>
                                                    <div className="flex-grow"><MiniStatBar current={char.stats.effort.current} max={char.stats.effort.max} color="bg-gray-400" /></div>
                                                    <span className="w-16 text-right text-gray-300">{char.stats.effort.current}/{char.stats.effort.max}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-2">
                                                <h4 className="text-sm text-gray-400 uppercase mb-1">Equipamento</h4>
                                                {char.inventory.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {char.inventory.map(item => (
                                                            <span key={item.id} className="bg-gray-800/70 text-gray-300 text-xs px-2 py-0.5 rounded-sm">{item.name}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-600 italic">Inventário vazio.</p>
                                                )}
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-2 items-center">
                                                <button onClick={() => onNavigate(`#/character/${char.id}`)} className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">ABRIR</button>
                                                <button onClick={() => setGrantingPointsFor(char)} className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">PONTOS</button>
                                                <button onClick={() => exportDataAsJson(char, `operative_${char.personalDetails.name.replace(/\s/g, '_')}.json`)} className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">EXPORTAR</button>
                                                <button onClick={() => handleCopyLink(char.id, 'sheet')} className={`border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors w-24 ${copiedInfo?.id === char.id && copiedInfo.type === 'sheet' ? 'text-white font-bold' : 'text-gray-300'}`}>{copiedInfo?.id === char.id && copiedInfo.type === 'sheet' ? 'COPIADO!' : 'COPIAR LINK'}</button>
                                                <button onClick={() => handleCopyLink(char.id, 'portrait')} className={`border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors w-32 ${copiedInfo?.id === char.id && copiedInfo.type === 'portrait' ? 'text-white font-bold' : 'text-gray-300'}`}>{copiedInfo?.id === char.id && copiedInfo.type === 'portrait' ? 'COPIADO!' : 'COPIAR RETRATO'}</button>
                                                <button onClick={() => handleDeleteCharacter(char.id, char.personalDetails.name)} className="border border-gray-600 text-gray-300 hover:text-red-400 hover:border-red-500 hover:bg-red-900/50 px-3 py-1 text-xs transition-colors">EXCLUIR</button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-center text-gray-600 p-8 col-span-full">NENHUM ARQUIVO DE OPERATIVO ENCONTRADO. CRIE UM NOVO OU IMPORTE UM ARQUIVO.</p>
                        )}
                    </div>
                </main>
                <aside className="xl:col-span-1">
                    <div className="sticky top-8 bg-black/70 backdrop-blur-sm border border-gray-700 p-4">
                        <div className="flex border-b border-gray-700 mb-4">
                            <button onClick={() => setActiveSidebarTab('items')} className={`flex-1 p-2 text-center uppercase tracking-wider transition-colors text-xs ${activeSidebarTab === 'items' ? 'text-white bg-gray-800/50' : 'text-gray-500 hover:bg-gray-800/30'}`}>Depósito</button>
                            <button onClick={() => setActiveSidebarTab('rituals')} className={`flex-1 p-2 text-center uppercase tracking-wider transition-colors text-xs ${activeSidebarTab === 'rituals' ? 'text-white bg-gray-800/50' : 'text-gray-500 hover:bg-gray-800/30'}`}>Grimório</button>
                            <button onClick={() => setActiveSidebarTab('attributes')} className={`flex-1 p-2 text-center uppercase tracking-wider transition-colors text-xs ${activeSidebarTab === 'attributes' ? 'text-white bg-gray-800/50' : 'text-gray-500 hover:bg-gray-800/30'}`}>Atributos</button>
                            <button onClick={() => setActiveSidebarTab('skills')} className={`flex-1 p-2 text-center uppercase tracking-wider transition-colors text-xs ${activeSidebarTab === 'skills' ? 'text-white bg-gray-800/50' : 'text-gray-500 hover:bg-gray-800/30'}`}>Perícias</button>
                        </div>

                        {activeSidebarTab === 'items' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl uppercase tracking-wider">Itens</h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => triggerImport('items')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Importar</button>
                                        <button onClick={() => exportDataAsJson(masterItems, 'cyberghost_master_items.json')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Exportar</button>
                                        <button onClick={() => setCreatingItem(true)} className="border border-gray-600 hover:bg-gray-800 px-2 py-0.5 text-md transition-colors leading-none">+</button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                   {masterItems.map((item, index) => (
                                       <div 
                                         key={index}
                                         draggable="true"
                                         onDragStart={(e) => handleDragStart(e, item)}
                                         className="border border-gray-700 bg-gray-900/50 p-2 cursor-grab active:cursor-grabbing hover:bg-gray-800"
                                       >
                                          <p className="font-bold text-gray-200">{item.name}</p>
                                          <p className="text-xs text-gray-400">{item.description}</p>
                                       </div>
                                   ))}
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === 'rituals' && (
                             <div>
                                <div className="flex justify-between items-center mb-4">
                                     <h2 className="text-xl uppercase tracking-wider">Rituais</h2>
                                     <div className="flex items-center gap-2">
                                        <button onClick={() => triggerImport('rituals')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Importar</button>
                                        <button onClick={() => exportDataAsJson(masterRituals, 'cyberghost_master_rituals.json')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Exportar</button>
                                        <button onClick={() => setEditingRitual({ id: '', name: '', description: '', cost: '', execution: '', range: '', duration: '', invocationSign: 'fragmentado' })} className="border border-gray-600 hover:bg-gray-800 px-2 py-0.5 text-md transition-colors leading-none">+</button>
                                    </div>
                                 </div>
                                 <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                    {masterRituals.map((ritual) => (
                                        <div key={ritual.id} className="border border-gray-700 bg-gray-900/50 p-3 flex gap-4 items-center group">
                                            <div className="w-12 h-12 flex-shrink-0 p-1 text-yellow-400">
                                                <RitualSignSelector signKey={ritual.invocationSign} />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-bold text-gray-200 text-lg">{ritual.name}</p>
                                                <p className="text-xs text-gray-400">{ritual.description}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setViewingRitual(ritual)} className="text-xs border border-gray-600 px-2 py-0.5 hover:bg-gray-800">Ver</button>
                                                <button onClick={() => setEditingRitual(ritual)} className="text-xs border border-gray-600 px-2 py-0.5 hover:bg-gray-800">Editar</button>
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                            </div>
                        )}

                        {activeSidebarTab === 'attributes' && (
                             <div>
                                <div className="flex justify-between items-center mb-4">
                                     <h2 className="text-xl uppercase tracking-wider">Atributos</h2>
                                     <div className="flex items-center gap-2">
                                        <button onClick={() => triggerImport('attributes')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Importar</button>
                                        <button onClick={() => exportDataAsJson(masterAttributes, 'cyberghost_master_attributes.json')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Exportar</button>
                                        <button onClick={() => setEditingAttribute({ id: '', name: '', description: '' })} className="border border-gray-600 hover:bg-gray-800 px-2 py-0.5 text-md transition-colors leading-none">+</button>
                                    </div>
                                 </div>
                                 <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                    {masterAttributes.map((attr) => (
                                        <div key={attr.id} className="border border-gray-700 bg-gray-900/50 p-3 flex gap-4 items-center group">
                                            <div className="flex-grow">
                                                <p className="font-bold text-gray-200 text-lg">{attr.name}</p>
                                                <p className="text-xs text-gray-400">{attr.description}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingAttribute(attr)} className="text-xs border border-gray-600 px-2 py-0.5 hover:bg-gray-800">Editar</button>
                                                <button onClick={() => handleDeleteMasterAttribute(attr)} className="text-xs border border-gray-600 px-2 py-0.5 hover:bg-red-900/50 hover:text-red-400">Apagar</button>
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                            </div>
                        )}

                        {activeSidebarTab === 'skills' && (
                             <div>
                                <div className="flex justify-between items-center mb-4">
                                     <h2 className="text-xl uppercase tracking-wider">Perícias</h2>
                                     <div className="flex items-center gap-2">
                                        <button onClick={() => triggerImport('skills')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Importar</button>
                                        <button onClick={() => exportDataAsJson(masterSkills, 'cyberghost_master_skills.json')} className="border border-gray-600 hover:bg-gray-800 px-3 py-1 text-xs transition-colors">Exportar</button>
                                        <button onClick={() => setEditingSkill({ id: '', name: '', description: '' })} className="border border-gray-600 hover:bg-gray-800 px-2 py-0.5 text-md transition-colors leading-none">+</button>
                                    </div>
                                 </div>
                                 <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                    {masterSkills.map((skill) => (
                                        <div key={skill.id} className="border border-gray-700 bg-gray-900/50 p-3 flex gap-4 items-center group">
                                            <div className="flex-grow">
                                                <p className="font-bold text-gray-200 text-lg">{skill.name}</p>
                                                <p className="text-xs text-gray-400">{skill.description}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingSkill(skill)} className="text-xs border border-gray-600 px-2 py-0.5 hover:bg-gray-800">Editar</button>
                                                <button onClick={() => handleDeleteMasterSkill(skill)} className="text-xs border border-gray-600 px-2 py-0.5 hover:bg-red-900/50 hover:text-red-400">Apagar</button>
                                            </div>
                                        </div>
                                    ))}
                                 </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
            {grantingPointsFor && (
                <GrantPointsModal 
                    character={grantingPointsFor}
                    onClose={() => setGrantingPointsFor(null)}
                    onSave={handleGrantPoints}
                />
            )}
             {creatingItem && (
                <CreateItemModal 
                    onClose={() => setCreatingItem(false)}
                    onSave={handleSaveNewMasterItem}
                />
            )}
            {viewingRitual && <RitualDetailsModal ritual={viewingRitual} onClose={() => setViewingRitual(null)} />}
            {editingRitual !== undefined && <RitualEditorModal ritual={editingRitual.id ? editingRitual : undefined} onSave={handleSaveRitual} onClose={() => setEditingRitual(undefined)} />}
            {editingAttribute !== undefined && <MasterAttributeModal attribute={editingAttribute.id ? editingAttribute : undefined} onSave={handleSaveMasterAttribute} onClose={() => setEditingAttribute(undefined)} />}
            {editingSkill !== undefined && <MasterSkillModal skill={editingSkill.id ? editingSkill : undefined} onSave={handleSaveMasterSkill} onClose={() => setEditingSkill(undefined)} />}
        </div>
    );
};

// --- PORTRAIT MODE FOR STREAMING ---
const PortraitPage: React.FC<{ characterId: string }> = ({ characterId }) => {
    const [character, setCharacter] = useState<Character | null>(null);

    useEffect(() => {
        const fetchCharacter = async () => {
            try {
                const response = await getCharacter(characterId);
                setCharacter(response.data);
            } catch (error) {
                console.error(`Falha ao buscar personagem ${characterId} para o modo retrato`, error);
                // Optionally show an error state in the portrait view
                setCharacter(null);
            }
        };

        fetchCharacter(); // Initial fetch
        const interval = setInterval(fetchCharacter, 2000); // Poll every 2 seconds

        document.body.classList.add('portrait-mode');
        return () => {
            clearInterval(interval);
            document.body.classList.remove('portrait-mode');
        };
    }, [characterId]);

    if (!character) {
        return <div className="flex items-center justify-center w-[600px] h-[300px] bg-transparent text-gray-200">CARREGANDO RETRATO...</div>;
    }
    
    const { url: currentImageUrl, isDying } = getCurrentImage(character);

    return (
        <div className="w-[600px] h-[300px] flex text-gray-200">
            {/* Left column: Image */}
            <div className="w-1/3 h-full flex-shrink-0 bg-black">
                 {currentImageUrl ? (
                    <img src={currentImageUrl} alt={character.personalDetails.name} className={`w-full h-full object-cover transition-all ${isDying ? 'filter brightness-50' : ''}`} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-lg text-center bg-black">SEM IMAGEM</div>
                )}
            </div>
            {/* Right column: Stats */}
            <div className="w-2/3 h-full flex flex-col items-center justify-center bg-black gap-2 p-2">
                <p className="text-6xl font-bold text-red-400 text-shadow-lg">
                    {character.stats.life.current}/{character.stats.life.max}
                </p>
                <p className="text-6xl font-bold text-sky-400 text-shadow-lg">
                    {character.stats.sanity.current}/{character.stats.sanity.max}
                </p>
                <p className="text-6xl font-bold text-gray-300 text-shadow-lg">
                    {character.stats.effort.current}/{character.stats.effort.max}
                </p>
            </div>
        </div>
    );
};

// --- IMAGE MANAGER COMPONENT ---
const ImageManager: React.FC<{
    imageSet: ImageSet;
    onSave: (newImageSet: ImageSet) => void;
    onClose: () => void;
}> = ({ imageSet, onSave, onClose }) => {
    const [localImageSet, setLocalImageSet] = useState(imageSet);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const newVariant = reader.result as string;
                    setLocalImageSet(prev => {
                        const updatedVariants = [...prev.variants, newVariant];
                        const newBase = prev.base === null ? newVariant : prev.base;
                        return { ...prev, variants: updatedVariants, base: newBase };
                    });
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSetBase = (variant: string) => {
        setLocalImageSet(prev => ({ ...prev, base: variant }));
    };
    
    const handleDeleteVariant = (variantToDelete: string) => {
        setLocalImageSet(prev => ({
            ...prev,
            variants: prev.variants.filter(v => v !== variantToDelete),
            base: prev.base === variantToDelete ? (prev.variants.filter(v => v !== variantToDelete)[0] || null) : prev.base,
            wounded: prev.wounded === variantToDelete ? null : prev.wounded,
            critical: prev.critical === variantToDelete ? null : prev.critical,
        }));
    };

    const handleAssignStateImage = (state: 'wounded' | 'critical', variant: string | null) => {
         setLocalImageSet(prev => ({ ...prev, [state]: variant }));
    };
    
    const handleSaveAndClose = () => {
        onSave(localImageSet);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-black border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col p-6 shadow-2xl shadow-black">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl uppercase tracking-widest">Gerenciador de Retratos</h2>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-white">&times;</button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    <div className="mb-6">
                         <h3 className="text-lg uppercase text-gray-400 mb-2">Galeria de Variantes</h3>
                         <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 mb-4">
                            {localImageSet.variants.map((variant, i) => (
                                <div key={i} className={`relative group border-2 ${localImageSet.base === variant ? 'border-gray-200 shadow-lg shadow-gray-400/20' : 'border-transparent'}`}>
                                    <img src={variant} className="w-full h-32 object-cover" alt={`Variant ${i+1}`} />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs p-1">
                                        <button onClick={() => handleSetBase(variant)} className="w-full text-center hover:bg-gray-800 p-1 rounded">Usar como Base</button>
                                        <button onClick={() => handleDeleteVariant(variant)} className="w-full text-center hover:bg-red-900/50 text-red-400 p-1 rounded mt-1">Excluir</button>
                                    </div>
                                </div>
                            ))}
                            <label className="w-full h-32 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-800/50 hover:border-gray-400 cursor-pointer transition-colors">
                                <span className="text-3xl">+</span>
                                <span>Adicionar</span>
                                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                            </label>
                         </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg uppercase text-gray-400 mb-2">Retrato Ferido <span className="text-gray-500 text-sm normal-case">(Ativado em &lt;= 50% vida)</span></h3>
                            <div className="flex gap-4 items-center">
                                <div className="w-32 h-32 bg-black border border-gray-700 flex-shrink-0">
                                    {localImageSet.wounded && <img src={localImageSet.wounded} className="w-full h-full object-cover" alt="Retrato Ferido"/>}
                                </div>
                                <div className="flex flex-col">
                                    <select 
                                        value={localImageSet.wounded || ''}
                                        onChange={(e) => handleAssignStateImage('wounded', e.target.value || null)}
                                        className="bg-black/50 border border-gray-600 p-2 mb-2 text-gray-200"
                                        disabled={localImageSet.variants.length === 0}
                                    >
                                        <option value="">Nenhum</option>
                                        {localImageSet.variants.map((v, i) => <option key={i} value={v}>Variante {i+1}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-500">Selecione uma imagem da sua galeria para ser usada quando a vida estiver baixa.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg uppercase text-gray-400 mb-2">Retrato Crítico <span className="text-gray-500 text-sm normal-case">(Ativado em &lt;= 25% vida)</span></h3>
                             <div className="flex gap-4 items-center">
                                <div className="w-32 h-32 bg-black border border-gray-700 flex-shrink-0">
                                    {localImageSet.critical && <img src={localImageSet.critical} className="w-full h-full object-cover" alt="Retrato Crítico"/>}
                                </div>
                                <div className="flex flex-col">
                                    <select 
                                        value={localImageSet.critical || ''}
                                        onChange={(e) => handleAssignStateImage('critical', e.target.value || null)}
                                        className="bg-black/50 border border-gray-600 p-2 mb-2 text-gray-200"
                                        disabled={localImageSet.variants.length === 0}
                                    >
                                        <option value="">Nenhum</option>
                                        {localImageSet.variants.map((v, i) => <option key={i} value={v}>Variante {i+1}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-500">Selecione uma imagem para ser usada quando a vida estiver em estado crítico.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-700 text-right flex-shrink-0">
                    <button onClick={handleSaveAndClose} className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-8">Salvar e Fechar</button>
                </div>
            </div>
        </div>
    );
};

const AttributeRollModal: React.FC<{ result: RollResult; onClose: () => void }> = ({ result, onClose }) => {
    if ((result.type !== 'attribute' && result.type !== 'sanity') || !result.outcome || result.targetValue === undefined) {
        return null;
    }

    const outcomeColors: Record<RollOutcome, { text: string; bg: string; border: string; shadow: string; }> = {
        'Sucesso Crítico': { text: 'text-yellow-300', bg: 'bg-yellow-900/30', border: 'border-yellow-400/50', shadow: 'shadow-yellow-400/20' },
        'Sucesso Bom': { text: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/50', shadow: 'shadow-green-500/20' },
        'Sucesso': { text: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-500/50', shadow: 'shadow-cyan-500/20' },
        'Fracasso': { text: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', shadow: 'shadow-red-500/20' },
        'Fracasso Crítico': { text: 'text-red-500 font-bold', bg: 'bg-red-900/50', border: 'border-red-600/70', shadow: 'shadow-red-600/30' },
    };

    const colors = outcomeColors[result.outcome];
    const iconValue = result.type === 'sanity' ? `d100: ${result.rollValue}` : result.rollValue;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className={`bg-black border ${colors.border} w-full max-w-sm p-8 shadow-2xl ${colors.shadow} text-center`}>
                <h2 className="text-2xl text-gray-400 uppercase tracking-widest">Teste de {result.source}</h2>
                
                <div className="my-8 flex justify-center items-center">
                    <D20Icon value={iconValue} className="w-40 h-40 text-gray-200" />
                </div>

                <h3 className={`text-4xl uppercase tracking-wider mb-2 ${colors.text}`}>{result.outcome}</h3>
                <p className="text-gray-500 mb-8">Rolagem: {result.rollValue} vs Alvo: {result.targetValue}</p>
                
                <button 
                    onClick={onClose}
                    className="border border-gray-600 hover:bg-gray-800 p-3 text-lg transition-all uppercase text-gray-200 px-12 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};


// --- MAIN CHARACTER SHEET & HELPERS ---
const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`border border-gray-800/80 p-4 bg-black/70 backdrop-blur-sm ${className}`}>
    <h2 className="text-xl uppercase mb-3 text-gray-200 tracking-widest">{title}</h2>
    {children}
  </div>
);

const personalDetailsLabels: { [key in keyof Character['personalDetails']]: string } = {
    name: "Nome",
    player: "Jogador",
    occupation: "Ocupação",
    age: "Idade",
    gender: "Gênero",
    birthplace: "Local de Nascimento",
    residence: "Residência",
};

const EditableField: React.FC<{ label: string; value: string; onSave: (value: string) => void; }> = ({ label, value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(currentValue);
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-baseline mb-2">
      <label className="w-1/3 text-gray-500 uppercase text-sm">{label}</label>
      {isEditing ? (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-b border-gray-600 focus:border-gray-300 outline-none w-2/3 text-gray-200"
          autoFocus
        />
      ) : (
        <span onClick={() => setIsEditing(true)} className="w-2/3 cursor-pointer hover:bg-gray-800/50 p-1 text-gray-200">
          {value || '...'}
        </span>
      )}
    </div>
  );
};

const EditableTextarea: React.FC<{ label: string; value: string; onSave: (value: string) => void; rows?: number }> = ({ label, value, onSave, rows = 3 }) => {
    const [currentValue, setCurrentValue] = useState(value);
    
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleSave = () => {
        onSave(currentValue);
    };

    return (
        <div className="flex flex-col mb-2">
            <label className="text-gray-400 uppercase text-sm mb-1">{label}</label>
            <textarea
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleSave}
                rows={rows}
                className="bg-black/50 border border-gray-700/80 focus:border-gray-500 outline-none w-full text-gray-200 p-2 text-sm resize-none"
            />
        </div>
    );
};

const EditableList: React.FC<{ title: string; items: { id: string; text: string }[]; onUpdate: (items: { id: string; text: string }[]) => void; }> = ({ title, items, onUpdate }) => {
    const handleItemChange = (id: string, newText: string) => {
        onUpdate(items.map(item => item.id === id ? { ...item, text: newText } : item));
    };

    const handleAddItem = () => {
        onUpdate([...items, { id: Date.now().toString(), text: '' }]);
    };

    const handleRemoveItem = (id: string) => {
        onUpdate(items.filter(item => item.id !== id));
    };
    
    return (
        <div>
            <h3 className="text-gray-400 uppercase text-sm mb-2">{title}</h3>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={item.text}
                            onChange={(e) => handleItemChange(item.id, e.target.value)}
                            className="flex-grow bg-black/50 border border-transparent hover:border-gray-700 focus:border-gray-500 p-1 rounded-sm focus:outline-none text-sm"
                            placeholder="Descreva..."
                        />
                        <button onClick={() => handleRemoveItem(item.id)} className="text-gray-500 hover:text-red-400 font-bold px-2 text-lg">&times;</button>
                    </div>
                ))}
            </div>
            <button onClick={handleAddItem} className="mt-2 text-xs border border-gray-600 hover:bg-gray-800 px-3 py-1 transition-colors">
                + Adicionar
            </button>
        </div>
    );
};


const StatusBar: React.FC<{ label: string; stat: Stat; onSave: (newStat: Stat) => void; color: string; labels: [string, string, string]; onTest?: () => void; }> = ({ label, stat, onSave, color, labels, onTest }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState(stat.current);
    const [max, setMax] = useState(stat.max);
    
    useEffect(() => {
        setCurrent(stat.current);
        setMax(stat.max);
    }, [stat]);

    const percentage = stat.max > 0 ? (stat.current / stat.max) * 100 : 0;

    const handleSave = () => {
        onSave({ current: Number(current), max: Number(max) });
        setIsEditing(false);
    }
    
    const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newCurrent = Math.min(stat.max, Math.max(0, Math.round((clickX / rect.width) * stat.max)));
        onSave({ ...stat, current: newCurrent });
    };

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                 <div className="flex items-baseline gap-3">
                    <h3 className="text-lg uppercase text-gray-200">{label}</h3>
                    {onTest && (
                        <button onClick={onTest} className="text-cyan-400 border border-cyan-400/50 px-2 text-xs hover:bg-cyan-900/50 transition-colors rounded-sm">
                            TESTE DE SANIDADE
                        </button>
                    )}
                </div>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input type="number" value={current} onChange={e => setCurrent(Number(e.target.value))} className="w-16 bg-black/50 border border-gray-700 text-center text-gray-200" />
                        <span className="text-gray-400">/</span>
                        <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="w-16 bg-black/50 border border-gray-700 text-center text-gray-200" />
                        <button onClick={handleSave} className="text-gray-300 text-xs">SALVAR</button>
                    </div>
                ) : (
                    <span className="cursor-pointer text-gray-200" onClick={() => setIsEditing(true)}>
                        {stat.current} / {stat.max}
                    </span>
                )}
            </div>
            <div className="w-full bg-black/50 border border-gray-700 h-6 p-0.5 cursor-pointer" onClick={handleBarClick}>
                <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{labels[0]}</span>
                <span>{labels[1]}</span>
                <span>{labels[2]}</span>
            </div>
        </div>
    );
};

const archetypes: { [key in Exclude<Archetype, 'Nenhum'>]: { name: string; description: string } } = {
    Combatente: {
        name: "Combatente",
        description: "Focado em combate físico e habilidades de luta, utilizando armas e técnicas de combate corpo a corpo."
    },
    Especialista: {
        name: "Especialista",
        description: "Habilidades que envolvem conhecimento, investigação e uso de ferramentas, como itens paranormais ou tecnologia."
    },
    Ocultista: {
        name: "Ocultista",
        description: "Capacidade de manipular energia paranormal, realizar rituais e usar poderes relacionados ao Outro Lado."
    }
};

const MaskFormSection: React.FC<{ form: MaskForm }> = ({ form }) => {
    const data = maskFormsData[form];
    if (!data) return null;

    return (
        <Section title={`FORMA ATIVA: ${data.name}`} className="border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10">
            <p className="text-fuchsia-300 italic mb-2">{data.description}</p>
            <p className="whitespace-pre-wrap"><span className="text-gray-400 uppercase text-sm">Poderes: </span>{data.passive}</p>
        </Section>
    );
};

const CharacterSheetPage: React.FC<{ characterId: string; onNavigate: (path: string) => void; isMaster: boolean; }> = ({ characterId, onNavigate, isMaster }) => {
    const [character, setCharacter] = useState<Character | null>(null);
    const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
    const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
    const [attributeRollResult, setAttributeRollResult] = useState<RollResult | null>(null);
    const [masterItems, setMasterItems] = useState<MasterItemTemplate[]>([]);

    const debouncedSave = useDebouncedCallback((charToSave: Character) => {
        if(charToSave){
            const { id, ...charData } = charToSave;
            updateCharacter(id, charData).catch(err => {
                console.error("Auto-save failed:", err);
                // Optionally notify user of save failure
            });
        }
    }, 1500);

    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            try {
                const [charRes, itemsRes] = await Promise.all([
                    getCharacter(characterId),
                    getMasterItemTemplates()
                ]);
                if (isMounted) {
                    setCharacter(charRes.data);
                    setMasterItems(itemsRes.data);
                }
            } catch (error) {
                console.error(`Falha ao buscar dados para o personagem ${characterId}`, error);
                if (isMounted) {
                    onNavigate('#/login'); // Or an error page
                }
            }
        };
        fetchInitialData();
        return () => { isMounted = false; };
    }, [characterId, onNavigate]);

    // This effect saves the character on any change.
    useEffect(() => {
        if (character) {
            debouncedSave(character);
        }
    }, [character, debouncedSave]);

    const handleCharacterUpdate = useCallback((updater: (char: Character) => Character) => {
        setCharacter(prev => (prev ? updater(prev) : null));
    }, []);

    // Centralized effect for handling all temporary items/forms
    useEffect(() => {
        if (!character) return;
        
        let nextCombat = character.combat.filter(w => !w.isMaskWeapon && !w.isTarotCard && !w.linkedItemId);
        let nextRituals = character.rituals.filter(r => !r.isMaskRitual && !r.isTarotRitual);
        
        // --- Handle Linked Inventory Weapons ---
        character.inventory.forEach(item => {
            const template = masterItems.find(t => t.name === item.name && t.weapon);
            if (template && template.weapon) {
                const existingWeapon = character.combat.find(w => w.linkedItemId === item.id);
                 if (!nextCombat.some(w => w.linkedItemId === item.id)) {
                    nextCombat.push({
                        id: `linked_${item.id}`,
                        name: template.name,
                        ...template.weapon,
                        currentAmmo: existingWeapon ? existingWeapon.currentAmmo : (template.weapon.maxAmmo || 0),
                        linkedItemId: item.id
                    });
                }
            }
        });

        // --- Handle Tarot Deck ---
        const hasTarotDeck = character.inventory.some(item => item.name.toLowerCase() === 'baralho de tarot');
        if (hasTarotDeck) {
            tarotCardWeaponsData.forEach(tw => {
                if (!nextCombat.some(w => w.name === tw.name && w.isTarotCard)) {
                    nextCombat.push({ ...tw, id: `tarot_w_${tw.name.replace(/\s/g, '')}`, isTarotCard: true });
                }
            });
            tarotCardRitualsData.forEach(tr => {
                 if (!nextRituals.some(r => r.name === tr.name && r.isTarotRitual)) {
                    nextRituals.push({ ...tr, id: `tarot_r_${tr.name.replace(/\s/g, '')}`, isTarotRitual: true });
                }
            });
        }

        // --- Handle Mask Form ---
        if (character.maskForm) {
            const formData = maskFormsData[character.maskForm];
            if (formData.weapon && !nextCombat.some(w => w.isMaskWeapon)) {
                nextCombat.push({ ...formData.weapon, id: `mask_w_${Date.now()}` });
            }
            if (formData.rituals) {
                formData.rituals.forEach(r => {
                    if (!nextRituals.some(nr => nr.name === r.name && nr.isMaskRitual)) {
                        nextRituals.push({ ...r, id: `mask_r_${r.name.replace(/\s/g, '')}_${Date.now()}`});
                    }
                });
            }
        }
        
        if (character.maskForm && character.stats.occultism.current < character.stats.occultism.max) {
             handleCharacterUpdate(c => ({ ...c, maskForm: null }));
            return;
        }

        const currentCombatIds = character.combat.map(c => c.id).sort().join(',');
        const nextCombatIds = nextCombat.map(c => c.id).sort().join(',');
        const currentRitualIds = character.rituals.map(r => r.id).sort().join(',');
        const nextRitualIds = nextRituals.map(r => r.id).sort().join(',');

        if (currentCombatIds !== nextCombatIds || currentRitualIds !== nextRitualIds) {
            handleCharacterUpdate(c => ({
                ...c,
                combat: nextCombat,
                rituals: nextRituals
            }));
        }

    }, [character, masterItems, handleCharacterUpdate]);


    const handleMaskClick = useCallback(() => {
        if (!character || character.maskForm) return;

        const roll = Math.floor(Math.random() * 6);
        const formKeys = Object.keys(maskFormsData) as MaskForm[];
        const newForm = formKeys[roll];
        
        handleCharacterUpdate(c => ({ ...c, maskForm: newForm }));

    }, [character, handleCharacterUpdate]);


    const handleImageSetSave = (newImageSet: ImageSet) => {
        handleCharacterUpdate(c => ({...c, imageSet: newImageSet }));
    };

    const handleDetailChange = (field: keyof Character['personalDetails'], value: string) => 
        handleCharacterUpdate(c => ({ ...c, personalDetails: { ...c.personalDetails, [field]: value } }));

    const handleBackgroundChange = (field: keyof Character['background'], value: any) =>
        handleCharacterUpdate(c => ({ ...c, background: { ...c.background, [field]: value } }));

    const handleStatChange = (field: keyof Character['stats'], value: Stat) =>
        handleCharacterUpdate(c => ({ ...c, stats: { ...c.stats, [field]: value } }));

    const handleAttributeChange = (index: number, value: number) => 
        handleCharacterUpdate(c => {
            const newAttributes = [...c.attributes];
            const oldAttribute = newAttributes[index];
            const cost = value - oldAttribute.value;
            
            if (cost > c.attributePoints) {
                alert(`Pontos de atributo insuficientes! Necessário: ${cost}, Disponível: ${c.attributePoints}`);
                return c;
            }

            newAttributes[index] = { ...newAttributes[index], value };
            return { ...c, attributes: newAttributes, attributePoints: c.attributePoints - cost };
        });
        
    const handleManualRoll = (sides: DiceType) => {
        const result = Math.floor(Math.random() * sides) + 1;
        const newRoll: RollResult = {
            id: Date.now(),
            type: 'manual',
            source: String(sides),
            rollValue: result,
        };
        setRollHistory(prev => [newRoll, ...prev.slice(0, 19)]);
    };
    
    const handleAttributeRoll = (attribute: Attribute) => {
        const roll = Math.floor(Math.random() * 20) + 1;
        let outcome: RollOutcome;

        if (roll === 1) outcome = 'Sucesso Crítico';
        else if (roll === 20) outcome = 'Fracasso Crítico';
        else if (roll <= attribute.value / 2) outcome = 'Sucesso Bom';
        else if (roll <= attribute.value) outcome = 'Sucesso';
        else outcome = 'Fracasso';
        
        const newRoll: RollResult = {
            id: Date.now(),
            type: 'attribute',
            source: attribute.name,
            rollValue: roll,
            targetValue: attribute.value,
            outcome: outcome,
        };
        setRollHistory(prev => [newRoll, ...prev.slice(0, 19)]);
        setAttributeRollResult(newRoll);
    };

    const handleSanityRoll = () => {
        if (!character) return;
        const roll = Math.floor(Math.random() * 100) + 1;
        const target = character.stats.sanity.current;
        let outcome: RollOutcome;

        if (roll <= 5) outcome = 'Sucesso Crítico';
        else if (roll >= 96) outcome = 'Fracasso Crítico';
        else if (roll <= target) outcome = 'Sucesso';
        else outcome = 'Fracasso';
        
        const newRoll: RollResult = {
            id: Date.now(),
            type: 'sanity',
            source: 'Sanidade',
            rollValue: roll,
            targetValue: target,
            outcome: outcome,
        };
        setRollHistory(prev => [newRoll, ...prev.slice(0, 19)]);
        setAttributeRollResult(newRoll);
    };


    const handleSkillChange = (id: string, value: number) =>
        handleCharacterUpdate(c => {
            const oldSkill = c.skills.find(skill => skill.id === id);
            if (!oldSkill) return c;
            
            const cost = value - oldSkill.value;
            
            if (cost > c.skillPoints) {
                alert(`Pontos de perícia insuficientes! Necessário: ${cost}, Disponível: ${c.skillPoints}`);
                return c;
            }
            
            return {
                ...c,
                skills: c.skills.map(skill => skill.id === id ? { ...skill, value } : skill),
                skillPoints: c.skillPoints - cost,
            };
        });

    const toggleSkillFavorite = (id: string) =>
        handleCharacterUpdate(c => ({
            ...c,
            skills: c.skills.map(skill => skill.id === id ? { ...skill, isFavorite: !skill.isFavorite } : skill)
        }));

    const handleCombatChange = (index: number, field: keyof Weapon, value: string | number) => 
        handleCharacterUpdate(c => {
            const newCombat = [...c.combat];
            const weaponToUpdate = { ...newCombat[index] };
            // @ts-ignore
            weaponToUpdate[field] = value;
            newCombat[index] = weaponToUpdate;
            return { ...c, combat: newCombat };
        });

    const addWeapon = () => 
        handleCharacterUpdate(c => ({ ...c, combat: [...c.combat, {
            id: Date.now().toString(), name: 'Nova Arma', type: '', damage: '', currentAmmo: 0, maxAmmo: 0,
            attacks: '1', range: '', malfunction: '', area: '',
        }]}));

    const removeWeapon = (id: string) => 
        handleCharacterUpdate(c => ({ ...c, combat: c.combat.filter(w => w.id !== id) }));

    const handleRitualChange = (index: number, field: keyof Ritual, value: string) =>
        handleCharacterUpdate(c => {
            const newRituals = [...c.rituals];
            const ritualToUpdate = { ...newRituals[index] };
            // @ts-ignore
            ritualToUpdate[field] = value;
            newRituals[index] = ritualToUpdate;
            return { ...c, rituals: newRituals };
        });
    
    const addRitual = () =>
        handleCharacterUpdate(c => ({ ...c, rituals: [...c.rituals, {
            id: Date.now().toString(), name: 'Novo Ritual', cost: '', execution: '',
            range: '', duration: '', description: ''
        }]}));

    const removeRitual = (id: string) =>
        handleCharacterUpdate(c => ({ ...c, rituals: c.rituals.filter(r => r.id !== id) }));

    const maxWeight = useMemo(() => {
        if (!character) return 0;
        const strength = character.attributes.find(a => a.name === 'Força')?.value || 10;
        return strength * 2.5;
    }, [character]);

    const totalWeight = useMemo(() => {
        if (!character) return 0;
        const backpacks = character.inventory.filter(item =>
            item.name.toLowerCase() === 'mochila' && item.weight === 3 && item.width === 6 && item.height === 10
        );
        const backpackIds = backpacks.map(b => b.id);

        return character.inventory.reduce((sum, item) => {
            if (item.containerId && backpackIds.includes(item.containerId)) {
                return sum + (item.weight * 0.5); // 50% less weight
            }
            return sum + item.weight;
        }, 0);
    }, [character]);

    if (!character) {
        return <div className="flex items-center justify-center min-h-screen">CARREGANDO ARQUIVO DO SERVIDOR...</div>;
    }
    
    const favoriteSkills = character.skills.filter(s => s.isFavorite);
    const { url: currentImageUrl, isDying } = getCurrentImage(character);

    return (
        <div className="text-gray-200 min-h-screen p-4 md:p-8">
            <header className="flex flex-col sm:flex-row items-center justify-between w-full mb-8">
                <div className="flex-1 flex justify-start">
                    {isMaster && (
                        <button 
                            onClick={() => onNavigate('#/dashboard')} 
                            className="border border-gray-600 hover:bg-gray-800 px-4 py-2 text-sm transition-colors"
                        >
                            &larr; VOLTAR AO PAINEL DE CONTROLE
                        </button>
                    )}
                </div>
                <div className="flex flex-col items-center text-center">
                    <LogoIcon />
                    <h1 className="text-4xl uppercase tracking-[0.2em] mt-2">Perfil do Operativo</h1>
                    <p className="text-sm text-gray-500">//ARSENAL.LOG</p>
                </div>
                <div className="flex-1 flex justify-end">
                     <button 
                        onClick={() => exportDataAsJson(character, `operative_${character.personalDetails.name.replace(/\s/g, '_')}.json`)} 
                        className="border border-gray-600 hover:bg-gray-800 px-4 py-2 text-sm transition-colors"
                    >
                        EXPORTAR FICHA
                    </button>
                </div>
            </header>
            
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <Section title="DADOS PESSOAIS">
                        {Object.entries(character.personalDetails).map(([key, value]) => (
                            <EditableField 
                                key={key} 
                                label={personalDetailsLabels[key as keyof typeof personalDetailsLabels]}
                                value={value} 
                                onSave={(newValue) => handleDetailChange(key as keyof Character['personalDetails'], newValue)}
                            />
                        ))}
                    </Section>
                    
                    <Section title={`ATRIBUTOS (${character.attributePoints} PONTOS)`}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6 mb-6">
                            {character.attributes.map((attr, index) => (
                                <div key={attr.id} className="text-center">
                                    <div className="flex justify-center items-center">
                                        <button
                                            onClick={() => handleAttributeRoll(attr)}
                                            className="group relative transition-transform hover:scale-105 focus:outline-none"
                                            aria-label={`Testar ${attr.name}`}
                                        >
                                            <D20Icon value={attr.value}/>
                                            <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-80 flex items-center justify-center transition-opacity">
                                                 <span className="text-white text-xs">TESTAR</span>
                                            </div>
                                        </button>
                                    </div>
                                    <span className="uppercase text-sm text-gray-300">{attr.name}</span>
                                    <input 
                                        type="number"
                                        value={attr.value}
                                        onChange={(e) => handleAttributeChange(index, parseInt(e.target.value) || 0)}
                                        className="w-16 bg-transparent border-b border-gray-700 text-center focus:outline-none focus:border-gray-300 mt-1 text-gray-200"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <EditableField label="Movimento" value={String(character.movement)} onSave={(v) => handleCharacterUpdate(c => ({...c, movement: Number(v)}))}/>
                            <EditableField label="Tamanho" value={String(character.size)} onSave={(v) => handleCharacterUpdate(c => ({...c, size: Number(v)}))}/>
                        </div>
                    </Section>

                    <Section title="COMBATE">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-gray-700 text-gray-300">
                                        {['Nome', 'Tipo', 'Dano', 'Mun. Atual', 'Ataques', 'Alcance', 'Defeito', ''].map(h => <th key={h} className="p-2 uppercase font-normal tracking-wider">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {character.combat.map((weapon, index) => {
                                        const isImmutable = weapon.isMaskWeapon || weapon.isTarotCard || !!weapon.linkedItemId || weapon.isUnarmed;
                                        const rowClass = `${weapon.isMaskWeapon ? 'text-fuchsia-300' : ''} ${weapon.isTarotCard ? 'text-amber-400' : ''}`;
                                        return (
                                            <tr key={weapon.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${rowClass}`}>
                                                <td className="p-1"><input type="text" value={weapon.name} onChange={e => handleCombatChange(index, 'name', e.target.value)} className="bg-transparent w-full focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                                <td className="p-1"><input type="text" value={weapon.type} onChange={e => handleCombatChange(index, 'type', e.target.value)} className="bg-transparent w-20 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable}/></td>
                                                <td className="p-1"><input type="text" value={weapon.damage} onChange={e => handleCombatChange(index, 'damage', e.target.value)} className="bg-transparent w-16 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable}/></td>
                                                <td className="p-1"><input type="number" value={weapon.currentAmmo} onChange={e => handleCombatChange(index, 'currentAmmo', Number(e.target.value))} className="bg-transparent w-16 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={weapon.isMaskWeapon || weapon.isTarotCard || weapon.isUnarmed}/></td>
                                                <td className="p-1"><input type="text" value={weapon.attacks} onChange={e => handleCombatChange(index, 'attacks', e.target.value)} className="bg-transparent w-12 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable}/></td>
                                                <td className="p-1"><input type="text" value={weapon.range} onChange={e => handleCombatChange(index, 'range', e.target.value)} className="bg-transparent w-16 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable}/></td>
                                                <td className="p-1"><input type="text" value={weapon.malfunction} onChange={e => handleCombatChange(index, 'malfunction', e.target.value)} className="bg-transparent w-16 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable}/></td>
                                                <td className="p-1 text-center"><button onClick={() => !isImmutable && removeWeapon(weapon.id)} className={`font-bold ${isImmutable ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-red-400'}`}>X</button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={addWeapon} className="mt-4 border border-gray-600 hover:bg-gray-800 px-4 py-1 text-sm transition-colors">Adicionar Arma</button>
                    </Section>

                    <Section title={`LISTA DE PERÍCIAS (${character.skillPoints} PONTOS)`}>
                        <div className="space-y-2">
                            {character.skills.map((skill) => (
                                <div key={skill.id} className="flex items-center gap-2 group">
                                    <button onClick={() => toggleSkillFavorite(skill.id)} className="text-lg" aria-label="Marcar como favorita">
                                        {skill.isFavorite ? '★' : '☆'}
                                    </button>
                                    <input 
                                        type="text" 
                                        value={skill.name} 
                                        className="flex-grow bg-black/50 border border-transparent p-1 rounded-sm focus:outline-none cursor-default"
                                        disabled
                                    />
                                    <input 
                                        type="number" 
                                        value={skill.value} 
                                        onChange={(e) => handleSkillChange(skill.id, parseInt(e.target.value) || 0)}
                                        className="w-20 bg-black/50 border border-transparent hover:border-gray-700 focus:border-gray-500 p-1 rounded-sm focus:outline-none text-center"
                                    />
                                </div>
                            ))}
                        </div>
                    </Section>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row gap-6 bg-black/70 backdrop-blur-sm border border-gray-800 p-4">
                        <div className="flex-shrink-0 mx-auto">
                           <div className="w-40 h-40 border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center text-gray-500 cursor-pointer relative group bg-black/50" onClick={() => setIsImageManagerOpen(true)}>
                                {currentImageUrl ? (
                                    <img src={currentImageUrl} alt="Personagem" className={`w-full h-full object-cover rounded-full transition-all ${isDying ? 'filter brightness-50' : ''}`} />
                                ) : (
                                    <span className="text-center text-sm">GERENCIAR RETRATOS</span>
                                )}
                                <div className="absolute inset-0 w-full h-full bg-black/70 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-gray-200">Alterar</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow">
                            <StatusBar label="Vitalidade" stat={character.stats.life} onSave={v => handleStatChange('life', v)} color="bg-green-500" labels={['Crítico', 'Inconsciente', 'Morrendo']} />
                            <StatusBar label="Estabilidade" stat={character.stats.sanity} onSave={v => handleStatChange('sanity', v)} color="bg-cyan-500" labels={['Traumatizado', '', 'Enlouquecido']} onTest={handleSanityRoll} />
                            <StatusBar label="Exposição" stat={character.stats.occultism} onSave={v => handleStatChange('occultism', v)} color="bg-fuchsia-500" labels={['Ignorante', 'Ciente', 'Exposto']} />
                            <StatusBar label="Pontos de Esforço" stat={character.stats.effort} onSave={v => handleStatChange('effort', v)} color="bg-gray-400" labels={['Exausto', '', 'Disposto']} />
                        </div>
                    </div>
                    
                    <Section title="ARQUÉTIPO">
                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                            {Object.values(archetypes).map(({ name }) => (
                                <button
                                    key={name}
                                    onClick={() => handleCharacterUpdate(c => ({...c, archetype: name as Archetype}))}
                                    className={`flex-1 border p-2 text-sm uppercase transition-colors ${
                                        character.archetype === name
                                            ? 'bg-gray-200 text-black border-gray-200 shadow-md shadow-gray-400/20'
                                            : 'border-gray-600 hover:bg-gray-800'
                                    }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                        {character.archetype && character.archetype !== 'Nenhum' && (
                            <p className="text-gray-400 text-sm italic">
                                {archetypes[character.archetype as Exclude<Archetype, 'Nenhum'>].description}
                            </p>
                        )}
                    </Section>

                    {character.maskForm && <MaskFormSection form={character.maskForm} />}

                    <Section title="PERÍCIAS DE ACESSO RÁPIDO">
                        {favoriteSkills.length > 0 ? (
                             <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {favoriteSkills.map(skill => (
                                    <div key={skill.id} className="flex justify-between border-b border-gray-800/50 py-1">
                                        <span className="text-gray-300">{skill.name}</span>
                                        <span className="font-bold text-gray-100">{skill.value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 text-sm text-center">Nenhuma perícia marcada para acesso rápido. Clique na estrela (☆) na lista de perícias.</p>
                        )}
                    </Section>

                    <Section title="INVENTÁRIO & CARGA" className="flex-grow flex flex-col">
                        <div className="mb-4">
                            <EditableField 
                                label="Dinheiro" 
                                value={`¥${character.money.toLocaleString('pt-BR')}`}
                                onSave={(newValue) => {
                                    const numericValue = parseInt(newValue.replace(/[^0-9-]/g, ''), 10);
                                    if (!isNaN(numericValue)) {
                                        handleCharacterUpdate(c => ({...c, money: numericValue }));
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-grow">
                             <Inventory 
                                items={character.inventory} 
                                setItems={(newItems) => handleCharacterUpdate(c => ({...c, inventory: typeof newItems === 'function' ? newItems(c.inventory) : newItems}))} 
                                maxWeight={maxWeight}
                                totalWeight={totalWeight}
                                stats={character.stats}
                                onMaskClick={handleMaskClick}
                            />
                        </div>
                    </Section>
                </div>
            </main>

            <div className="mt-6 lg:col-span-5">
                <Section title="RITUAIS">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-300">
                                    {['Nome', 'Custo', 'Execução', 'Alcance', 'Duração', 'Descrição', ''].map(h => <th key={h} className="p-2 uppercase font-normal tracking-wider text-xs">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {character.rituals.map((ritual, index) => {
                                    const isImmutable = ritual.isMaskRitual || ritual.isTarotRitual;
                                    const rowClass = `${ritual.isMaskRitual ? 'text-fuchsia-300' : ''} ${ritual.isTarotRitual ? 'text-amber-400' : ''}`;
                                    return (
                                        <tr key={ritual.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${rowClass}`}>
                                            <td className="p-1"><input type="text" value={ritual.name} onChange={e => handleRitualChange(index, 'name', e.target.value)} className="bg-transparent w-full focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                            <td className="p-1"><input type="text" value={ritual.cost} onChange={e => handleRitualChange(index, 'cost', e.target.value)} className="bg-transparent w-16 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                            <td className="p-1"><input type="text" value={ritual.execution} onChange={e => handleRitualChange(index, 'execution', e.target.value)} className="bg-transparent w-20 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                            <td className="p-1"><input type="text" value={ritual.range} onChange={e => handleRitualChange(index, 'range', e.target.value)} className="bg-transparent w-16 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                            <td className="p-1"><input type="text" value={ritual.duration} onChange={e => handleRitualChange(index, 'duration', e.target.value)} className="bg-transparent w-20 focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                            <td className="p-1"><input type="text" value={ritual.description} onChange={e => handleRitualChange(index, 'description', e.target.value)} className="bg-transparent w-full focus:outline-none focus:bg-black/50 p-1 rounded-sm" disabled={isImmutable} /></td>
                                            <td className="p-1 text-center"><button onClick={() => !isImmutable && removeRitual(ritual.id)} className={`font-bold ${isImmutable ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-red-400'}`}>X</button></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addRitual} className="mt-4 border border-gray-600 hover:bg-gray-800 px-4 py-1 text-sm transition-colors">Adicionar Ritual</button>
                </Section>
            </div>
            
             <div className="mt-6 lg:col-span-5">
                <Section title="ANTECEDENTES">
                    <div className="space-y-4">
                        <EditableTextarea
                            label="Descrição Pessoal"
                            value={character.background.personalDescription}
                            onSave={v => handleBackgroundChange('personalDescription', v)}
                            rows={4}
                        />
                        <EditableTextarea
                            label="Características"
                            value={character.background.characteristics}
                            onSave={v => handleBackgroundChange('characteristics', v)}
                            rows={3}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
                             <EditableList
                                title="Fobias e Manias"
                                items={character.background.phobiasManias}
                                onUpdate={v => handleBackgroundChange('phobiasManias', v)}
                            />
                            <EditableList
                                title="Pessoas Importantes"
                                items={character.background.importantPeople}
                                onUpdate={v => handleBackgroundChange('importantPeople', v)}
                            />
                             <EditableList
                                title="Pertences de Valor"
                                items={character.background.valuableBelongings}
                                onUpdate={v => handleBackgroundChange('valuableBelongings', v)}
                            />
                             <EditableList
                                title="Locais Importantes"
                                items={character.background.importantPlaces}
                                onUpdate={v => handleBackgroundChange('importantPlaces', v)}
                            />
                        </div>
                    </div>
                </Section>
            </div>

            <DiceRoller 
                history={rollHistory}
                onManualRoll={handleManualRoll}
            />
            {isImageManagerOpen && (
                <ImageManager 
                    imageSet={character.imageSet}
                    onSave={handleImageSetSave}
                    onClose={() => setIsImageManagerOpen(false)}
                />
            )}
            {attributeRollResult && (
                <AttributeRollModal 
                    result={attributeRollResult}
                    onClose={() => setAttributeRollResult(null)}
                />
            )}
        </div>
    );
};

const getRoute = () => {
    const hash = window.location.hash || '#/';
    const [path, id] = hash.substring(2).split('/');
    return { path, id };
};

function App() {
    const [route, setRoute] = useState(getRoute());
    const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('isMasterLoggedIn') === 'true');

    // Effect to listen for hash changes
    useEffect(() => {
        const handleHashChange = () => setRoute(getRoute());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleNavigation = useCallback((path: string) => {
        window.location.hash = path;
    }, []);

    // Effect to handle all redirection logic
    useEffect(() => {
        const { path } = route;
        const isPublicRoute = (path === 'character' || path === 'portrait');
        
        if (isPublicRoute) return; // Do not redirect public routes

        if (isLoggedIn) {
            if (path !== 'dashboard') {
                handleNavigation('#/dashboard');
            }
        } else { // not logged in
            if (path !== 'login') {
                handleNavigation('#/login');
            }
        }
    }, [isLoggedIn, handleNavigation, route]); // Re-run when login or route changes

    const handleLoginSuccess = () => {
        sessionStorage.setItem('isMasterLoggedIn', 'true');
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isMasterLoggedIn');
        setIsLoggedIn(false);
    };

    const { path, id } = route;

    // --- Render based on current route and auth state ---
    if (path === 'character' && id) {
        return <CharacterSheetPage characterId={id} onNavigate={handleNavigation} isMaster={isLoggedIn} />;
    }
    if (path === 'portrait' && id) {
        return <PortraitPage characterId={id} />;
    }
    if (path === 'dashboard') {
        if (isLoggedIn) return <DashboardPage onNavigate={handleNavigation} onLogout={handleLogout} />;
    }
    if (path === 'login') {
        if (!isLoggedIn) return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    // Fallback for transitional states or initial load before the redirection effect runs
    return <div className="flex items-center justify-center min-h-screen">CARREGANDO...</div>;
}

export default App;