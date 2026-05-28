export default class DebugDraw {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.graphics = scene.add.graphics().setDepth(5000).setScrollFactor(1);
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    this.graphics.clear();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  update() {
    if (!this.enabled) return;

    this.graphics.clear();
    this.drawSprite(this.scene.player, 0xff3030, 0x3df7ff);
    this.drawSprite(this.scene.boss, 0xff8844, 0xa47cff);

    this.drawCollisionBodies();

    if (Array.isArray(this.scene.ladderZones)) {
      this.graphics.lineStyle(2, 0x39ff88, 0.85);
      this.scene.ladderZones.forEach((zone) => {
        if (!zone || !zone.active) return;
        this.graphics.strokeRect(
          zone.x - zone.width * 0.5,
          zone.y - zone.height * 0.5,
          zone.width,
          zone.height
        );
      });
    }
  }

  drawCollisionBodies() {
    const bodies = this.scene.collisionDebugBodies || [];

    bodies.forEach((object) => {
      if (!object || !object.active || !object.body) return;

      const isPlatform = object.collisionKind === "platform";
      const color = isPlatform ? 0x3df7ff : 0xffcc33;
      const alpha = isPlatform ? 0.9 : 0.72;

      this.graphics.lineStyle(2, color, alpha);
      this.graphics.strokeRect(
        object.body.x,
        object.body.y,
        object.body.width,
        object.body.height
      );

      if (isPlatform) {
        this.graphics.lineStyle(1, 0xffffff, 0.45);
        this.graphics.lineBetween(
          object.body.x,
          object.body.y,
          object.body.x + object.body.width,
          object.body.y
        );
      }
    });
  }

  drawSprite(sprite, hitColor, hurtColor) {
    if (!sprite || !sprite.active || !sprite.body) return;

    this.graphics.lineStyle(2, hitColor, 0.95);
    this.graphics.strokeRect(sprite.body.x, sprite.body.y, sprite.body.width, sprite.body.height);

    const hurtbox = sprite.getData?.("hurtbox");
    if (!hurtbox) return;

    const frameWidth = sprite.frame?.width || sprite.width || 1;
    const scaleX = Math.abs(sprite.scaleX || 1);
    const scaleY = Math.abs(sprite.scaleY || 1);
    const originX = sprite.originX * frameWidth * scaleX;
    const originY = sprite.originY * (sprite.frame?.height || sprite.height || 1) * scaleY;
    const x = sprite.flipX
      ? sprite.x - originX + (frameWidth - hurtbox.x - hurtbox.w) * scaleX
      : sprite.x - originX + hurtbox.x * scaleX;
    const y = sprite.y - originY + hurtbox.y * scaleY;

    this.graphics.lineStyle(2, hurtColor, 0.75);
    this.graphics.strokeRect(x, y, hurtbox.w * scaleX, hurtbox.h * scaleY);
  }
}
