from __future__ import annotations

import enum
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text as sa_text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """All tables live in ai_schema. Each model declares the schema in its own
    `__table_args__` tuple (we cannot set it on Base because subclasses redefine
    `__table_args__` with index tuples)."""
    pass


class AiJobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class AiDocumentStatus(str, enum.Enum):
    INGESTING = "INGESTING"
    READY = "READY"
    FAILED = "FAILED"


class AiJobRun(Base):
    __tablename__ = "AiJobRun"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, nullable=False)
    orgId: Mapped[str | None] = mapped_column(String, nullable=True)
    agentId: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[AiJobStatus] = mapped_column(
        Enum(AiJobStatus, name="AiJobStatus", schema="ai_schema", create_type=False),
        nullable=False,
        default=AiJobStatus.PENDING,
    )
    input: Mapped[dict] = mapped_column(JSONB, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    errorCode: Mapped[str | None] = mapped_column(String, nullable=True)
    errorMessage: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("now()")
    )
    startedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finishedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lastHeartbeatAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    events: Mapped[list["AiJobEvent"]] = relationship(back_populates="job", cascade="all,delete-orphan")

    __table_args__ = (
        Index("AiJobRun_userId_createdAt_idx", "userId", sa_text("createdAt DESC")),
        Index("AiJobRun_status_createdAt_idx", "status", "createdAt"),
        Index("AiJobRun_orgId_createdAt_idx", "orgId", sa_text("createdAt DESC")),
        {"schema": "ai_schema"},
    )


class AiJobEvent(Base):
    __tablename__ = "AiJobEvent"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    jobId: Mapped[str] = mapped_column(String, ForeignKey("ai_schema.AiJobRun.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("now()")
    )

    job: Mapped[AiJobRun] = relationship(back_populates="events")

    __table_args__ = (
        UniqueConstraint("jobId", "seq", name="AiJobEvent_jobId_seq_key"),
        Index("AiJobEvent_jobId_seq_idx", "jobId", "seq"),
        {"schema": "ai_schema"},
    )


class AiCollection(Base):
    __tablename__ = "AiCollection"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, nullable=False)
    orgId: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    embedder: Mapped[str] = mapped_column(String, nullable=False)
    embeddingDims: Mapped[int] = mapped_column(Integer, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("now()")
    )

    documents: Mapped[list["AiDocument"]] = relationship(back_populates="collection", cascade="all,delete-orphan")

    __table_args__ = (
        UniqueConstraint("userId", "orgId", "name", name="AiCollection_userId_orgId_name_key"),
        Index("AiCollection_orgId_idx", "orgId"),
        {"schema": "ai_schema"},
    )


class AiDocument(Base):
    __tablename__ = "AiDocument"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    collectionId: Mapped[str] = mapped_column(
        String, ForeignKey("ai_schema.AiCollection.id", ondelete="CASCADE")
    )
    userId: Mapped[str] = mapped_column(String, nullable=False)
    orgId: Mapped[str | None] = mapped_column(String, nullable=True)
    sourceType: Mapped[str] = mapped_column(String, nullable=False)
    sourceUri: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[AiDocumentStatus] = mapped_column(
        Enum(AiDocumentStatus, name="AiDocumentStatus", schema="ai_schema", create_type=False),
        nullable=False,
        default=AiDocumentStatus.INGESTING,
    )
    chunkCount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    byteSize: Mapped[int | None] = mapped_column(Integer, nullable=True)
    errorMessage: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("now()")
    )
    indexedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    collection: Mapped[AiCollection] = relationship(back_populates="documents")
    chunks: Mapped[list["AiDocumentChunk"]] = relationship(
        back_populates="document", cascade="all,delete-orphan"
    )

    __table_args__ = (
        Index("AiDocument_collectionId_createdAt_idx", "collectionId", sa_text("createdAt DESC")),
        Index("AiDocument_userId_idx", "userId"),
        {"schema": "ai_schema"},
    )


class AiDocumentChunk(Base):
    __tablename__ = "AiDocumentChunk"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    documentId: Mapped[str] = mapped_column(
        String, ForeignKey("ai_schema.AiDocument.id", ondelete="CASCADE")
    )
    collectionId: Mapped[str] = mapped_column(String, nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(String, nullable=False)
    chunk_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(3072), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("now()")
    )

    document: Mapped[AiDocument] = relationship(back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("documentId", "seq", name="AiDocumentChunk_documentId_seq_key"),
        Index("AiDocumentChunk_collectionId_idx", "collectionId"),
        {"schema": "ai_schema"},
    )
