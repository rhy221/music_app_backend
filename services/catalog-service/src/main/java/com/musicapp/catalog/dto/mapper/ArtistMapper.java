package com.musicapp.catalog.dto.mapper;

import com.musicapp.catalog.domain.Artist;
import com.musicapp.catalog.dto.response.ArtistSummaryDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArtistMapper {

    @Mapping(target = "trackCount", ignore = true)
    @Mapping(target = "albumCount", ignore = true)
    ArtistSummaryDto toSummary(Artist artist);
}
