export type Archetype = 'Combatente' | 'Especialista' | 'Ocultista' | 'Nenhum';
export type MaskForm = 'Oni' | 'Besta' | 'Ninja' | 'Cultista' | 'Franco Atirador' | 'Duelista';
export type DiceType = 2 | 4 | 6 | 8 | 10 | 12 | 20 | 100;
export type RollOutcome = 'Sucesso Crítico' | 'Sucesso Bom' | 'Sucesso' | 'Fracasso' | 'Fracasso Crítico';

export interface RollResult {
  id: number;
  type: 'manual' | 'attribute' | 'sanity';
  source: string; // e.g., '20' for a D20, or 'Força' for an attribute roll
  rollValue: number;
  targetValue?: number;
  outcome?: RollOutcome;
}

export interface Stat {
  current: number;
  max: number;
}

export interface Attribute {
  id: string;
  name: string;
  value: number;
}

export interface Skill {
  id: string;
  name:string;
  value: number;
  isFavorite?: boolean;
}

export interface Ritual {
  id: string;
  name: string;
  cost: string;
  execution: string;
  range: string;
  duration: string;
  description: string;
  isMaskRitual?: boolean;
  isTarotRitual?: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  type: string;
  damage: string;
  currentAmmo: number;
  maxAmmo: number;
  attacks: string;
  range: string;
  malfunction: string;
  area: string;
  isMaskWeapon?: boolean;
  isTarotCard?: boolean;
  isUnarmed?: boolean; // For innate attacks like Punch
  linkedItemId?: string; // Links weapon to an inventory item
}

export interface InventoryItem {
  id: string;
  name:string;
  width: number; // in grid cells
  height: number; // in grid cells
  x: number; // grid position
  y: number; // grid position
  weight: number;
  description: string;
  rotated: boolean;
  containerId?: string; // ID of the container item (e.g., backpack)
}

export interface ImageSet {
  base: string | null;
  variants: string[];
  wounded: string | null; // Image for <= 50% health
  critical: string | null; // Image for <= 25% health
}

export interface Background {
  personalDescription: string;
  characteristics: string;
  phobiasManias: { id: string; text: string }[];
  importantPeople: { id: string; text: string }[];
  valuableBelongings: { id: string; text: string }[];
  importantPlaces: { id: string; text: string }[];
}

export interface Character {
  id:string;
  personalDetails: {
    name: string;
    player: string;
    occupation: string;
    age: string;
    gender: string;
    birthplace: string;
    residence: string;
  };
  imageSet: ImageSet;
  background: Background;
  archetype: Archetype;
  stats: {
    life: Stat;
    sanity: Stat;
    occultism: Stat;
    effort: Stat;
  };
  attributes: Attribute[];
  movement: number;
  size: number;
  skills: Skill[];
  combat: Weapon[];
  rituals: Ritual[];
  inventory: InventoryItem[];
  attributePoints: number;
  skillPoints: number;
  maskForm: MaskForm | null;
  money: number;
}

export interface MasterAttributeTemplate {
  id: string;
  name: string;
  description: string;
}

export interface MasterSkillTemplate {
  id: string;
  name: string;
  description: string;
}


export interface MasterItemTemplate {
  name: string;
  width: number;
  height: number;
  weight: number;
  description: string;
  weapon?: Omit<Weapon, 'id' | 'name' | 'linkedItemId' | 'isUnarmed' | 'isMaskWeapon' | 'isTarotCard'>;
}

export interface MasterRitualTemplate {
  id: string;
  name: string;
  description: string;
  cost: string;
  execution: string;
  range: string;
  duration: string;
  invocationSign: string; // key for the sign component
}