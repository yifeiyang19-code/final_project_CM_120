#!/usr/bin/env python3
"""Verify sprite metadata frame indices against Phaser animation declarations.

This is an offline guardrail for the JSON-driven hitbox/pivot system. It checks
that every sequence.animation in assets/data/sprite_metadata.json has a matching
animation declaration in BootScene.js and that metadata frame indices fit inside
that declared animation range.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
METADATA = ROOT / "assets" / "data" / "sprite_metadata.json"
BOOT = ROOT / "src" / "Scenes" / "BootScene.js"

ANIM_RE = re.compile(
    r"key:\s*[\"'](?P<key>[^\"']+)[\"'][\s\S]*?generateFrameNumbers\([\s\S]*?\{\s*start:\s*(?P<start>\d+)\s*,\s*end:\s*(?P<end>\d+)\s*\}",
    re.MULTILINE,
)


def load_animation_ranges() -> dict[str, tuple[int, int]]:
    text = BOOT.read_text(encoding="utf-8")
    ranges: dict[str, tuple[int, int]] = {}
    for match in ANIM_RE.finditer(text):
        ranges[match.group("key")] = (int(match.group("start")), int(match.group("end")))
    return ranges


def main() -> int:
    data = json.loads(METADATA.read_text(encoding="utf-8"))
    ranges = load_animation_ranges()
    errors: list[str] = []

    for sprite_key, sprite in (data.get("sprites") or {}).items():
        for sequence_key, sequence in (sprite.get("sequences") or {}).items():
            animation = sequence.get("animation")
            if not animation:
                continue
            if animation not in ranges:
                errors.append(f"{sprite_key}.{sequence_key}: animation '{animation}' is not declared in BootScene.js")
                continue
            start, end = ranges[animation]
            frame_indices = [frame.get("index") for frame in sequence.get("frames", [])]
            bad = [idx for idx in frame_indices if not isinstance(idx, int) or idx < start or idx > end]
            if bad:
                errors.append(
                    f"{sprite_key}.{sequence_key}: metadata frame(s) {bad} outside animation range {start}-{end}"
                )

            if not sequence.get("frames"):
                errors.append(f"{sprite_key}.{sequence_key}: no metadata frames found")

    if errors:
        print("Sprite metadata verification failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Sprite metadata verification passed for {len(ranges)} declared animations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
