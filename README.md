---
config:
  title: ASHFALL
  version: 1.0.0
  author: Hermes Agent
---

# ASHFALL - 2D Sandbox Survival Adventure

## Game Overview

ASHFALL is a single-player 2D sandbox survival-adventure game where you explore a procedurally generated world recovering from a catastrophe called the Ashfall.

### Core Features
- Procedural world generation (deterministic seeds)
- 2D tile-based world with physics
- Mining and crafting systems
- Combat with AI enemies
- 3 Bosses with unique phases
- Day/night cycle
- Multiple biomes
- Persistent save system (localStorage)

### Controls
- **WASD / Arrow Keys**: Move
- **Space**: Jump
- **Mouse Left**: Mine/Attack
- **Mouse Right**: Place/Interact
- **E**: Open inventory
- **ESC**: Pause menu

## Tech Stack
- Frontend: React + TypeScript + Vite + HTML5 Canvas
- Storage: localStorage (no backend required)
- Rendering: Canvas 2D API with sprite system