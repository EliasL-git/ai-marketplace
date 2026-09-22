const GRID_SIZE = 64;
const CHUNK_SIZE = 16;

const WORLD_WIDTH = 2000; // Much larger than screen
const WORLD_HEIGHT = 2000;

export class World {
  public seed: string;
  public width: number;
  public height: number;
  public blocks: Map<string, Block> = new Map();
  public chunks: Map<string, Chunk> = new Map();
  public time: number = 0;
  public dayNightCycle: number = 0;

  constructor(seed: string, width: number = WORLD_WIDTH, height: number = WORLD_HEIGHT) {
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.generateWorld();
  }

  private generateWorld(): void {
    const generator = new WorldGenerator({
      seed: this.seed,
      width: this.width,
      height: this.height,
      biomeSeeds: new Map([
        ['forest', 1],
        ['desert', 1],
        ['frozen', 1],
        ['ashlands', 1],
        ['ruins', 1]
      ])
    });
    const blocks = generator.generateWorld();
    blocks.forEach((blockType, key) => {
      this.blocks.set(key, { type: blockType, hardness: this.getHardness(blockType), hardnessRemaining: this.getHardness(blockType), dropsAs: this.getDropItems(blockType) });
    });
    this.generateChunks();
    this.placeStructures();
  }

  private generateChunks(): void {
    for (let x = 0; x < this.width; x += CHUNK_SIZE) {
      for (let y = 0; y < this.height; y += CHUNK_SIZE) {
        const chunk = this.createChunk(x, y);
        this.chunks.set(`${x},${y}`, chunk);
      }
    }
  }

  private createChunk(x: number, y: number): Chunk {
    const blocks: Block[][] = [];
    for (let cy = y; cy < y + CHUNK_SIZE && cy < this.height; cy++) {
      const row: Block[] = [];
      for (let cx = x; cx < x + CHUNK_SIZE && cx < this.width; cx++) {
        const block = this.blocks.get(`${cx},${cy}`);
        row.push(block || { type: 'air', hardness: 0, hardnessRemaining: 0, dropsAs: [] });
      }
      blocks.push(row);
    }
    return { x, y, blocks, loaded: true };
  }

  private placeStructures(): void {
    const seed = this.hashCode(this.seed);
    const structures = this.getStructurePositions(seed);
    for (const struct of structures) {
      this.placeStructure(struct);
    }
  }

  private placeStructure(struct: any): void {
    for (let y = struct.y; y < struct.y + struct.height; y++) {
      for (let x = struct.x; x < struct.x + struct.width; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const blockType = this.getBlockAt(x, y);
          if (blockType === 'air' || blockType === 'dirt') {
            const structureBlock = struct.contents[struct.type] || 'stone';
            this.blocks.set(`${x},${y}`, { type: structureBlock as BlockType, hardness: this.getHardness(structureBlock as BlockType), hardnessRemaining: this.getHardness(structureBlock as BlockType), dropsAs: this.getDropItems(structureBlock as BlockType) });
          }
        }
      }
    }
  }

  public getBlockAt(x: number, y: number): BlockType {
    const block = this.blocks.get(`${x},${y}`);
    return block ? block.type : 'air';
  }

  private getHardness(blockType: BlockType): number {
    const hardnessMap: Record<BlockType, number> = {
      'air': 0, 'grass': 1, 'dirt': 1, 'stone': 3,
      'ash': 2, 'sand': 1, 'ice': 4, 'snow': 2,
      'clay': 2, 'copper_ore': 4, 'iron_ore': 5,
      'silver_ore': 6, 'ember_ore': 7, 'crystal': 8,
      'wood': 1, 'ancient_stone': 10
    };
    return hardnessMap[blockType] || 1;
  }

  private getDropItems(blockType: BlockType): string[] {
    const dropMap: Record<BlockType, string[]> = {
      'copper_ore': ['copper_ore_item'], 'iron_ore': ['iron_ore_item'],
      'silver_ore': ['silver_ore_item'], 'ember_ore': ['ember_ore_item'],
      'crystal': ['crystal_item'], 'stone': ['stone_item'],
      'ash': ['ash_item'], 'sand': ['sand_item'], 'ice': ['ice_item'],
      'snow': ['snow_item'], 'clay': ['clay_item'], 'wood': ['wood_item']
    };
    return dropMap[blockType] || [];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getStructurePositions(seed: number): any[] {
    const structures = [];
    const numStructures = Math.floor(Math.sqrt(seed) % 5) + 2;
    for (let i = 0; i < numStructures; i++) {
      const x = (seed * (i + 1) * 123) % this.width;
      const y = (seed * (i + 2) * 456) % this.height;
      const type = ['abandoned_house', 'ruined_lab', 'underground_shrine', 'ancient_vault', 'broken_tower'][i % 5];
      const width = 8 + (seed % 8);
      const height = 8 + (seed % 8);
      structures.push({ x, y, type, width, height, contents: {} });
    }
    return structures;
  }
}