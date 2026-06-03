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

The dark sky and ruined-port atmosphere are created through the background art, foreground tinting, rain-line visuals, and phase atmosphere management. `PhaseAtmosphereManager.js` strengthens the storm, sky darkness, warning lights, and phase color as the boss escalates. The final phase adds thunderstorm pressure through `Phase4ThunderstormSystem.js`, a boss-anchored pure-number final-protocol countdown above the @-R4d1-CAT0R, and a permanent drone-bombardment loop that tracks the player until the ending begins. The current build lengthens Phases 1-3 so the boss has enough time to use multiple attacks before the final protocol starts. A new BGM file can be dropped into `assets/audio/boss_bgm_protocol_for_nothing.mp3`; after that, the phase decay values in `assets/data/game_config.json` can be retuned to the exact new track length.

### Bullet Patterns

Projectile and bullet-hell patterns are split across skill classes:

- `HolyClearance.js`: suppressive projectile volleys. The large projectile variant is removed; all volleys use the small projectile profile, with a maximum of 4 chained volleys and 4 projectiles per volley. Holy Clearance now performs a defensive tree sweep check every frame and again before player damage, so White Trees can reliably block the whole volley path.
- `PurgeProtocolSkill.js`: drone/bomb pressure. In Phase 4, it becomes an endless player-following aerial bombardment instead of a normal cooldown-only attack, but the final version slows its marker warning and bomb cadence so the 17-second finale is readable rather than chaotic.
- `RayOfOblivion.js`: in Phase 4, the laser changes into one slow left-to-right sweep, one slow top-to-bottom sweep, and one forced 360-degree radial sweep from the boss. The old red border warning and sweep text warnings are removed so the final phase reads through the actual beam movement and safe gaps rather than extra UI clutter. The 360-degree sweep starts after Phase 4 begins, runs independently of other skills, and is not interrupted by normal Ray cleanup.
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

The white tree currently has 3 HP and enlarged collision/body coverage so it can reliably block Holy Clearance projectile paths. The final Phase 4 sweep ray is an exception: it destroys trees on contact instead of being blocked by them.

### Hit and Block Judgement

The game uses Phaser Arcade Physics overlaps for normal projectile hits. Fast projectiles also use a sweep check between the previous and current projectile position, so the tree can block bullets even when a projectile travels past the tree between frames. Ray attacks use line-to-rectangle intersection where appropriate. Holy Clearance uses expanded path checks from the boss to the player and from the projectile movement path to the tree, preventing fast volleys from slipping through between frames. Phase 4 sweep rays destroy trees rather than being blocked.

### Movement Effects

The player HUD labels life as HEALTH and displays seven health cells. Movement feedback comes from dash flashes, ghost trails, player particles, blink flashes, camera response, and SFX. `GhostTrail.js`, `PlayerParticleJuice.js`, `DirectionalDash.js`, and `BlinkAbility.js` provide most of the player motion effects.

## Music and Phase Timing

The final boss music is `assets/audio/Iron_Liturgy.mp3`. Its measured length is about 173.1 seconds, so the boss fight is tuned around the actual track instead of the older 106-second placeholder. The music does not loop; the fight is intended to end with the track.

Phase timing is tuned to the track's dramatic sections:

- Phase 1: 0-40s, quiet ruined-port awakening.
- Phase 2: 40-80s, mechanical systems come online.
- Phase 3: 80-155s, the main full-pressure battle section.
- Phase 4: about 155-173s, final protocol countdown and terminal overload.

The phase system is now time-gated against the BGM: player damage and natural decay cannot force a phase below its target integrity floor before the matching music section arrives. This keeps the boss health bar from dropping too quickly and keeps Phase 1, Phase 2, Phase 3, and Phase 4 aligned to the track. Phase transitions now use an in-place guardian upgrade ritual: the camera pans to the boss, the player and boss are frozen, the boss releases three color-coded body pulses with cross-shaped scan flares, a large phase title/subtitle appears, and then combat resumes. This is slightly longer than the previous instant flash, but it avoids the older awkward long pause and makes each phase change readable.

Phase 4 uses a short countdown above the boss, endless drone pressure, storms, collision pressure, one slow left-to-right laser wall, one slow top-to-bottom laser wall, and a forced very slow 360-degree sweep from the boss positioned near the center of the screen. During the radial sweep, the boss summons its brother units for pressure through Destruction Blast and Annihilation Slash patterns. Turrets remain disabled in Phase 4.

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

### Final sweep ray and White Tree rules

Phase 4 sweep rays are final-protocol hazards. They no longer create block boxes and they are not stopped by White Trees. If a sweep ray touches a White Tree, the tree is destroyed immediately. This keeps the finale visually clean and prevents confusing partial-cover behavior. White Trees still block normal projectile threats, especially Holy Clearance.

Final-stage pressure now comes from the countdown, drone bombardment, gravity, Ray of Oblivion, and the slow sweep-ray sequence.

## Final Balance Patch Notes

- Phase 4 sweep ray now uses one very slow left-to-right sweep and one very slow top-to-bottom sweep. Both sweeps include larger safe gaps and a red screen-border warning scaled to the current game viewport.
- The Phase 4 360-degree sweep begins when the final protocol starts and runs in parallel with Boss movement instead of stopping the fight flow.
- White trees are destroyed by Phase 4 sweep ray contact and no longer block that final-stage laser pattern. They still matter against other projectile patterns.
- Training Room return-to-menu now uses a hard page navigation path so ESC pause menu -> Main Menu does not inherit paused timers, physics, or camera state.
- Phase 1-3 pressure was raised slightly through faster decisions, slightly higher decay, faster health-pack respawns, and stronger pre-final turrets.

## Final Control and Balance Notes

- In-game keyboard shortcuts no longer return directly to the main menu. This reduces accidental exits during combat or training. Main-menu return is handled through visible UI buttons only.
- Phase 4's 360-degree sweep ray has been slowed down further so it reads more like a final-protocol hazard than an instant unavoidable check.
- The large Holy Clearance variant has been removed. Holy Clearance now uses the small projectile profile even during five-shot pressure patterns. The volley chain is capped at 4 and each volley is capped at 4 projectiles.

## Latest Fix Notes

- The red Phase 4 screen-border warning is now drawn with a screen-space graphics object using the active camera viewport, so it aligns with the visible game screen.
- Holy Clearance tree blocking was rebuilt to be redundant: it checks every projectile update and again immediately before player damage. It uses expanded boss-to-player and projectile-path line checks so the full 4-volley pattern can be blocked by White Trees.
- Phases 1-3 were lengthened by lowering natural decay, while their attack pressure was raised through shorter decision delays and lower cooldown multipliers. This prevents the first three phases from ending before the boss can use enough attacks.
- The custom `Iron_Liturgy.mp3` BGM is now included and configured as the main boss track. Phase decay and transition timing have been retuned around its measured 173.1-second length.

## Final Stability Fix: Phase Progression and Holy Clearance Tree Blocking
- Phase progression now advances by either the intended music timeline or the boss health threshold. This prevents the fight from remaining in Phase I if the health clamp/timing floor prevents a threshold crossing.
- Holy Clearance was rebuilt to use the same projectile/tree blocking contract as the rest of the boss projectiles. Each Holy Clearance shot checks its last-frame path, full travel path, and Boss-to-player line before it can damage the player.
- Holy Clearance uses an enlarged tree interception rectangle so four-shot/five-shot style volleys cannot slip through the White Tree due to high projectile speed or small hitboxes.

## Final Stability Patch Notes

- Phase transition camera handling now uses a no-zoom reset path. During phase shifts the boss briefly stops and emits three colored pulses, then the camera is forcibly restored to the combat zoom and player follow target before control returns.
- Holy Clearance has been rebuilt as a tree-first projectile rule: before any Holy Clearance bullet can damage the player, it checks a defensive corridor from the boss to the player. If a blessing tree is between them, the tree takes the hit and the projectile is destroyed. This applies to every volley and every small Holy Clearance projectile.
- Player health remains configured as 7 HP and the HUD label remains HEALTH.


## Final Stability Patch Notes
- Phase IV sweep ray death now force-clears sweep tweens and visual layers before entering the failure screen, preventing the final-stage death freeze.
- Holy Clearance was rebuilt as a tree-first projectile: every bullet checks the current path, future path to the player, boss-to-player shield corridor, and newly spawned trees. If a blessing tree is in the defensive corridor, the projectile is consumed by the tree before reaching the player.
- Phase I now demonstrates Destruction Blast and Annihilation Slash early so players can learn these attacks before later phases combine them with heavier pressure.
- Phase transitions keep the three colored boss pulses but use a softer camera pan, larger readable titles, and lower shake to feel less abrupt.

## Music Timing and Gravity Range Patch

- The boss phase timeline was tightened around `Iron_Liturgy.mp3` so the fight no longer overruns the 173.1-second track. Phase IV now begins slightly earlier, at about 151 seconds, and the final-protocol countdown is shortened to 15 seconds so the self-destruct transition lands closer to the end of the music.
- Health-based phase advancement is now gated by a small timing grace window. The boss can still advance early if the player is strong, but it cannot skip far ahead of the BGM structure and make the music feel mismatched.
- Gravity Field radius was reduced from 520 to 380 world units. The field still disables movement skills while affected, but its battlefield coverage is smaller and easier to route around.


## Final Timing Patch

Boss phase progression is now controlled by the music timeline only. Phase II, Phase III, and Phase IV are forced at the configured `phaseTimelineSeconds` marks, rather than by boss HP thresholds. This prevents the fight from getting stuck in Phase I and keeps the encounter aligned with `Iron_Liturgy.mp3`.

Holy Clearance no longer displays a large skill-name warning text when cast. The attack keeps its projectile/audio warning, but the repeated text pop-up was removed to reduce UI noise.


## Final Music Timeline Patch

The boss phase system now uses a pure music timeline rather than player damage or HP thresholds. Phase changes occur at 43 seconds, 83 seconds, and 133 seconds to match the requested BGM structure. Holy Clearance no longer displays a repeated skill-name text warning; only the projectile visuals/audio remain.


### Final timing patch
- Boss phases now use a pure music timeline: Phase II at 43s, Phase III at 83s, and Phase IV at 133s.
- Phase IV now uses a 38 second final protocol window so the last phase runs close to the end of `Iron_Liturgy.mp3` instead of ending early.
- Phase transitions now force-clear active hostile skills, projectiles, ray visuals, gravity visuals, turrets, and pending attack timers before the pulse animation plays. This prevents old attacks from continuing through a phase-change animation.
- Scripted Phase IV laser walls are no longer stored as normal hostile cleanup objects, so another skill cleanup cannot delete a left/right or top/down laser wall before it reaches the far side of the screen.
