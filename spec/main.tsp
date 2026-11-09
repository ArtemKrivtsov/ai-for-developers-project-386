import "@typespec/http";

using Http;

@service(#{ title: "Calendar API" })
namespace CalendarApi;

@format("uuid")
scalar uuid extends string;

model Health {
  status: "ok";
}

/** A kind of meeting the owner offers to guests. */
model MeetingType {
  id: uuid;

  @minLength(1)
  @maxLength(100)
  @pattern("\\S")
  name: string;

  /** An empty string means the meeting type has no description. */
  @maxLength(500)
  description: string;

  durationMinutes: 15 | 30 | 45 | 60 | 90 | 120;
}

@route("/api/health")
@get
op getHealth(): Health;

/** Lists meeting types in creation order. */
@route("/api/meeting-types")
@get
op listMeetingTypes(): MeetingType[];
