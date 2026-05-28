export default class DialogueManager {
  constructor(scene, speakerProvider) {
    this.scene = scene;
    this.speakerProvider = speakerProvider;

    this.activeText = null;
    this.activeBox = null;
    this.activeTween = null;
    this.activeHideEvent = null;

    this.usedLines = new Set();
    this.usedPools = new Map();

    this.linePools = {
      destructionBlast: [
        "Volatile cargo signature detected. Detonation path approved.",
        "Storage Block C-17 remains chemically unstable.",
        "Compatibility audit was requested. Request pending. Request pending.",
        "The first report was delayed. The second was rewritten.",
        "The third report is missing from the cabinet.",
        "Fuel residue ignition sequence confirmed.",
        "Emergency distance was not maintained on the final night.",
        "Morningstar cargo systems remain unsafe. Blast vector locked."
      ],

      annihilationSlash: [
        "Bridge access denied. Cutting traversal route.",
        "Passenger bridge ceremony zone must remain sealed.",
        "Families were allowed near the bridge. Protocol error unresolved.",
        "Upper-span movement will be removed.",
        "A child was registered on this crossing. Registry damaged.",
        "Blade arc calculated across the access lane.",
        "No safe passage existed through this sector.",
        "The bridge survived. The people did not."
      ],

      massEnergyTurrets: [
        "Perimeter turrets reactivating.",
        "Guardian Network assigning fire lanes.",
        "Rescue drones were previously destroyed in this sector.",
        "Family search parties are classified as trespassers.",
        "Line-of-sight control returning to the port.",
        "Restricted zone weapons released.",
        "Movement inside the exclusion zone is being tracked.",
        "Protection order survives. Mourning protocol absent."
      ],

      gravityField: [
        "Launch gravity system inverted.",
        "Emergency anchor field released.",
        "The towers were built to endure. Flesh was not.",
        "Transport platforms attempted repair for days after the blast.",
        "The port will hold you in place.",
        "Escape angle rejected by gravity control.",
        "Morningstar launch systems are no longer lifting anything.",
        "The strongest structures remained. The living did not."
      ],

      purgeProtocol: [
        "Drone sweep incoming.",
        "Aerial purge route confirmed.",
        "Drone units originally tasked with chemical containment in Storage Block C-17.",
        "Reissuing fire suppression protocol. Original responders did not return.",
        "Departure ceremony participants must remain in designated zones.",
        "Passenger registry incomplete. Sweeping for unaccounted children.",
        "Containment grid descending.",
        "No rescue route remains inside the sealed zone."
      ],

      holyClearance: [
        "Suppressive fire authorized.",
        "Clearance rounds deployed.",
        "First responders entered without a complete manifest.",
        "They went in blind. Guardian archive confirms no correction.",
        "Warning shots are no longer part of protocol.",
        "Perimeter denial fire active.",
        "Access lane will be erased.",
        "Panic response irrelevant. Purge pattern continues."
      ],

      menacingAdvance: [
        "Direct interception initiated.",
        "Guardian unit closing distance.",
        "Trespasser classification matches survivor anomaly.",
        "You ran from the fall.",
        "One guardian body is sufficient for collision.",
        "Do not approach the sealed core.",
        "The port still has walls.",
        "A protector that cannot mourn can only strike."
      ],

      rayOfOblivion: [
        "Focused beam charging.",
        "Line-of-sight exclusion active.",
        "White light event archived. Shadow data erased.",
        "Second blast signature reconstructed.",
        "Laser corridor established.",
        "Guardian optic array aligned.",
        "Obstruction check complete. Beam released.",
        "Not like fire. Not like morning."
      ],

      pressureCombo: [
        "Multiple guardian protocols overlapping.",
        "Defense routines desynchronized.",
        "Port control system entering unstable sequence.",
        "Layered containment response active.",
        "Guardian Network error: grief not recognized.",
        "Command conflict unresolved. Continuing attack.",
        "Emergency procedures stacking beyond safe limits.",
        "The port is still repeating the night it failed."
      ],

      playerBlessingTree: [
        "Unauthorized vegetation detected. Sanctified material confirmed.",
        "White barrier signature resembles pre-impact blessing record.",
        "Short life-form placed between intruder and terminal force.",
        "Root pattern detected on survivor body. Cost accumulating."
      ],

      playerBlink: [
        "Fleeting Re-leave detected. Subject displaced half a step from death.",
        "Unauthorized survival vector recorded.",
        "Trespasser temporarily removed from predicted fatal line."
      ]
    };
  }

  random(poolKey, duration = 2600, options = {}) {
    const pool = this.linePools[poolKey];

    if (!pool || pool.length === 0) {
      return null;
    }

    if (!this.usedPools.has(poolKey)) {
      this.usedPools.set(poolKey, new Set());
    }

    const usedIndexes = this.usedPools.get(poolKey);

    if (usedIndexes.size >= pool.length) {
      return null;
    }

    const availableIndexes = [];

    for (let i = 0; i < pool.length; i++) {
      if (!usedIndexes.has(i)) {
        availableIndexes.push(i);
      }
    }

    const selectedIndex = Phaser.Utils.Array.GetRandom(availableIndexes);
    usedIndexes.add(selectedIndex);

    return this.show(pool[selectedIndex], duration, options);
  }

  sayOnce(text, duration = 2600, options = {}) {
    if (!text) {
      return null;
    }

    if (!options.ignoreOnce && this.usedLines.has(text)) {
      return null;
    }

    if (!options.ignoreOnce) {
      this.usedLines.add(text);
    }

    return this.show(text, duration, options);
  }

  
  
  say(text, duration = 2600, options = {}) {
    return this.sayOnce(text, duration, options);
  }

  show(text, duration = 2600, options = {}) {
    if (!text || !this.scene || (this.scene.gameOver && !options.allowDuringGameOver)) {
      return null;
    }

    const scene = this.scene;
    const camera = scene.cameras.main;
    const speaker = this.getSpeaker();

    const boxWidth = options.boxWidth ?? 880;
    const boxHeight = options.boxHeight ?? 118;
    const zoomSafeScale = options.anchorToSpeaker ? 1 / Math.max(0.25, camera.zoom || 1) : 1;

    let x = options.x ?? camera.width / 2;
    let y = options.y ?? 112;
    let scrollFactor = 0;

    if (options.anchorToSpeaker && speaker && speaker.active) {
      const view = camera.worldView;
      const speakerHeight = Math.max(80, speaker.displayHeight || speaker.height || 96);
      const halfW = (boxWidth * zoomSafeScale) * 0.5;
      const halfH = (boxHeight * zoomSafeScale) * 0.5;
      x = Phaser.Math.Clamp(
        speaker.x + (options.offsetX ?? 0),
        view.left + halfW + 16,
        view.right - halfW - 16
      );
      y = Phaser.Math.Clamp(
        speaker.y - speakerHeight * 0.65 + (options.offsetY ?? -120) * zoomSafeScale,
        view.top + halfH + 22,
        view.bottom - halfH - 22
      );
      scrollFactor = 1;
    }

    const depth = options.depth ?? 6500;

    this.clear();

    this.activeBox = scene.add.rectangle(
      x,
      y,
      boxWidth,
      boxHeight,
      options.backgroundColor ?? 0x03070c,
      options.backgroundAlpha ?? 0.78
    )
      .setScrollFactor(scrollFactor)
      .setDepth(depth)
      .setStrokeStyle(
        options.strokeWidth ?? 2,
        options.strokeColor ?? 0x7df9ff,
        options.strokeAlpha ?? 0.75
      );

    this.activeText = scene.add.text(x, y, text, {
      fontFamily: options.fontFamily ?? "'Cinzel', 'Marcellus SC', serif",
      fontSize: options.fontSize ?? "36px",
      color: options.color ?? "#dff8ff",
      align: "center",
      wordWrap: { width: boxWidth - 48 },
      stroke: options.textStroke ?? "#001018",
      strokeThickness: options.strokeThickness ?? 5
    })
      .setOrigin(0.5)
      .setScrollFactor(scrollFactor)
      .setDepth(depth + 1)
      .setAlpha(0);

    this.activeBox.setAlpha(0);

    if (options.anchorToSpeaker) {
      this.activeBox.setScale(zoomSafeScale);
      this.activeText.setScale(zoomSafeScale);
    }

    if (options.machineVoice) {
      scene.audioCues?.play?.("bossVoiceGlitch", { volume: 0.2, cooldownMs: 900 });
    }

    this.activeTween = scene.tweens.add({
      targets: [this.activeBox, this.activeText],
      alpha: { from: 0, to: 1 },
      duration: options.fadeInDuration ?? 180,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.activeHideEvent = scene.time.delayedCall(duration, () => {
          this.fadeOut(options.fadeOutDuration ?? 220);
        });
      }
    });

    if (speaker && speaker.active && options.flashSpeaker !== false) {
      scene.tweens.add({
        targets: speaker,
        alpha: { from: speaker.alpha, to: 0.72 },
        duration: 70,
        yoyo: true,
        repeat: 2
      });
    }

    return this.activeText;
  }

  fadeOut(duration = 220) {
    if (!this.scene || (!this.activeText && !this.activeBox)) {
      return;
    }

    const targets = [];

    if (this.activeText && this.activeText.active) {
      targets.push(this.activeText);
    }

    if (this.activeBox && this.activeBox.active) {
      targets.push(this.activeBox);
    }

    if (targets.length === 0) {
      this.clear();
      return;
    }

    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.clear();
      }
    });
  }

  clear() {
    if (this.activeHideEvent) {
      this.activeHideEvent.remove(false);
      this.activeHideEvent = null;
    }

    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }

    if (this.activeText && this.activeText.active) {
      this.activeText.destroy();
    }

    if (this.activeBox && this.activeBox.active) {
      this.activeBox.destroy();
    }

    this.activeText = null;
    this.activeBox = null;
  }

  resetUsedDialogue() {
    this.usedLines.clear();
    this.usedPools.clear();
  }

  getSpeaker() {
    if (!this.speakerProvider) {
      return null;
    }

    if (typeof this.speakerProvider === "function") {
      return this.speakerProvider();
    }

    return this.speakerProvider;
  }
}
