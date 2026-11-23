import os

_DEFAULTS = {
    "CV_DATA_DIR": "../data/computervision/PhantomStock.v1i.yolo26",
    "CV_CLEAN_DATA_DIR": "data/cleaned",
    "CV_ARTIFACT_DIR": "artifacts",
    "CV_INTERNAL_TOKEN": "",
    "CV_CONF": 0.25,
    "CV_IMG_SIZE": 640,
    "CV_MAX_UPLOAD_BYTES": 10485760,
}


class _Settings:
    def __getattr__(self, name: str):
        default = _DEFAULTS[name]
        return type(default)(os.environ.get(name, default))


settings = _Settings()
