import json
from pathlib import Path
from types import SimpleNamespace

import yaml

from scripts.train import train_model


def fake_yolo_factory(tmp_path, calls=None, metrics=None):
    calls = [] if calls is None else calls

    class FakeYOLO:
        def __init__(self, weights):
            self.weights = weights
            self.train_kwargs = None
            self.snapshot = {}
            calls.append(self)

        def train(self, **kwargs):
            self.train_kwargs = kwargs
            root = Path(kwargs["data"]).parent
            self.snapshot = {
                path.relative_to(root).as_posix(): path.read_bytes()
                for path in root.rglob("*")
                if path.is_file()
            }
            run_dir = tmp_path / "run"
            (run_dir / "weights").mkdir(parents=True, exist_ok=True)
            (run_dir / "weights" / "best.pt").write_bytes(b"fake-weights")
            self.trainer = SimpleNamespace(save_dir=str(run_dir))
            return {"map50": 0.75} if metrics is None else metrics

    return FakeYOLO


def make_file_list_dataset(root: Path) -> Path:
    for split, count in (("train", 3), ("valid", 2)):
        (root / split / "images").mkdir(parents=True)
        (root / split / "labels").mkdir(parents=True)
        names = []
        for index in range(count):
            name = f"img{index}.jpg"
            names.append(f"{split}/images/{name}")
            (root / split / "images" / name).write_bytes(b"image")
            (root / split / "labels" / f"img{index}.txt").write_text(
                "0 0.5 0.5 0.2 0.2\n", encoding="utf-8"
            )
        (root / f"{split}.txt").write_text(
            "".join(f"{name}\n" for name in names), encoding="utf-8"
        )
    data_yaml = root / "data.yaml"
    data_yaml.write_text(
        "path: .\ntrain: train.txt\nval: valid.txt\ntest: test.txt\n"
        "nc: 2\nnames: [item-a, item-b]\n",
        encoding="utf-8",
    )
    return data_yaml


def test_train_model_writes_artifact_and_metadata(tmp_path, monkeypatch):
    monkeypatch.setattr("scripts.train.YOLO", fake_yolo_factory(tmp_path))
    data_yaml = tmp_path / "data.yaml"
    data_yaml.write_text("nc: 1114\nnames: [item-a, item-b]\n", encoding="utf-8")

    out = train_model(data_yaml, tmp_path / "art", epochs=1)

    assert out.name == "cv-best.pt"
    assert out.read_bytes() == b"fake-weights"
    meta = json.loads((tmp_path / "art" / "metadata.json").read_text(encoding="utf-8"))
    assert meta["model_version"] and meta["nc"] == 1114
    assert meta["names"] == ["item-a", "item-b"]
    assert meta["metrics"] == {"map50": 0.75}
    assert meta["trained_at"]


def test_train_model_uses_yolo26n_base_and_requested_training_config(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr("scripts.train.YOLO", fake_yolo_factory(tmp_path, calls))
    data_yaml = tmp_path / "data.yaml"
    data_yaml.write_text("nc: 2\nnames: [a, b]\n", encoding="utf-8")

    train_model(data_yaml, tmp_path / "art", epochs=7, imgsz=320)

    assert len(calls) == 1
    assert calls[0].weights == "yolo26n.pt"
    assert calls[0].train_kwargs == {
        "data": str(data_yaml),
        "epochs": 7,
        "imgsz": 320,
    }


def test_limit_images_copies_subset_and_rewrites_yaml(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr("scripts.train.YOLO", fake_yolo_factory(tmp_path, calls))
    source = tmp_path / "src"
    data_yaml = make_file_list_dataset(source)

    train_model(data_yaml, tmp_path / "art", epochs=1, limit_images=2)

    snapshot = calls[0].snapshot
    assert yaml.safe_load(snapshot["data.yaml"]) == {
        "path": ".",
        "train": "train.txt",
        "val": "valid.txt",
        "test": "test.txt",
        "nc": 2,
        "names": ["item-a", "item-b"],
    }
    assert snapshot["train.txt"].decode().splitlines() == [
        "train/images/img0.jpg",
        "train/images/img1.jpg",
    ]
    assert snapshot["valid.txt"].decode().splitlines() == [
        "valid/images/img0.jpg",
        "valid/images/img1.jpg",
    ]
    assert "train/images/img2.jpg" not in snapshot
    assert "train/labels/img0.txt" in snapshot
    assert "train/labels/img2.txt" not in snapshot
    assert (source / "train.txt").read_text(encoding="utf-8").count("img") == 3


def test_cli_accepts_artifacts_alias(tmp_path, monkeypatch):
    from scripts.train import main

    seen = {}

    def fake_train_model(data_yaml, output_dir, epochs=30, imgsz=640, limit_images=None):
        seen.update(
            data=data_yaml,
            output=output_dir,
            epochs=epochs,
            imgsz=imgsz,
            limit_images=limit_images,
        )
        return output_dir / "cv-best.pt"

    monkeypatch.setattr("scripts.train.train_model", fake_train_model)

    main(
        [
            "--data",
            "data/cleaned/data.yaml",
            "--artifacts",
            str(tmp_path / "art"),
            "--epochs",
            "1",
            "--limit-images",
            "200",
        ]
    )

    assert seen == {
        "data": Path("data/cleaned/data.yaml"),
        "output": tmp_path / "art",
        "epochs": 1,
        "imgsz": 640,
        "limit_images": 200,
    }
