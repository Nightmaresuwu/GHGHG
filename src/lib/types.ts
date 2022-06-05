export enum ErrorType {
    PlayerExists = "PlayerExists",
    PlayerNotFound = "PlayerNotFound",
    UnableToPlay = "UnableToPlay",
    InternalError = "InternalError",
}

export type SearchResponseType = "no_matches" | "unknown" | "load_failed" | "track" | "track_collection";

export type SearchResponse =
    | NoMatchesResponse
    | UnknownResponse
    | LoadFailedResponse
    | TrackResponse
    | TrackCollectionResponse;

export type BaseSearchResponse<T extends SearchResponseType, D = {}> = { type: T } & D;

/* types */
export type NoMatchesResponse = BaseSearchResponse<"no_matches">;

export type UnknownResponse = BaseSearchResponse<"unknown">;

export type LoadFailedResponse = BaseSearchResponse<"load_failed", {
    error: Error;
}>;

export type TrackResponse = BaseSearchResponse<"track", {
    track: Track;
}>;

export type TrackCollectionResponse = BaseSearchResponse<"track_collection", {
    collection: TrackCollection;
}>;

/* interfaces */
export interface Track {
    hash: string;
    source?: string;
    info: TrackInfo;
    position: number;
}

export interface TrackInfo {
    title: string;
    author: string;
    length: number;
    identifier: string;
    uri?: string;
    artworkUrl?: string;
    isStream?: boolean;
    isrc?: string;
    authors?: Array<string>;
    genres?: Array<string>;
}

export type TrackCollection = BasicTrackCollection | Search | Playlist | ArtistTopTracks;

export type TrackCollectionType = "basic" | "playlist" | "artist_top_tracks" | "search";

export type BaseTrackCollection<T extends TrackCollectionType, D = {}> = {
    type: T;
    name: string;
    tracks: Array<Track>;
    selectedTrack?: Track;
} & D;

export type BasicTrackCollection = BaseTrackCollection<"basic", {}>;

export type Playlist = BaseTrackCollection<"playlist", { isAlbum: boolean }>;

export type Search = BaseTrackCollection<"search", { query: string }>;

export type ArtistTopTracks = BaseTrackCollection<"artist_top_tracks", { artist: string }>;

export interface Error {
    message?: string;
    stack: string;
    cause?: Error;
}

export interface StandardResponse {
    error_type: ErrorType | null;
}

export interface FetchParticipants extends StandardResponse {
    participants: string[];
}

export type PlayerEventType = "track_start" | "track_end" | "participant_joined" | "participant_left" | "update";

export type PlayerEvent = TrackStart | TrackEndEvent | ParticipantJoinedEvent | ParticipantLeftEvent | UpdateEvent;

export type PlayerEventBase<T extends PlayerEventType, D = {}> = { type: T } & D;

export type TrackStart = PlayerEventBase<"track_start", {
    track: Track;
}>;

export type TrackEndEvent = PlayerEventBase<"track_end", {
    track: Track;
    end_reason: TrackEndReason;
}>;

export type ParticipantJoinedEvent = PlayerEventBase<"participant_joined", {
    id: string;
}>;

export type ParticipantLeftEvent = PlayerEventBase<"participant_left", {
    id: string;
}>;

export type UpdateEvent = PlayerEventBase<"update", {
    position: number;
    timestamp: number;
}>;

export type TrackEndReason = "STOPPED" | "CLEANUP" | "REPLACED" | "FINISHED" | "LOAD_FAILED";

export type Filter = TimecaleFilter | EqualizerFilter;

export type FilterType = "timescale" | "equalizer";

export type BaseFilter<T extends FilterType, D> = { type: T } & D;

export type TimecaleFilter = BaseFilter<"timescale", { pitch?: number; rate?: number; speed?: number }>;

export type EqualizerFilter = BaseFilter<"equalizer", { bands: EqualizerBand[] }>;

export interface EqualizerBand {
    band: number;
    gain: number;
}
