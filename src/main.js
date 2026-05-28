import BootScene from "./Scenes/BootScene.js";
import MenuScene from "./Scenes/MenuScene.js";
import BossScene from "./Scenes/BossScene.js";
import TrainingScene from "./Scenes/TrainingScene.js";

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game-container",
  backgroundColor: "#000000",
  pixelArt: true,
  roundPixels: true,

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [
    BootScene,
    MenuScene,
    BossScene,
    TrainingScene
  ]
};

new Phaser.Game(config);
