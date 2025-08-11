namespace VeTool.Api.Contracts;

public record RealtimeEnvelope(string Event, long Seq, DateTime OccurredAt, object Payload);

// Lobby events
public record UserJoinedEvent(Guid LobbyId, Guid UserId);
public record UserLeftEvent(Guid LobbyId, Guid UserId);
public record CaptainsSetEvent(Guid LobbyId, Guid TeamAUserId, Guid TeamBUserId);
public record TeamsUpdatedEvent(Guid LobbyId, IReadOnlyList<Guid> TeamA, IReadOnlyList<Guid> TeamB);

// Veto events
public record VetoStartedEvent(Guid MatchId, string Mode);
public record VetoProgressEvent(Guid MatchId, int StepIndex, string Action, Guid? MapId);
public record VetoCompleteEvent(Guid MatchId, IReadOnlyList<Guid> Maps);

public record ErrorEvent(string Code, string Message, string? CorrelationId); 