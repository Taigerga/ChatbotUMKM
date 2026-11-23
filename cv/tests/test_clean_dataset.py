from pathlib import Path

import yaml

from scripts.clean_dataset import clean_dataset

SPLITS = ("train", "valid", "test")


def make_tiny_source(root: Path) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    (root / "data.yaml").write_text(
        "train: ../train/images\nval: ../valid/images\ntest: ../test/images\n"
        "nc: 2\nnames: ['saus-a', 'mie-b']\n",
        encoding="utf-8",
    )
    images = {
        # v5- -> bucket 73 (valid); two frames of same video must stay together.
        "v5-_mp4-0000_jpg.rf.a.jpg": "0 0.5 0.5 0.2 0.2\n1 0.5 0.5 0.0 0.2\n",
        "v5-_mp4-0001_jpg.rf.b.jpg": "1 1.4 -0.2 0.3 0.3\n",
        # v4- -> bucket 87 (test), videoA -> bucket 26 (train, filename fallback).
        "v4-_mp4-0000_jpg.rf.c.jpg": "0 0.2 0.2 0.1 0.1\n",
        "videoA.jpg": "garbage\n1 0.7 0.7 0.1 0.1\n",
    }
    for name, label in images.items():
        (root / "train" / "images").mkdir(parents=True, exist_ok=True)
        (root / "train" / "labels").mkdir(parents=True, exist_ok=True)
        (root / "train" / "images" / name).write_bytes(b"fake-jpeg")
        (root / "train" / "labels" / f"{Path(name).stem}.txt").write_text(label, encoding="utf-8")
    return root


def read_labels(target: Path) -> list[tuple[float, ...]]:
    rows = []
    for split in SPLITS:
        for path in (target / split / "labels").glob("*.txt"):
            for line in path.read_text(encoding="utf-8").splitlines():
                parts = line.split()
                if parts:
                    rows.append(tuple(float(part) for part in parts[1:]))
    return rows


def source_key_of_images(target: Path) -> dict[str, set[str]]:
    mapping: dict[str, set[str]] = {}
    for split in SPLITS:
        for rel in (target / f"{split}.txt").read_text(encoding="utf-8").splitlines():
            stem = Path(rel).stem
            key = stem.split("_mp4-", 1)[0] if "_mp4-" in stem else stem
            mapping.setdefault(key, set()).add(split)
    return mapping


def test_clean_dataset_fixes_boxes_and_prevents_source_leakage(tmp_path):
    source = make_tiny_source(tmp_path / "src")
    target = tmp_path / "clean"

    stats = clean_dataset(source, target)

    assert stats == {
        "images": 4,
        "labels": 4,
        "clamped": 1,
        "dropped_zero": 1,
        "groups": 3,
        "split_counts": {"train": 1, "valid": 2, "test": 1},
    }
    rows = read_labels(target)
    assert all(len(row) == 4 and all(0 <= v <= 1 for v in row) and row[2] > 0 and row[3] > 0 for row in rows)
    keys = source_key_of_images(target)
    assert all(len(splits) == 1 for splits in keys.values())
    assert (target / "valid" / "images" / "v5-_mp4-0000_jpg.rf.a.jpg").read_bytes() == b"fake-jpeg"

    for split in SPLITS:
        paths = (target / f"{split}.txt").read_text(encoding="utf-8").splitlines()
        assert all((target / rel).is_file() and rel.startswith(f"{split}/images/") for rel in paths)

    config = yaml.safe_load((target / "data.yaml").read_text(encoding="utf-8"))
    assert config["path"] == "."
    assert config["nc"] == 2
    assert config["names"] == ["saus-a", "mie-b"]
    assert (config["train"], config["val"], config["test"]) == ("train.txt", "valid.txt", "test.txt")


def test_clamps_box_that_extends_past_frame(tmp_path):
    source = tmp_path / "src"
    (source / "train" / "images").mkdir(parents=True)
    (source / "train" / "labels").mkdir(parents=True)
    (source / "data.yaml").write_text("nc: 1\nnames: ['saus-a']\n", encoding="utf-8")
    (source / "train" / "images" / "edge.jpg").write_bytes(b"x")
    (source / "train" / "labels" / "edge.txt").write_text("0 0.875 0.875 0.5 0.5\n", encoding="utf-8")

    stats = clean_dataset(source, tmp_path / "clean")

    assert stats["clamped"] == 1
    assert read_labels(tmp_path / "clean") == [(0.75, 0.75, 0.5, 0.5)]
