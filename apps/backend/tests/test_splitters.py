import pytest

from saas_forge_backend.rag.splitters import ChunkingConfig, split_text


def test_split_short_text_one_chunk():
    assert split_text("hello world") == ["hello world"]


def test_split_long_text_multiple_chunks():
    body = ("paragraph " * 200).strip()
    chunks = split_text(body, ChunkingConfig(chunk_size=200, chunk_overlap=20))
    assert len(chunks) > 1
    for c in chunks:
        assert len(c) <= 220  # size + slack


def test_rejects_unknown_strategy():
    with pytest.raises(ValueError):
        split_text("x", ChunkingConfig(strategy="markdown"))


def test_chunking_config_from_input():
    cfg = ChunkingConfig.from_input({"chunk_size": 500, "overlap": 50})
    assert cfg.chunk_size == 500
    assert cfg.chunk_overlap == 50
