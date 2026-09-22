export type BlockType = 
  | 'air' | 'grass' | 'dirt' | 'stone' | 'ash' | 'sand' 
  | 'ice' | 'snow' | 'clay' | 'copper_ore' | 'iron_ore' 
  | 'silver_ore' | 'ember_ore' | 'crystal' | 'wood' | 'ancient_stone' | 'tree';

export type ItemType = 
  | 'resource' | 'tool' | 'weapon' | 'armor' | 'consumable' | 'building' | 'quest' | 'boss_material';

export type ToolType = 'pickaxe' | 'axe' | 'hammer';

export type WeaponType = 'sword' | 'bow' | 'staff';

export type EnemyType = 'ashling' | 'cave_stalker' | 'ember_wisp' | 'frost_maw' | 'ruin_guardian';

export type BossType = 'ashen_heart' | 'frozen_colossus' | 'hollow_machine';

export type Biome = 'forest' | 'desert' | 'frozen' | 'ashlands' | 'ruins' | 'underground';

export type QuestType = 'collect' | 'craft' | 'defeat' | 'explore' | 'discover';

export type EquipmentSlot = 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'weapon' | 'offhand' | 'accessory1' | 'accessory2';

export interface Block {
  id: string;
  type: BlockType;
  hardness: number;
  hardnessRemaining: number;
  dropsAs: string[];
  canMineWith: { toolType: ToolType | null; minLevel: number } | null;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  sprite: string;
  description: string;
  stackable: boolean;
  maxStack: number;
  toolType?: ToolType;
  toolLevel: number;
  damage?: number;
  attackSpeed?: number;
  range?: number;
  durability?: number;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  quantity: number;
  slot: number;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  inventory: InventoryItem[];
  hotbar: (string | null)[];
  equipment: Record<EquipmentSlot, string | null>;
  inventoryCapacity: number;
  toolsUnlocked: string[];
  weaponsUnlocked: string[];
  armorUnlocked: string[];
  attackCooldown: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  behavior: 'basic' | 'flying' | 'patrol';
  state: 'idle' | 'roaming' | 'attacking' | 'chasing' | 'dead';
  aggroRange: number;
  attackRange: number;
  lastAction: number;
  loot: string[];
}

export interface Boss {
  id: number;
  type: BossType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  phase: number;
  state: 'spawning' | 'phase1' | 'phase2' | 'phase3' | 'dead';
  damage: number;
  speed: number;
  attackPattern: string;
  attackCooldowns: number[];
  lastAttack: number;
}

export interface Chunk {
  x: number;
  y: number;
  blocks: Block[][];
  loaded: boolean;
}

export interface World {
  seed: string;
  width: number;
  height: number;
  blocks: Map<string, Block>;
  enemies: Enemy[];
  bosses: Boss[];
  structures: Structure[];
  time: number;
  dayNightCycle: number;
  discoveredLocations: string[];
  killedEnemies: Record<string, number>;
  minedBlocks: Record<string, number>;
}

export interface Structure {
  id: number;
  type: 'abandoned_house' | 'ruined_lab' | 'underground_shrine' | 'ancient_vault' | 'broken_tower';
  x: number;
  y: number;
  width: number;
  height: number;
  visited: boolean;
  contents: {
    chestItems: string[];
    enemies: Enemy[];
    boss?: Boss;
  };
}

export interface Discovery {
  id: string;
  name: string;
  description: string;
  icon: string;
  discovered: boolean;
}

export interface CraftingRecipe {
  id: string;
  outputId: string;
  outputQuantity: number;
  inputs: { itemId: string; quantity: number }[];
  requiredTool?: string;
  workbench?: boolean;
}

export type ToolInfo = {
  [key in ToolType]: {
    level: number;
    speed: number;
    durability: number;
    icon: string;
  }
};

export const TOOL_INFO: ToolInfo = {
  pickaxe: { level: 1, speed: 1.0, durability: 100, icon: '🪙' },
  axe: { level: 1, speed: 1.0, durability: 100, icon: '🪓' },
  hammer: { level: 1, speed: 1.0, durability: 150, icon: '🔨' }
};