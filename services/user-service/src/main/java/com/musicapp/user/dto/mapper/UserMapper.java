package com.musicapp.user.dto.mapper;

import com.musicapp.user.config.StorageUrlResolver;
import com.musicapp.user.domain.User;
import com.musicapp.user.dto.response.InternalUserDto;
import com.musicapp.user.dto.response.PublicUserProfileDto;
import com.musicapp.user.dto.response.UserProfileDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = StorageUrlResolver.class)
public interface UserMapper {

    @Mapping(target = "followerCount", ignore = true)
    @Mapping(target = "followingCount", ignore = true)
    @Mapping(target = "avatarUrl", source = "avatarUrl", qualifiedByName = "resolveAvatarUrl")
    UserProfileDto toProfile(User user);

    @Mapping(target = "followerCount", ignore = true)
    @Mapping(target = "followingCount", ignore = true)
    @Mapping(target = "isFollowing", ignore = true)
    @Mapping(target = "avatarUrl", source = "avatarUrl", qualifiedByName = "resolveAvatarUrl")
    PublicUserProfileDto toPublicProfile(User user);

    @Mapping(target = "avatarUrl", source = "avatarUrl", qualifiedByName = "resolveAvatarUrl")
    InternalUserDto toInternal(User user);
}
