from __future__ import annotations

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass(slots=True)
class ChunkingConfig:
    chunk_size: int = 1000
    chunk_overlap: int = 200
    strategy: str = "recursive"

    @classmethod
    def from_input(cls, value: dict | None) -> "ChunkingConfig":
        if not value:
            return cls()
        return cls(
            chunk_size=int(value.get("chunk_size", 1000)),
            chunk_overlap=int(value.get("overlap", 200)),
            strategy=str(value.get("strategy", "recursive")),
        )


def split_text(text: str, config: ChunkingConfig | None = None) -> list[str]:
    cfg = config or ChunkingConfig()
    if cfg.strategy != "recursive":
        raise ValueError(f"only 'recursive' chunker supported in Phase 1, got {cfg.strategy}")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_size, chunk_overlap=cfg.chunk_overlap,
    )
    return splitter.split_text(text)
