#!/usr/bin/env node






const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const metadataPath = path.join(root, "assets", "data", "sprite_metadata.json");
const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

const stableBody = { x: 12, y: 46, w: 34, h: 70 };
const player = metadata.sprites?.player;
if (!player?.sequences) {
  console.error("No player sequences found in sprite metadata.");
  process.exit(1);
}

function inside(inner, outer) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

const failures = [];
for (const [sequenceName, sequence] of Object.entries(player.sequences)) {
  for (const frame of sequence.frames || []) {
    const hurtbox = frame.interactionBox?.hurtbox;
    if (!hurtbox) continue;
    if (!inside(hurtbox, stableBody)) {
      failures.push({ sequenceName, frame: frame.index, hurtbox });
    }
  }
}

if (failures.length > 0) {
  console.error("Player hurtbox verification failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.sequenceName} frame ${failure.frame}: ` +
      JSON.stringify(failure.hurtbox) +
      ` is outside stable body ${JSON.stringify(stableBody)}`
    );
  }
  process.exit(1);
}

console.log(`Player hurtbox verification passed. Checked stable body ${JSON.stringify(stableBody)}.`);
