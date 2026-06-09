package com.musicapp.playlist.dto.mapper;

import com.musicapp.playlist.domain.PlaylistItem;
import com.musicapp.playlist.dto.response.PlaylistItemDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PlaylistItemMapper {
    PlaylistItemDto toDto(PlaylistItem item);
}
