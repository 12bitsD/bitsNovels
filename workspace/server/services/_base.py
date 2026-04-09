from types import ModuleType
from typing import Any

from server.utils.time_utils import iso_z as _iso_z


def _main_module() -> ModuleType:
    from server import main as server_main

    return server_main


class _AppProxy:
    @property
    def state(self) -> Any:
        return _main_module().app.state


app = _AppProxy()
