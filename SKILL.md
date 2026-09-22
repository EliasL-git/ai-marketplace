---
name: game-development
description: "Build browser-based games with React/TypeScript, Canvas rendering, and localStorage persistence"
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [game, frontend, typescript, react, canvas, browser]
    category: software-development
    related_skills: [hermes-agent]
    homepage: https://game-development.nousresearch.com
---
# Game Development Workflow for ASHFALL-style Games

## Overview

This skill covers building a complete playable browser game with:
- React + TypeScript frontend
- HTML5 Canvas rendering
- localStorage for persistence (no server database)
- Single-player P2P experience

## Architecture

```
/game-project/
├── client/           # React frontend ( Vite + TypeScript )
│   ├── src/
│   │   ├── game/    # Core game engine
│   │   ├── ui/      # React components
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── server/          # Optional backend API
├── shared/          # TypeScript types shared with frontend
└── public/          # Static assets
```

## Always-On Rules

1. **LocalStorage First** - Use localStorage for all game state persistence (no database required for single-player)
2. **Asset-Free Rendering** - Use Canvas primitives (colored rectangles, circles, lines) instead of loading external images
3. **TypeScript Types Shared** - Keep types in `/shared/types.ts` and import from there
4. **Deterministic Seeds** - World generation must use `hashCode(string)` for reproducible worlds
5. **Performance First** - Implement chunk loading, viewport culling, and efficient frame loops
6. **No Fake State** - Client-side game state is authoritative for single-player; server validation needed for multiplayer

## Procedural World Generation

Use Perlin noise with deterministic seeds:

```typescript
perlinNoise(x: number, y: number, seed: number): number {
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
  
  // Hash function for consistent randomness
  const r1 = this.random2(x0, y0, seed);
  const r2 = this.random2(x1, y0, seed);
  const r3 = this.random2(x0, y1, seed);
  const r4 = this.random2(x1, y1, seed);
  
  const nx0 = lerp(u, r1, r2);
  const nx1 = lerp(u, r3, r4);
  const nxy = lerp(v, nx0, nx1);
  
  return nxy;
}
```

## Canvas Game Loop

```typescript
class GameEngine {
  private lastTime = 0;
  private readonly FPS = 60;
  private readonly frameTime = 1000 / this.FPS;
  
  gameLoop = (currentTime: number) => {
    const delta = currentTime - this.lastTime;
    if (delta > this.frameTime) {
      this.update(delta);
      this.render();
      this.lastTime = currentTime;
    }
    requestAnimationFrame(this.gameLoop);
  }
  
  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }
}
```

## Key Pitfalls

- **Performance with Large Worlds**: Never iterate all blocks each frame. Use viewport culling and only render visible chunks.
- **TypeScript Module Resolution**: When defining block types, ensure they're exported from a single types file and imported where needed — duplicate type definitions cause TypeScript errors.
- **Input Handling**: Prevent event propagation from affecting page scroll. Use `event.preventDefault()` and `event.stopPropagation()` in key handlers.
- **Physics Integration**: Gravity is simply `velocity.y += GRAVITY * delta` each frame. Terminal velocity prevents infinite fall speed.

## Testing Checklist

Before considering a game feature complete:
- [ ] World generates deterministically (same seed = same world)
- [ ] Player movement is smooth at 60 FPS
- [ ] Collision detection works (no clipping through walls)
- [ ] All inventory actions persist after page refresh
- [ ] Mining blocks produces correct drops
- [ ] Placing blocks validates cursor position
- [ ] Enemy AI targets and attacks player correctly
- [ ] Day/night cycle transitions smoothly
- [ ] No console errors in devtools