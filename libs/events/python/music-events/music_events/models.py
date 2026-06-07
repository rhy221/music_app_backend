from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional, Union, Annotated
from pydantic import BaseModel, Field


class EventHeader(BaseModel):
    event_id: str = Field(alias="eventId")
    event_type: str = Field(alias="eventType")
    timestamp: datetime
    source_service: str = Field(alias="sourceService")
    correlation_id: Optional[str] = Field(None, alias="correlationId")
    model_config = {"populate_by_name": True}


class TrackUploadedData(BaseModel):
    upload_job_id: str = Field(alias="uploadJobId")
    uploader_id: str = Field(alias="uploaderId")
    original_filename: str = Field(alias="originalFilename")
    title: str
    genre: Optional[str] = None
    storage_url: str = Field(alias="storageUrl")
    size_bytes: int = Field(alias="sizeBytes")
    model_config = {"populate_by_name": True}


class TrackUploadedEvent(EventHeader):
    event_type: Literal["TRACK_UPLOADED"] = Field("TRACK_UPLOADED", alias="eventType")
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


class TranscodeCompletedEvent(EventHeader):
    event_type: Literal["TRANSCODE_COMPLETED"] = Field("TRANSCODE_COMPLETED", alias="eventType")
    data: TranscodeCompletedData


class TranscodeFailedData(BaseModel):
    upload_job_id: str = Field(alias="uploadJobId")
    uploader_id: str = Field(alias="uploaderId")
    error_message: str = Field(alias="errorMessage")
    original_storage_url: str = Field(alias="originalStorageUrl")
    model_config = {"populate_by_name": True}


class TranscodeFailedEvent(EventHeader):
    event_type: Literal["TRANSCODE_FAILED"] = Field("TRANSCODE_FAILED", alias="eventType")
    data: TranscodeFailedData


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


class TrackPublishedEvent(EventHeader):
    event_type: Literal["TRACK_PUBLISHED"] = Field("TRACK_PUBLISHED", alias="eventType")
    data: TrackPublishedData


class TrackUpdatedData(BaseModel):
    track_id: str = Field(alias="trackId")
    title: str
    genre: str
    cover_url: Optional[str] = Field(None, alias="coverUrl")
    artist_name: str = Field(alias="artistName")
    model_config = {"populate_by_name": True}


class TrackUpdatedEvent(EventHeader):
    event_type: Literal["TRACK_UPDATED"] = Field("TRACK_UPDATED", alias="eventType")
    data: TrackUpdatedData


class TrackDeletedData(BaseModel):
    track_id: str = Field(alias="trackId")
    model_config = {"populate_by_name": True}


class TrackDeletedEvent(EventHeader):
    event_type: Literal["TRACK_DELETED"] = Field("TRACK_DELETED", alias="eventType")
    data: TrackDeletedData


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


class TrackPlayedEvent(EventHeader):
    event_type: Literal["TRACK_PLAYED"] = Field("TRACK_PLAYED", alias="eventType")
    data: TrackPlayedData


class UserRegisteredData(BaseModel):
    user_id: str = Field(alias="userId")
    display_name: str = Field(alias="displayName")
    email: str
    model_config = {"populate_by_name": True}


class UserRegisteredEvent(EventHeader):
    event_type: Literal["USER_REGISTERED"] = Field("USER_REGISTERED", alias="eventType")
    data: UserRegisteredData


class UserFollowedData(BaseModel):
    follower_id: str = Field(alias="followerId")
    follower_name: str = Field(alias="followerName")
    following_id: str = Field(alias="followingId")
    model_config = {"populate_by_name": True}


class UserFollowedEvent(EventHeader):
    event_type: Literal["USER_FOLLOWED"] = Field("USER_FOLLOWED", alias="eventType")
    data: UserFollowedData


class PlaylistSharedData(BaseModel):
    playlist_id: str = Field(alias="playlistId")
    playlist_name: str = Field(alias="playlistName")
    owner_id: str = Field(alias="ownerId")
    owner_name: str = Field(alias="ownerName")
    shared_with_user_id: str = Field(alias="sharedWithUserId")
    model_config = {"populate_by_name": True}


class PlaylistSharedEvent(EventHeader):
    event_type: Literal["PLAYLIST_SHARED"] = Field("PLAYLIST_SHARED", alias="eventType")
    data: PlaylistSharedData


class CollaboratorAddedData(BaseModel):
    playlist_id: str = Field(alias="playlistId")
    playlist_name: str = Field(alias="playlistName")
    owner_id: str = Field(alias="ownerId")
    collaborator_id: str = Field(alias="collaboratorId")
    role: Literal["EDITOR", "VIEWER"]
    model_config = {"populate_by_name": True}


class CollaboratorAddedEvent(EventHeader):
    event_type: Literal["COLLABORATOR_ADDED"] = Field("COLLABORATOR_ADDED", alias="eventType")
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


class PlaylistTrackAddedEvent(EventHeader):
    event_type: Literal["PLAYLIST_TRACK_ADDED"] = Field("PLAYLIST_TRACK_ADDED", alias="eventType")
    data: PlaylistTrackAddedData


MusicEvent = Annotated[
    Union[
        TrackUploadedEvent, TranscodeCompletedEvent, TranscodeFailedEvent,
        TrackPublishedEvent, TrackUpdatedEvent, TrackDeletedEvent, TrackPlayedEvent,
        UserRegisteredEvent, UserFollowedEvent,
        PlaylistSharedEvent, CollaboratorAddedEvent, PlaylistTrackAddedEvent,
    ],
    Field(discriminator="event_type"),
]
