package com.company.events;

// Generated from libs/api-specs/events.asyncapi.yaml
public final class EventConstants {

    private EventConstants() {}

    public static final class Exchanges {
        public static final String UPLOAD    = "events.upload";
        public static final String CATALOG   = "events.catalog";
        public static final String STREAMING = "events.streaming";
        public static final String USER      = "events.user";
        public static final String PLAYLIST  = "events.playlist";
    }

    public static final class RoutingKeys {
        public static final String TRACK_UPLOADED        = "events.track.uploaded";
        public static final String TRANSCODE_COMPLETED   = "events.transcode.completed";
        public static final String TRANSCODE_FAILED      = "events.transcode.failed";
        public static final String TRACK_PUBLISHED       = "events.track.published";
        public static final String TRACK_UPDATED         = "events.track.updated";
        public static final String TRACK_DELETED         = "events.track.deleted";
        public static final String TRACK_PLAYED          = "events.track.played";
        public static final String USER_REGISTERED       = "events.user.registered";
        public static final String USER_FOLLOWED         = "events.user.followed";
        public static final String USER_ROLE_UPDATED     = "events.user.role.updated";
        public static final String USER_PROFILE_UPDATED  = "events.user.profile.updated";
        public static final String PLAYLIST_SHARED       = "events.playlist.shared";
        public static final String COLLABORATOR_ADDED    = "events.playlist.collaborator.added";
        public static final String PLAYLIST_TRACK_ADDED  = "events.playlist.track.added";
    }
}
