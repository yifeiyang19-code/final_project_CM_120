export default class SpriteMetadataRegistry {
  constructor(scene) {
    this.scene = scene;
    this.data = scene.cache?.json?.get("sprite_metadata") || { sprites: {} };
    this.animationIndex = new Map();
    this.buildAnimationIndex();
  }

  buildAnimationIndex() {
    const sprites = this.data.sprites || {};

    Object.entries(sprites).forEach(([spriteKey, spriteData]) => {
      const sequences = spriteData.sequences || {};

      Object.entries(sequences).forEach(([sequenceKey, sequence]) => {
        if (!sequence.animation) return;
        this.animationIndex.set(sequence.animation, {
          spriteKey,
          sequenceKey,
          spriteData,
          sequence
        });
      });
    });
  }

  getSequence(spriteKey, sequenceKey) {
    return this.data.sprites?.[spriteKey]?.sequences?.[sequenceKey] || null;
  }

  getSequenceForAnimation(animationKey) {
    return this.animationIndex.get(animationKey) || null;
  }

  attach(sprite, spriteKey, options = {}) {
    if (!sprite) return null;

    const controller = new SpriteMetadataAttachment(this, sprite, spriteKey, options);
    sprite.setData("spriteMetadata", controller);
    controller.applyCurrentFrame();
    return controller;
  }
}

class SpriteMetadataAttachment {
  constructor(registry, sprite, spriteKey, options = {}) {
    this.registry = registry;
    this.scene = registry.scene;
    this.sprite = sprite;
    this.spriteKey = spriteKey;
    this.options = {
      applyHitbox: options.applyHitbox !== false,
      applyRegistration: options.applyRegistration !== false,
      applyHurtboxData: options.applyHurtboxData !== false
    };

    this.lastAnimationKey = null;
    this.lastFrameIndex = null;
    this.lastFlipX = null;
    this.lastDelta = { x: 0, y: 0 };
    this.lastSoundTriggerKey = null;

    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.applyCurrentFrame());
    sprite.on(Phaser.Animations.Events.ANIMATION_START, () => this.applyCurrentFrame());
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.applyCurrentFrame());
  }

  applyCurrentFrame() {
    const sprite = this.sprite;
    if (!sprite || !sprite.active) return;

    const meta = this.getCurrentFrameMetadata();
    if (!meta) return;

    const animationKey = this.sprite.anims?.currentAnim?.key || null;
    const flipX = Boolean(this.sprite.flipX);
    const unchanged = (
      this.lastAnimationKey === animationKey &&
      this.lastFrameIndex === meta.frameIndex &&
      this.lastFlipX === flipX
    );

    if (unchanged) return;

    this.lastAnimationKey = animationKey;
    this.lastFrameIndex = meta.frameIndex;
    this.lastFlipX = flipX;

    if (this.options.applyRegistration) {
      this.applyRegistration(meta);
    }

    if (this.options.applyHitbox) {
      this.applyHitbox(meta);
    }

    if (this.options.applyHurtboxData) {
      const hurtbox = meta.frame?.interactionBox?.hurtbox || meta.frame?.interactionBox?.hitbox || null;
      sprite.setData("hurtbox", hurtbox);
      sprite.setData("hitbox", meta.frame?.interactionBox?.hitbox || null);
    }

    this.emitFrameSoundTrigger(meta);
  }

  getCurrentFrameMetadata() {
    const sprite = this.sprite;
    const animationKey = sprite.anims?.currentAnim?.key || null;
    const rawFrameIndex = sprite.anims?.currentFrame?.textureFrame ?? sprite.frame?.name ?? 0;
    const parsedFrameIndex = Number.parseInt(rawFrameIndex, 10);

    let descriptor = animationKey
      ? this.registry.getSequenceForAnimation(animationKey)
      : null;

    if (!descriptor) {
      const spriteData = this.registry.data.sprites?.[this.spriteKey];
      const defaultSequence = spriteData?.defaultSequence;
      const sequence = defaultSequence ? spriteData?.sequences?.[defaultSequence] : null;
      if (!spriteData || !sequence) return null;
      descriptor = {
        spriteKey: this.spriteKey,
        sequenceKey: defaultSequence,
        spriteData,
        sequence
      };
    }

    const sequence = descriptor.sequence;
    const frames = sequence.frames || [];
    const numericFrame = Number.isFinite(parsedFrameIndex) ? parsedFrameIndex : 0;
    const frame = frames.find((entry) => entry.index === numericFrame) || frames[0];

    if (!frame) return null;

    return {
      ...descriptor,
      frame,
      frameIndex: numericFrame
    };
  }

  applyRegistration(meta) {
    const sprite = this.sprite;
    const sequence = meta.sequence;
    const frame = meta.frame;
    const frameWidth = meta.spriteData.frameWidth || sprite.frame?.width || sprite.width || 1;
    const frameHeight = meta.spriteData.frameHeight || sprite.frame?.height || sprite.height || 1;
    const globalOrigin = sequence.globalOrigin || { x: frameWidth * 0.5, y: frameHeight };
    const frameOrigin = frame.frameOrigin || globalOrigin;
    const pivotOffset = sequence.pivotOffset || frame.pivotOffset || { x: 0, y: 0 };
    const baseOriginX = globalOrigin.x / frameWidth;
    const mirroredOriginX = 1 - baseOriginX;
    const originX = sprite.flipX ? mirroredOriginX : baseOriginX;
    const delta = {
      x: sprite.flipX
        ? -(globalOrigin.x - frameOrigin.x + (pivotOffset.x || 0))
        : (globalOrigin.x - frameOrigin.x + (pivotOffset.x || 0)),
      y: globalOrigin.y - frameOrigin.y + (pivotOffset.y || 0)
    };

    sprite.setOrigin(originX, globalOrigin.y / frameHeight);
    sprite.setData("registrationDelta", delta);
    sprite.setData("pivotOffset", pivotOffset);
    this.lastDelta = delta;
  }

  emitFrameSoundTrigger(meta) {
    const trigger = meta.frame?.soundTriggerFrame || meta.frame?.sound_trigger_frame || null;
    if (!trigger) return;

    const key = `${meta.sequenceKey}:${meta.frameIndex}:${trigger}`;
    if (this.lastSoundTriggerKey === key) return;

    this.lastSoundTriggerKey = key;
    this.scene.events.emit("sprite-frame-sound", {
      sprite: this.sprite,
      spriteKey: this.spriteKey,
      sequenceKey: meta.sequenceKey,
      frameIndex: meta.frameIndex,
      sound: trigger
    });
  }

  applyHitbox(meta) {
    const sprite = this.sprite;
    if (!sprite.body || !sprite.body.setSize) return;

    const hitbox = meta.frame?.interactionBox?.hitbox;
    if (!hitbox) return;

    sprite.body.setSize(hitbox.w, hitbox.h);

    const offsetX = sprite.flipX
      ? (meta.spriteData.frameWidth || sprite.frame.width) - hitbox.x - hitbox.w
      : hitbox.x;

    if (sprite.body.setOffset) {
      sprite.body.setOffset(offsetX, hitbox.y);
    }
  }
}
