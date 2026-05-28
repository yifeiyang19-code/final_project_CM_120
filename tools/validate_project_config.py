#!/usr/bin/env python3
"""Validate project JSON files before submission."""

import json
import sys
from pathlib import Path

REQUIRED_CONFIG_KEYS = ["physics", "player", "boss", "assets", "rendering"]
REQUIRED_METADATA_KEYS = ["version", "sprites"]


def load_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:  # noqa: BLE001 - tool reports the exact parse/load issue
        raise SystemExit(f"ERROR: {path} could not be parsed: {exc}") from exc


def require_keys(name, obj, keys):
    missing = [key for key in keys if key not in obj]
    if missing:
        raise SystemExit(f"ERROR: {name} missing keys: {', '.join(missing)}")


def main():
    root = Path(__file__).resolve().parents[1]
    config = load_json(root / "assets/data/game_config.json")
    metadata = load_json(root / "assets/data/sprite_metadata.json")
    arena = load_json(root / "assets/tilemaps/MorningStarPort.json")

    require_keys("game_config.json", config, REQUIRED_CONFIG_KEYS)
    require_keys("sprite_metadata.json", metadata, REQUIRED_METADATA_KEYS)

    assets = config.get("assets", {})
    for group in ("images", "json", "tilemaps", "audio"):
        for key, rel_path in assets.get(group, {}).items():
            candidate = root / rel_path
            if not candidate.exists():
                raise SystemExit(f"ERROR: asset path missing for {group}.{key}: {rel_path}")

    layer_names = {layer.get("name") for layer in arena.get("layers", [])}
    required_layers = {
        "BackgroundImage",
        "Solid",
        "Ladders",
        "Spawns",
    }
    missing_layers = sorted(required_layers - layer_names)
    if missing_layers:
        raise SystemExit(f"ERROR: MorningStarPort.json missing Tiled layers: {', '.join(missing_layers)}")

    tilesets = arena.get("tilesets", [])
    if not tilesets:
        raise SystemExit("ERROR: MorningStarPort.json has no tilesets")

    tile_properties = {
        tile.get("id"): {prop.get("name"): prop.get("value") for prop in tile.get("properties", [])}
        for tile in tilesets[0].get("tiles", [])
    }
    if tile_properties.get(0, {}).get("collides") is not True:
        raise SystemExit("ERROR: MorningStarPort solid collision tile must define collides=true")

    gravity = config.get("physics", {}).get("gravityY")
    if not isinstance(gravity, (int, float)) or gravity <= 0:
        raise SystemExit("ERROR: physics.gravityY must be a positive number")

    sprites = metadata.get("sprites", {})
    if not sprites:
        raise SystemExit("ERROR: sprite_metadata.json has no sprites")

    audio_cfg = config.get("audio", {})
    if not isinstance(audio_cfg.get("cues", {}), dict):
        raise SystemExit("ERROR: audio.cues must be an object")

    print("Project JSON validation passed.")


if __name__ == "__main__":
    main()
