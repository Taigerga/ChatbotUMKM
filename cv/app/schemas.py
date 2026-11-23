from pydantic import BaseModel


class Detection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    xmin: float
    ymin: float
    xmax: float
    ymax: float


class ScanResponse(BaseModel):
    width: int
    height: int
    detections: list[Detection]
    model_version: str
