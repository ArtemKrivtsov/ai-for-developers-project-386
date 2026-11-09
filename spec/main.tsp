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

/** What the owner fills in to create a meeting type. The server trims `name` and `description`. */
model NewMeetingType {
  ...PickProperties<MeetingType, "name" | "durationMinutes">;

  /** Omitted or empty when the meeting type has no description. */
  @maxLength(500)
  description?: string;
}

/** Why the server refused the request. */
@error
model ApiError {
  code: "validation_error" | "meeting_type_not_found" | "conflict";

  /** An explanation in English for developers, not meant for the user interface. */
  message: string;

  /**
   * The first field that failed validation: a body property or a path parameter.
   * Only `validation_error` has it, and not when the body is not valid JSON.
   */
  field?: string;
}

/** The request breaks the contract. */
model ValidationErrorResponse {
  @statusCode statusCode: 400;
  @body error: ApiError;
}

@route("/api/health")
@get
op getHealth(): Health;

/** Lists meeting types in creation order. */
@route("/api/meeting-types")
@get
op listMeetingTypes(): MeetingType[];

/** Creates a meeting type at the end of the list. */
@route("/api/meeting-types")
@post
op createMeetingType(@body meetingType: NewMeetingType): {
  @statusCode statusCode: 201;
  @body meetingType: MeetingType;
} | ValidationErrorResponse;
