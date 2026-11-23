"""Latih YOLO26n pada dataset PhantomStock dan tulis artefak CV."""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

import yaml

BASE_MODEL = "yolo26n.pt"

YOLO: Any = None  # resolved lazily; tests monkeypatch this name


def _yolo_class():
    if YOLO is not None:
        return YOLO
    from ultralytics import YOLO as real_yolo

    return real_yolo


def _metrics(results: Any) -> dict:
    if isinstance(results, dict):
        return dict(results)
    values = getattr(results, "results_dict", None)
    return dict(values) if isinstance(values, dict) else {}


def _class_names(names: Any) -> list:
    if isinstance(names, dict):
        return [names[key] for key in sorted(names, key=lambda key: int(key))]
    return list(names)


def _copy_subset(data_yaml: Path, limit_images: int, temp_root: Path) -> Path:
    config = yaml.safe_load(data_yaml.read_text(encoding="utf-8"))
    target = temp_root / "data"

    for split in ("train", "val", "test"):
        value = config.get(split)
        if not isinstance(value, str) or not value.endswith(".txt"):
            continue
        source_list = data_yaml.parent / value
        if not source_list.is_file():
            continue
        selected = [
            line.strip()
            for line in source_list.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ][:limit_images]
        kept = []
        for relative in selected:
            image = data_yaml.parent / relative
            if not image.is_file():
                raise FileNotFoundError(image)
            label = image.parent.parent / "labels" / f"{image.stem}.txt"
            destination = target / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(image, destination)
            if label.is_file():
                label_target = destination.parent.parent / "labels" / label.name
                label_target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(label, label_target)
            kept.append(relative)
        list_target = target / value
        list_target.parent.mkdir(parents=True, exist_ok=True)
        list_target.write_text(
            "".join(f"{line}\n" for line in kept), encoding="utf-8"
        )

    config["path"] = "."
    prepared = target / data_yaml.name
    prepared.parent.mkdir(parents=True, exist_ok=True)
    prepared.write_text(
        yaml.safe_dump(config, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    return prepared


@contextmanager
def _training_data(data_yaml: Path, limit_images: int | None) -> Iterator[Path]:
    if limit_images is None:
        yield data_yaml
        return
    with tempfile.TemporaryDirectory(prefix="cv-train-") as temp_dir:
        yield _copy_subset(data_yaml, limit_images, Path(temp_dir))


def train_model(
    data_yaml: Path,
    output_dir: Path,
    epochs: int = 30,
    imgsz: int = 640,
    limit_images: int | None = None,
) -> Path:
    data_yaml = Path(data_yaml)
    output_dir = Path(output_dir)
    config = yaml.safe_load(data_yaml.read_text(encoding="utf-8"))

    with _training_data(data_yaml, limit_images) as training_yaml:
        model = _yolo_class()(BASE_MODEL)
        results = model.train(data=str(training_yaml), epochs=epochs, imgsz=imgsz)

    output_dir.mkdir(parents=True, exist_ok=True)
    best = Path(model.trainer.save_dir) / "weights" / "best.pt"
    artifact = output_dir / "cv-best.pt"
    shutil.copy2(best, artifact)

    metadata = {
        "model_version": BASE_MODEL,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "nc": config["nc"],
        "names": _class_names(config["names"]),
        "metrics": _metrics(results),
    }
    (output_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return artifact


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument(
        "--artifacts", "--output-dir", dest="output_dir", type=Path, required=True
    )
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--limit-images", type=int, default=None)
    args = parser.parse_args(argv)
    artifact = train_model(
        args.data, args.output_dir, args.epochs, args.imgsz, args.limit_images
    )
    print(artifact)


if __name__ == "__main__":
    main()
