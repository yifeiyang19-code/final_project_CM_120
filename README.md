# The Bitter Rain: Morningstar Port

A Phaser 3 boss-fight platformer set inside the ruined Morningstar Port. The player survives a four-phase guardian battle against the @-R4d1-CAT0R, uses dash, blink, ladders, health packs, and white trees, and defeats the final protocol during a storm-driven ending sequence.

## How to Run

Use a local web server. In VS Code, open the project folder and run Live Server on `index.html`.

PowerShell alternative:

```powershell
cd "C:\Users\yifei\Downloads\final_project"
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Controls

- A / D: Move
- W / Space: Jump
- Double-tap A / D / W / S: Dash
- Q: Blink to cursor
- Left mouse swipe near terrain: Grow a white tree
- R / Enter / F: Restart after defeat or victory
- M in Training: Return to main menu
- Esc: Pause

## Game Goal

Start from the title screen, enter the story/tutorial path, reach Morningstar Port, and defeat the four-phase boss. The player wins after surviving the final self-destruction sequence, where white trees bind the boss and protect the hero.

## Main Menu and Training

`MenuScene.js` contains the title screen, victory condition text, START GAME, and TRAINING. START GAME enters the playable story/tutorial flow before the boss fight. TRAINING opens `TrainingScene.js`, where individual boss skills can be practiced. Returning from Training uses a full page reload so the game always returns to a clean main menu state instead of carrying over timers, camera effects, physics state, or active boss projectiles from the inherited BossScene systems.

## Animation and Cinematic Implementation

### Intro Animation

The opening flow is handled in `MenuScene.js` and `BossIntroSequence.js`. The player first moves through the story/tutorial sequence, then the boss intro uses camera focus, landing movement, screen shake, sound cues, and boss animation frames to make the @-R4d1-CAT0R feel like a heavy machine entering the arena.

### Ending Animation

The ending is implemented in `BossDeathSequence.js`. The boss does not simply disappear. It enters a final-protocol state, charges a self-destruction core, and the scene lengthens the moment before detonation. White roots rise from the ground one by one, cross around the boss from both sides, lock the machine in place, and create a protective rescue moment before the victory screen.

### Camera

`BossScene.js`, `BossIntroSequence.js`, `BossDeathSequence.js`, and the boss skill classes use Phaser camera tools such as `startFollow`, `pan`, `flash`, `shake`, `fadeIn`, and `fadeOut`. Camera shake is reserved for heavy attacks, boss landings, phase changes, thunderstrikes, and the final self-destruction sequence.

### Rain and Black Sky

The dark sky and ruined-port atmosphere are created through the background art, foreground tinting, rain-line visuals, and phase atmosphere management. `PhaseAtmosphereManager.js` strengthens the storm, sky darkness, warning lights, and phase color as the boss escalates. The final phase adds thunderstorm pressure through `Phase4ThunderstormSystem.js`.

### Bullet Patterns

Projectile and bullet-hell patterns are split across skill classes:

- `HolyClearance.js`: suppressive projectile volleys. This version heavily reduces the five-shot pressure, firing frequency, projectile speed, and prediction so the skill is readable and less oppressive.
- `PurgeProtocolSkill.js`: drone/bomb pressure.
- `MassEnergyTurretsSkill.js`: deployable turret pressure, with reduced turret count, fire rate, and projectile speed.
- `DestructionBlastSkill.js` and `AnnihilationSlashSkill.js`: telegraphed lane and melee-area attacks.

White trees interact with hostile projectiles through `registerProjectileVsTrees`, `registerProjectileTreeSweep`, and enlarged tree-blocking bounds in `BossScene.js`.

### Game AI

The boss AI is implemented mainly in `BossAttackLoop.js`. It is not a purely random attack selector. It builds a context from player distance, vertical position, movement speed, ladder use, health, active trees, active turrets, phase, and cooldown age. A behavior-tree layer handles high-priority tactical cases, and a utility-scoring layer chooses fallback attacks. This supports the narrative idea that the boss is a procedural guardian system still following its command to protect the port.

### Skill Tree / Player Ability System

Player tools are separated into ability modules:

- `DirectionalDash.js`: directional double-tap dash.
- `BlinkAbility.js`: cursor blink movement.
- `BlessingTreeAbility.js`: white tree placement, charges, HP, duration, body size, and break effects.
- `PlayerMovement.js`: platformer movement and ladder behavior.
- `PlayerAbilityConfig.js`: main tuning file for cooldowns, dash distances, tree HP, tree duration, and tree count.

The white tree currently has 3 HP and enlarged collision/body coverage so it can block both small and larger Holy Clearance patterns more reliably.

### Hit and Block Judgement

The game uses Phaser Arcade Physics overlaps for normal projectile hits. Fast projectiles also use a sweep check between the previous and current projectile position, so the tree can block bullets even when a projectile travels past the tree between frames. Ray attacks use line-to-rectangle intersection and inflated tree bounds to decide whether the beam is stopped by a white tree.

### Movement Effects

Movement feedback comes from dash flashes, ghost trails, player particles, blink flashes, camera response, and SFX. `GhostTrail.js`, `PlayerParticleJuice.js`, `DirectionalDash.js`, and `BlinkAbility.js` provide most of the player motion effects.

## Important Files

- `index.html`: entry page
- `src/main.js`: Phaser game configuration
- `src/Scenes/MenuScene.js`: title screen and story entry
- `src/Scenes/BossScene.js`: main fight scene and shared combat systems
- `src/Scenes/TrainingScene.js`: skill practice room
- `src/Systems/BossAttackLoop.js`: behavior tree and utility AI
- `src/Systems/Phase4ThunderstormSystem.js`: final phase storm pressure
- `src/BossSequences/BossIntroSequence.js`: boss intro
- `src/BossSequences/BossDeathSequence.js`: final cinematic
- `src/PlayerAbilities/PlayerAbilityConfig.js`: player tuning
- `assets/data/game_config.json`: boss/player/global balance
