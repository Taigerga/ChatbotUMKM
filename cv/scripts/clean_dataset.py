"""Bersihkan label YOLO PhantomStock dan split ulang tanpa leakage video."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

import yaml

SPLITS = ("train", "valid", "test")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
CLAMP_TOL = 1e-9


def source_key(stem: str) -> str:
    return stem.split("_mp4-", 1)[0] if "_mp4-" in stem else stem


def split_for(key: str, seed: int) -> str:
    bucket = int(hashlib.sha1(f"{seed}:{key}".encode("utf-8")).hexdigest(), 16) % 100
    if bucket < 70:
        return "train"
    if bucket < 85:
        return "valid"
    return "test"


def _copy_image(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(source, target)
    except OSError:
        shutil.copy2(source, target)


def _clean_label(source: Path, target: Path, stats: dict) -> None:
    kept = []
    if source.is_file():
        for line in source.read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.split()
            if len(parts) != 5:
                continue
            try:
                class_id = int(parts[0])
                values = [float(part) for part in parts[1:]]
            except ValueError:
                continue
            if any(value < -CLAMP_TOL or value > 1.0 + CLAMP_TOL for value in values):
                stats["clamped"] += 1
            cleaned = [min(1.0, max(0.0, value)) for value in values]
            if cleaned[2] <= 0 or cleaned[3] <= 0:
                stats["dropped_zero"] += 1
                continue
            kept.append(f"{class_id} " + " ".join(str(value) for value in cleaned))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("".join(f"{line}\n" for line in kept), encoding="utf-8")
    stats["labels"] += len(kept)


def clean_dataset(source: Path, target: Path, seed: int = 42) -> dict:
    source, target = Path(source), Path(target)
    config = yaml.safe_load((source / "data.yaml").read_text(encoding="utf-8"))
    stats = {
        "images": 0,
        "labels": 0,
        "clamped": 0,
        "dropped_zero": 0,
        "groups": 0,
        "split_counts": {split: 0 for split in SPLITS},
    }
    lists: dict[str, list[str]] = {split: [] for split in SPLITS}
    groups: set[str] = set()

    for split in SPLITS:
        image_dir = source / split / "images"
        for image in sorted(image_dir.iterdir()) if image_dir.is_dir() else ():
            if not image.is_file() or image.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            key = source_key(image.stem)
            groups.add(key)
            destination = split_for(key, seed)
            relative = Path(destination) / "images" / image.name
            _copy_image(image, target / relative)
            _clean_label(
                source / split / "labels" / f"{image.stem}.txt",
                target / destination / "labels" / f"{image.stem}.txt",
                stats,
            )
            lists[destination].append(relative.as_posix())
            stats["images"] += 1
            stats["split_counts"][destination] += 1

    stats["groups"] = len(groups)
    for split in SPLITS:
        (target / f"{split}.txt").write_text(
            "".join(f"{path}\n" for path in lists[split]), encoding="utf-8"
        )
    output = {
        "path": ".",
        "train": "train.txt",
        "val": "valid.txt",
        "test": "test.txt",
        "nc": config["nc"],
        "names": list(config["names"]),
    }
    (target / "data.yaml").write_text(
        yaml.safe_dump(output, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("../data/computervision/PhantomStock.v1i.yolo26"))
    parser.add_argument("--target", type=Path, default=Path("data/cleaned"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(clean_dataset(args.source, args.target, args.seed)))


if __name__ == "__main__":
    main()
