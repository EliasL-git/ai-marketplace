import { BlockType, ItemType, Biome, WorldGenParams } from '../shared/types';

export class WorldGenerator {
  private seed: string;
  private width: number;
  private height: number;
  private biomes: Map<Biome, number>;

  constructor(params: WorldGenParams) {
    this.seed = params.seed;
    this.width = params.width;
    this.height = params.height;
    this.biomes = params.biomeSeeds;
  }

  generateWorld(): Map<string, BlockType> {
    const world = new Map<string, BlockType>();
    const seed = this.hashCode(this.seed);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        // Determine biome based on seed and position
        const biome = this.getBiome(x, y, seed);
        // Generate terrain based on biome
        const blockType = this.generateBlock(biome, x, y, seed);
        if (blockType !== 'air') {
          world.set(`${x},${y}`, blockType);
        }
      }
    }

    this.addStructures(world, seed);
    this.addOreDeposits(world, seed);
    return world;
  }

  private getBiome(x: number, y: number, seed: number): Biome {
    // Simplified biome generation based on coordinates
    const noise = this.perlinNoise(x * 0.01, y * 0.01, seed);
    if (noise < -0.3) return 'frozen';
    if (noise < -0.1) return 'desert';
    if (noise < 0.1) return 'forest';
    if (noise < 0.3) return 'ashlands';
    return 'ruins';
  }

  private generateBlock(biome: Biome, x: number, y: number, seed: number): BlockType {
    const noise = this.perlinNoise(x * 0.02, y * 0.02, seed);
    
    switch (biome) {
      case 'forest':
        if (y < this.height * 0.2) return 'air';
        if (y < this.height * 0.3) return noise < -0.5 ? 'tree' : 'grass';
        return noise < -0.3 ? 'dirt' : 'grass';
      case 'desert':
        if (y < this.height * 0.2) return 'air';
        if (noise < -0.5) return 'sand';
        if (noise < -0.2) return 'ash';
        return 'dirt';
      case 'frozen':
        if (noise < -0.5) return 'snow';
        if (noise < -0.2) return 'ice';
        return 'dirt';
      case 'ashlands':
        if (noise < -0.6) return 'ash';
        if (noise < -0.3) return 'ember_ore';
        return 'stone';
      case 'ruins':
        if (noise < -0.5 && y < this.height * 0.3) return 'ancient_stone';
        if (noise < -0.3) return 'crystal';
        return 'stone';
      default:
        return 'dirt';
    }
  }

  private addStructures(world: Map<string, BlockType>, seed: number): void {
    // Add caves
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (world.has(`${x},${y}`)) continue;
        if (this.perlinNoise(x * 0.03, y * 0.03, seed) < -0.7) {
          world.set(`${x},${y}`, 'air');
        }
      }
    }

    // Add underground structures
    for (let x = 0; x < this.width; x += 20) {
      for (let y = this.height * 0.3; y < this.height; y += 10) {
        if (this.perlinNoise(x * 0.02, y * 0.02, seed) < -0.4) {
          world.set(`${x},${y}`, 'iron_ore');
          world.set(`${x},${y + 1}`, 'iron_ore');
        }
      }
    }
  }

  private addOreDeposits(world: Map<string, BlockType>, seed: number): void {
    // Add ore veins
    for (let x = 0; x < this.width; x += 30) {
      for (let y = this.height * 0.4; y < this.height * 0.8; y += 30) {
        if (this.perlinNoise(x * 0.01, y * 0.01, seed) < -0.5) {
          const oreType = this.getRandomOre(seed);
          for (let i = 0; i < 3; i++) {
            const oreX = x + Math.floor(Math.random() * 10) - 5;
            const oreY = y + Math.floor(Math.random() * 10) - 5;
            if (oreX >= 0 && oreX < this.width && oreY >= 0 && oreY < this.height) {
              world.set(`${oreX},${oreY}`, oreType);
            }
          }
        }
      }
    }
  }

  private perlinNoise(x: number, y: number, seed: number): number {
    const fade = (t: number) => t * t * (3 - 2 * t);
    const lerp = (t: number, a: number, b: number) => a + t * (b - a);

    const x0 = Math.floor(x) & 0xFF;
    const x1 = (x0 + 1) & 0xFF;
    const y0 = Math.floor(y) & 0xFF;
    const y1 = (y0 + 1) & 0xFF;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const r1 = this.random2(x0, y0, seed);
    const r2 = this.random2(x1, y0, seed);
    const r3 = this.random2(x0, y1, seed);
    const r4 = this.random2(x1, y1, seed);

    const nx0 = lerp(u, r1, r2);
    const nx1 = lerp(u, r3, r4);
    const nxy = lerp(v, nx0, nx1);

    return nxy;
  }

  private random2(x: number, y: number, seed: number): number {
    const n = (this.hashCode(`${seed},${x},${y}`) % 10000) / 10000 * 2 - 1;
    return n;
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

  private getRandomOre(seed: number): BlockType {
    const ores: BlockType[] = ['copper_ore', 'iron_ore', 'silver_ore', 'ember_ore', 'crystal'];
    const index = seed % ores.length;
    return ores[index];
  }
}