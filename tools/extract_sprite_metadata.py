#!/usr/bin/env python3
"""
Extract rough sprite-frame bounding boxes from a spritesheet and export metadata JSON.

Usage:
  python tools/extract_sprite_metadata.py assets/images/player/player_run.png \
      --frame-width 128 --frame-height 128 --sprite-key player_run \
      --output tools/player_run_metadata.json

The script detects non-transparent pixels per frame, estimates a bottom-center pivot,
and writes an editable descriptor. It is intentionally conservative: the exported
hitbox is a first pass, not a final hand-authored collision solution.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

from PIL import Image


def detect_bbox(frame: Image.Image, alpha_threshold: int) -> Dict[str, int]:
    rgba = frame.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    min_x, min_y = width, height
    max_x, max_y = -1, -1

    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] > alpha_threshold:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return {"x": 0, "y": 0, "w": 0, "h": 0}

    return {
        "x": min_x,
        "y": min_y,
        "w": max_x - min_x + 1,
        "h": max_y - min_y + 1,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("--frame-width", type=int, required=True)
    parser.add_argument("--frame-height", type=int, required=True)
    parser.add_argument("--sprite-key", default=None)
    parser.add_argument("--animation", default=None)
    parser.add_argument("--output", type=Path, default=Path("sprite_metadata_extract.json"))
    parser.add_argument("--alpha-threshold", type=int, default=8)
    args = parser.parse_args()

    image = Image.open(args.image).convert("RGBA")
    cols = image.width // args.frame_width
    rows = image.height // args.frame_height
    total = cols * rows

    frames: List[Dict] = []
    bottom_points = []

    for index in range(total):
        col = index % cols
        row = index // cols
        crop = image.crop((
            col * args.frame_width,
            row * args.frame_height,
            (col + 1) * args.frame_width,
            (row + 1) * args.frame_height,
        ))
        bbox = detect_bbox(crop, args.alpha_threshold)
        origin = {
            "x": bbox["x"] + bbox["w"] // 2 if bbox["w"] else args.frame_width // 2,
            "y": bbox["y"] + bbox["h"] if bbox["h"] else args.frame_height,
        }
        bottom_points.append(origin)
        frames.append({
            "index": index,
            "frameOrigin": origin,
            "interactionBox": {
                "hitbox": bbox,
                "hurtbox": bbox,
            },
        })

    global_origin = {
        "x": round(sum(p["x"] for p in bottom_points) / len(bottom_points)),
        "y": round(sum(p["y"] for p in bottom_points) / len(bottom_points)),
    }

    output = {
        "spriteKey": args.sprite_key or args.image.stem,
        "texture": args.image.stem,
        "animation": args.animation,
        "frameWidth": args.frame_width,
        "frameHeight": args.frame_height,
        "globalOrigin": global_origin,
        "frames": frames,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output} ({total} frames)")


if __name__ == "__main__":
    main()
