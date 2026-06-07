from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional, Union, Annotated
from pydantic import BaseModel, Discriminator, Field, Tag


class EventHeader(BaseModel):
    event_id: str = Field(alias="eventId")
    event_type: str = Field(alias="eventType")
    timestamp: datetime
    source_service: str = Field(alias="sourceService")
    correlation_id: Optional[str] = Field(None, alias="correlationId")
    model_config = {"populate_by_name": True}


# ─── Upload events ────────────────────────────────────────────────────────────

class TrackUploadedData(BaseModel):
    upload_job_id: str = Field(alias="uploadJobId")
    uploader_id: str = Field(alias="uploaderId")
    original_filename: str = Field(alias="originalFilename")
    title: str
    genre: Optional[str] = None
    storage_url: str = Field(alias="storageUrl")
    size_bytes: int = Field(alias="sizeBytes")
    model_config = {"populate_by_name": True}


class TrackUploadedEvent(BaseModel):
    header: EventHeader
    data: TrackUploadedData


class AudioAsset(BaseModel):
    bitrate: int
    format: Literal["MP3", "AAC", "FLAC", "OGG"]
    storage_url: str = Field(alias="storageUrl")
    size_bytes: int = Field(alias="sizeBytes")
    model_config = {"populate_by_name": True}


class TranscodeCompletedData(BaseModel):
    upload_job_id: str = Field(alias="uploadJobId")
    uploader_id: str = Field(alias="uploaderId")
    title: str
    genre: Optional[str] = None
    album_id: Optional[str] = Field(None, alias="albumId")
    duration_ms: int = Field(alias="durationMs")
    waveform_url: Optional[str] = Field(None, alias="waveformUrl")
    assets: list[AudioAsset]
    model_config = {"populate_by_name": True}


class TranscodeCompletedEvent(BaseModel):
    header: EventHeader
    data: TranscodeCompletedData


class TranscodeFailedData(BaseModel):
    upload_job_id: str = Field(alias="uploadJobId")
    uploader_id: str = Field(alias="uploaderId")
    error_message: str = Field(alias="errorMessage")
    original_storage_url: str = Field(alias="originalStorageUrl")
    model_config = {"populate_by_name": True}


class TranscodeFailedEvent(BaseModel):
    header: EventHeader
    data: TranscodeFailedData


# ─── Catalog events ───────────────────────────────────────────────────────────

class PublishedAsset(BaseModel):
    bitrate: int
    format: str
    storage_url: str = Field(alias="storageUrl")
    model_config = {"populate_by_name": True}


class TrackPublishedData(BaseModel):
    track_id: str = Field(alias="trackId")
    title: str
    duration_ms: int = Field(alias="durationMs")
    cover_url: Optional[str] = Field(None, alias="coverUrl")
    genre: str
    artist_id: str = Field(alias="artistId")
    artist_name: str = Field(alias="artistName")
    album_id: Optional[str] = Field(None, alias="albumId")
    album_title: Optional[str] = Field(None, alias="albumTitle")
    assets: list[PublishedAsset]
    model_config = {"populate_by_name": True}


class TrackPublishedEvent(BaseModel):
    header: EventHeader
    data: TrackPublishedData


class TrackUpdatedData(BaseModel):
    track_id: str = Field(alias="trackId")
    title: str
    genre: str
    cover_url: Optional[str] = Field(None, alias="coverUrl")
    artist_name: str = Field(alias="artistName")
    model_config = {"populate_by_name": True}


class TrackUpdatedEvent(BaseModel):
    header: EventHeader
    data: TrackUpdatedData


class TrackDeletedData(BaseModel):
    track_id: str = Field(alias="trackId")
    model_config = {"populate_by_name": True}


class TrackDeletedEvent(BaseModel):
    header: EventHeader
    data: TrackDeletedData


# ─── Streaming events ─────────────────────────────────────────────────────────

class TrackPlayedData(BaseModel):
    user_id: str = Field(alias="userId")
    track_id: str = Field(alias="trackId")
    genre: str
    artist_id: str = Field(alias="artistId")
    duration_ms: int = Field(alias="durationMs")
    source: Literal["BROWSE", "PLAYLIST", "SEARCH", "RECOMMENDATION", "ALBUM", "ARTIST"]
    completed_full: bool = Field(alias="completedFull")
    played_at: datetime = Field(alias="playedAt")
    model_config = {"populate_by_name": True}


class TrackPlayedEvent(BaseModel):
    header: EventHeader
    data: TrackPlayedData


# ─── User events ──────────────────────────────────────────────────────────────

class UserRegisteredData(BaseModel):
    user_id: str = Field(alias="userId")
    display_name: str = Field(alias="displayName")
    email: str
    model_config = {"populate_by_name": True}


class UserRegisteredEvent(BaseModel):
    header: EventHeader
    data: UserRegisteredData


class UserFollowedData(BaseModel):
    follower_id: str = Field(alias="followerId")
    follower_name: str = Field(alias="followerName")
    following_id: str = Field(alias="followingId")
    model_config = {"populate_by_name": True}


class UserFollowedEvent(BaseModel):
    header: EventHeader
    data: UserFollowedData


# ─── Playlist events ──────────────────────────────────────────────────────────

class PlaylistSharedData(BaseModel):
    playlist_id: str = Field(alias="playlistId")
    playlist_name: str = Field(alias="playlistName")
    owner_id: str = Field(alias="ownerId")
    owner_name: str = Field(alias="ownerName")
    shared_with_user_id: str = Field(alias="sharedWithUserId")
    model_config = {"populate_by_name": True}


class PlaylistSharedEvent(BaseModel):
    header: EventHeader
    data: PlaylistSharedData


class CollaboratorAddedData(BaseModel):
    playlist_id: str = Field(alias="playlistId")
    playlist_name: str = Field(alias="playlistName")
    owner_id: str = Field(alias="ownerId")
    collaborator_id: str = Field(alias="collaboratorId")
    role: Literal["EDITOR", "VIEWER"]
    model_config = {"populate_by_name": True}


class CollaboratorAddedEvent(BaseModel):
    header: EventHeader
    data: CollaboratorAddedData


class PlaylistTrackAddedData(BaseModel):
    playlist_id: str = Field(alias="playlistId")
    playlist_name: str = Field(alias="playlistName")
    track_id: str = Field(alias="trackId")
    track_title: str = Field(alias="trackTitle")
    added_by: str = Field(alias="addedBy")
    added_by_name: str = Field(alias="addedByName")
    collaborator_ids: list[str] = Field(alias="collaboratorIds")
    model_config = {"populate_by_name": True}


class PlaylistTrackAddedEvent(BaseModel):
    header: EventHeader
    data: PlaylistTrackAddedData


# ─── Union type ───────────────────────────────────────────────────────────────

def _event_discriminator(v: object) -> str | None:
    if isinstance(v, dict):
        h = v.get("header", {})
        return h.get("eventType") if isinstance(h, dict) else None
    h = getattr(v, "header", None)
    return getattr(h, "event_type", None) if h else None


MusicEvent = Annotated[
    Union[
        Annotated[TrackUploadedEvent,      Tag("TRACK_UPLOADED")],
        Annotated[TranscodeCompletedEvent, Tag("TRANSCODE_COMPLETED")],
        Annotated[TranscodeFailedEvent,    Tag("TRANSCODE_FAILED")],
        Annotated[TrackPublishedEvent,     Tag("TRACK_PUBLISHED")],
        Annotated[TrackUpdatedEvent,       Tag("TRACK_UPDATED")],
        Annotated[TrackDeletedEvent,       Tag("TRACK_DELETED")],
        Annotated[TrackPlayedEvent,        Tag("TRACK_PLAYED")],
        Annotated[UserRegisteredEvent,     Tag("USER_REGISTERED")],
        Annotated[UserFollowedEvent,       Tag("USER_FOLLOWED")],
        Annotated[PlaylistSharedEvent,     Tag("PLAYLIST_SHARED")],
        Annotated[CollaboratorAddedEvent,  Tag("COLLABORATOR_ADDED")],
        Annotated[PlaylistTrackAddedEvent, Tag("PLAYLIST_TRACK_ADDED")],
    ],
    Discriminator(_event_discriminator),
]
