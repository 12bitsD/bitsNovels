from datetime import datetime, timezone


def iso_z(ts: datetime) -> str:
    return (
        ts.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
