# Morningstar Port

A Phaser 3 boss-fight platformer set in the ruined Morningstar Port.

## How to Run

Use a local web server. In VS Code, open the project folder and run Live Server on `index.html`.

## Controls

- A / D: Move
- W / Space: Jump
- Double-tap A / D / W / S: Dash
- Q: Blink to cursor
- Left mouse swipe near terrain: Grow a white tree
- R / Enter / F: Restart after defeat or victory
- Esc: Pause

## Goal

Survive and defeat the four-phase guardian boss. The final phase escalates into thunderstorm pressure and a self-destruction finale. White trees can block Holy Clearance, beams, and hostile projectiles.

## Main Files

- `src/Scenes/MenuScene.js`: Main menu
- `src/Scenes/BossScene.js`: Main fight scene
- `src/Scenes/TrainingScene.js`: Skill practice room
- `assets/data/game_config.json`: Core balance configuration
- `src/PlayerAbilities/PlayerAbilityConfig.js`: Player movement and white tree tuning
- `src/Systems/BossAttackLoop.js`: Boss skill selection logic
