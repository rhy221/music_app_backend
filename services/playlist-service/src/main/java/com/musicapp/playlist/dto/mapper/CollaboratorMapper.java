package com.musicapp.playlist.dto.mapper;

import com.musicapp.playlist.domain.Collaborator;
import com.musicapp.playlist.dto.response.CollaboratorDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CollaboratorMapper {
    CollaboratorDto toDto(Collaborator collaborator);
}
