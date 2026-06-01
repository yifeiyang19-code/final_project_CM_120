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

The dark sky and ruined-port atmosphere are created through the background art, foreground tinting, rain-line visuals, and phase atmosphere management. `PhaseAtmosphereManager.js` strengthens the storm, sky darkness, warning lights, and phase color as the boss escalates. The final phase adds thunderstorm pressure through `Phase4ThunderstormSystem.js`, a boss-anchored pure-number final-protocol countdown above the @-R4d1-CAT0R, and a permanent drone-bombardment loop that tracks the player until the ending begins. The countdown is tuned to about 17 seconds so the whole boss fight lands near the 106-second target and stays aligned with the boss BGM, whose file duration is about 109 seconds.

### Bullet Patterns

Projectile and bullet-hell patterns are split across skill classes:

- `HolyClearance.js`: suppressive projectile volleys. This version heavily reduces the five-shot pressure, firing frequency, projectile speed, and prediction so the skill is readable and less oppressive.
- `PurgeProtocolSkill.js`: drone/bomb pressure. In Phase 4, it becomes an endless player-following aerial bombardment instead of a normal cooldown-only attack, but the final version slows its marker warning and bomb cadence so the 17-second finale is readable rather than chaotic.
- `RayOfOblivion.js`: in Phase 4, the laser changes into a staged sweep: top-to-bottom, bottom-to-top, left-to-right, right-to-left, then a slow 360-degree radial sweep from the boss. The sweep timing is compressed to fit inside the 17-second final protocol window, while every directional beam starts outside the camera view and travels past the opposite edge so the right-to-left and left-to-right passes fully cover the screen. High-depth warning overlays, dark warning backplates, and visible safe-gap boxes keep the attack readable under rain, storm, and map effects.
- `MassEnergyTurretsSkill.js`: deployable turret pressure, with reduced turret count and projectile speed compared with the earlier overpowered build. This version slightly increases turret lifetime and fire rate so Phase 2/3 turrets still matter without dominating the fight. Phase 4 cancels turret use entirely so the finale focuses on drone pressure, collision pressure, storm effects, and the new sweep laser.
- `DestructionBlastSkill.js` and `AnnihilationSlashSkill.js`: telegraphed lane and melee-area attacks.

White trees interact with hostile projectiles through `registerProjectileVsTrees`, `registerProjectileTreeSweep`, and enlarged tree-blocking bounds in `BossScene.js`.

### Game AI

The boss AI is implemented mainly in `BossAttackLoop.js`. It is not a purely random attack selector. It builds a context from player distance, vertical position, movement speed, ladder use, health, active trees, active turrets, phase, and cooldown age. A behavior-tree layer handles high-priority tactical cases, and a utility-scoring layer chooses fallback attacks. This supports the narrative idea that the boss is a procedural guardian system still following its command to protect the port.

### Skill Tree / Player Ability System

Player tools are separated into ability modules:

- `DirectionalDash.js`: directional double-tap dash.
- `BlinkAbility.js`: cursor blink movement.
- `BlessingTreeAbility.js`: white tree placement, charges, HP, duration, body size, and break effects.
- `PlayerMovement.js`: platformer movement and ladder behavior. Gravity capture applies a longer debuff; while that debuff is active, ladder movement is heavily slowed and movement skills such as jump, double jump, dash, and blink are disabled. The ability HUD also draws chain overlays over locked movement skills. The white tree remains usable, so the player still has a defensive response during gravity capture.
- `PlayerAbilityConfig.js`: main tuning file for cooldowns, dash distances, tree HP, tree duration, and tree count.

The white tree currently has 3 HP and enlarged collision/body coverage so it can block both small and larger Holy Clearance patterns more reliably.

### Hit and Block Judgement

The game uses Phaser Arcade Physics overlaps for normal projectile hits. Fast projectiles also use a sweep check between the previous and current projectile position, so the tree can block bullets even when a projectile travels past the tree between frames. Ray attacks use line-to-rectangle intersection and inflated tree bounds to decide whether the beam is stopped by a white tree.

### Movement Effects

Movement feedback comes from dash flashes, ghost trails, player particles, blink flashes, camera response, and SFX. `GhostTrail.js`, `PlayerParticleJuice.js`, `DirectionalDash.js`, and `BlinkAbility.js` provide most of the player motion effects.

## Music and Phase Timing

The main boss music is `assets/audio/boss_bgm_protocol_for_nothing.mp3`. It was checked with `ffprobe` at about 109.0 seconds. The fight is tuned for an approximate 106-second combat arc rather than an endless loop:

- Phase 1 uses a faster natural decay than the earlier build, so the opening no longer feels empty.
- Phase 2 increases both decay pressure and decision frequency.
- Phase 3 becomes faster again, but still bridges into the finale instead of creating a sudden spike.
- Phase 4 uses a 17-second final-protocol countdown instead of a 45-second timer. The countdown is rendered as a pure number above the boss in screen space at very high depth so it remains visible during camera movement and storm effects. The sweep laser sequence is timed to complete within this same 17-second window, including both left-to-right and right-to-left passes. Turrets remain disabled in Phase 4; pressure comes from drone pursuit, storms, collision pressure, and the staged sweep laser.

The BGM is configured not to loop so the ending sequence can align with the final section of the track.

## Important Files

- `index.html`: entry page
- `src/main.js`: Phaser game configuration
- `src/Scenes/MenuScene.js`: title screen and story entry
- `src/Scenes/BossScene.js`: main fight scene and shared combat systems
- `src/Scenes/TrainingScene.js`: skill practice room, including the Phase 4 slow sweep ray drill and gravity-lock practice
- `src/Systems/BossAttackLoop.js`: behavior tree and utility AI
- `src/Systems/Phase4ThunderstormSystem.js`: final phase storm pressure
- `src/BossSequences/BossIntroSequence.js`: boss intro
- `src/BossSequences/BossDeathSequence.js`: final cinematic
- `src/PlayerAbilities/PlayerAbilityConfig.js`: player tuning
- `assets/data/game_config.json`: boss/player/global balance

## Submission Links

Playable build:

`https://yifeiyang19-code.github.io/final_project_CM_120/`

GitHub repository:

`https://github.com/yifeiyang19-code/final_project_CM_120`
