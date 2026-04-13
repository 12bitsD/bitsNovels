from types import ModuleType
from typing import Any


def _main_module() -> ModuleType:
    from server import main as server_main

    return server_main


class _AppProxy:
    @property
    def state(self) -> Any:
        return _main_module().app.state


app = _AppProxy()


def _iso_z(ts: Any) -> str:
    return str(_main_module()._iso_z(ts))
