package com.musicapp.catalog.dto.mapper;

import com.musicapp.catalog.domain.Album;
import com.musicapp.catalog.dto.response.AlbumSummaryDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AlbumMapper {

    @Mapping(target = "artist.id",        source = "artist.id")
    @Mapping(target = "artist.name",      source = "artist.name")
    @Mapping(target = "artist.avatarUrl", source = "artist.avatarUrl")
    AlbumSummaryDto toSummary(Album album);
}
