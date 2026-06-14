package com.musicapp.catalog.dto.mapper;

import com.musicapp.catalog.domain.AudioAsset;
import com.musicapp.catalog.domain.Track;
import com.musicapp.catalog.dto.response.AudioAssetDto;
import com.musicapp.catalog.dto.response.InternalTrackDto;
import com.musicapp.catalog.dto.response.TrackDetailDto;
import com.musicapp.catalog.dto.response.TrackSummaryDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TrackMapper {

    @Mapping(target = "artist.id",        source = "artist.id")
    @Mapping(target = "artist.name",      source = "artist.name")
    @Mapping(target = "artist.avatarUrl", source = "artist.avatarUrl")
    @Mapping(target = "status",           expression = "java(track.getStatus().name())")
    TrackSummaryDto toSummary(Track track);

    @Mapping(target = "artist.id",        source = "artist.id")
    @Mapping(target = "artist.name",      source = "artist.name")
    @Mapping(target = "artist.avatarUrl", source = "artist.avatarUrl")
    @Mapping(target = "album.id",         source = "album.id")
    @Mapping(target = "album.title",      source = "album.title")
    @Mapping(target = "album.coverUrl",   source = "album.coverUrl")
    @Mapping(target = "status",           expression = "java(track.getStatus().name())")
    TrackDetailDto toDetail(Track track);

    @Mapping(target = "artistId",   source = "artist.id")
    @Mapping(target = "artistName", source = "artist.name")
    @Mapping(target = "albumId",    source = "album.id")
    @Mapping(target = "albumTitle", source = "album.title")
    InternalTrackDto toInternal(Track track);

    AudioAssetDto toAssetDto(AudioAsset asset);
}
