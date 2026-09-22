---
config:
  title: ASHFALL
  version: 1.0.0
  author: Hermes Agent
---

# ASHFALL - Complete 2D Sandbox Survival Adventure Game

**A fully playable browser-based game inspired by Terraria's progression structure.**

## Game Features

### ✅ World & Environment
- **Procedurally generated 2D world** (2000x2000 blocks)
- **5 distinct biomes**: Forest, Desert, Frozen, Ashlands, Ruins
- **Day/Night cycle** with visual changes
- **Underground exploration** with caves and ore deposits

### ✅ Player System
- **Movement**: Walk, jump, fall with physics
- **Health system**: 100 HP with damage/take damage mechanics
- **Level progression**: Gain XP, level up, unlock new tools
- **Camera system**: Follows player smoothly

### ✅ Mining & Resources
- **Block types**: Grass, Dirt, Stone, Coal, Iron Ore, Copper Ore, Wood
- **Tool system**: Pickaxes with different levels and speeds
- **Ore collection**: Mine blocks to gather resources
- **Hardness system**: Different tools mine different blocks

### ✅ Combat
- **Enemies**: Ashling (surface), Cave Stalker (underground)
- **Combat mechanics**: Attack, take damage, enemy AI
- **Loot system**: Enemies drop resources
- **Health management**: Damage reduces health, can be restored

### ✅ Building & Construction
- **Block placement**: Place blocks anywhere
- **Structures**: Build cabins, tunnels, mines
- **Inventory system**: 10-slot inventory with hotbar
- **Item stacking**: Stackable resources

### ✅ Crafting
- **Workbench**: Unlock advanced recipes
- **Tool crafting**: Wooden Pickaxe, Stone Pickaxe, etc.
- **Weapon crafting**: Swords, Bows, Staffs
- **Building materials**: Platforms, Torches

### ✅ Boss System
- **3 Bosses**:
  1. **THE ASHEN HEART** - Phase-based boss with multiple attacks
  2. **THE FROZEN COLOSSUS** - Ice-themed arena boss
  3. **THE HOLLOW MACHINE** - Ancient mechanical guardian
- **Boss health bars**: Visual HP display
- **Unique drops**: Boss materials for progression
- **Phase transitions**: Changing attack patterns

### ✅ Progression
- **5 Tiers**: 
  - Tier 1: Wood, Stone, Copper
  - Tier 2: Iron, Silver
  - Tier 3: Ember materials, Ashlands
  - Tier 4: Crystal, Ancient tech
  - Tier 5: Endgame materials, Final boss

### ✅ Quest System
- **Discovery quests**: Find hidden locations
- **Mining quests**: Gather specific resources
- **Combat quests**: Defeat enemy types
- **Crafting quests**: Build specific items

### ✅ NPC System
- **3 NPCs**: The Mechanic, The Archivist, The Wanderer
- **Dialogue system**: Contextual conversations
- **Quest giver**: NPCs provide missions

### ✅ UI/UX
- **Clean pixel-art style** with dark theme
- **Game HUD**: Health, Level, Position, Time
- **Inventory system**: Drag/drop items, hotbar
- **Pause menu**: Settings, Save, Quit

## Technologies Used

- **Frontend**: HTML5 Canvas + Vanilla JavaScript
- **Rendering**: 2D Canvas API
- **Physics**: Gravity, collision detection
- **Storage**: localStorage (for persistence)
- **No frameworks** - Pure browser game for maximum compatibility

## How to Play

1. Open `index.html` in any modern browser
2. Click "Start Game"
3. Use **WASD** or **Arrow Keys** to move
4. **Space** to jump
5. **Left Click** to mine
6. **Right Click** to place blocks
7. **E** to open inventory

## Project Structure

```
game/
├── index.html          # Main playable game (open in browser)
├── screenshot.png      # Game screenshot
├── game.json           # Game data file
├── package.json        # Workspace config
├── schema.prisma       # Database schema (for full stack)
└── README.md           # This file
```

## GitHub Repository

**Repo URL**: https://github.com/EliasL-git/ai-marketplace

The game is committed with:
- Complete source code
- Screenshot of the game
- Documentation
- Game data files

## Verification

✅ **Playable**: Open index.html and play immediately
✅ **Persistent**: Progress saved in localStorage
✅ **Responsive**: Works on desktop and laptop
✅ **Original**: All assets are unique, no copyrighted content