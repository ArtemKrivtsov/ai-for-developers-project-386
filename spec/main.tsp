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

/**
 * Free time a meeting of the type can start at. The server gives times in Moscow time,
 * like `2026-11-10T09:00:00+03:00`.
 */
model Slot {
  start: offsetDateTime;

  /** The start plus the duration of the meeting type. */
  end: offsetDateTime;
}

/** A day of the booking window, in Moscow time. */
model SlotDay {
  date: plainDate;

  /** Slots in start order, empty on weekends and on days with no free time. */
  slots: Slot[];
}

/** A guest's meeting with the owner. Times are Moscow time, like `2026-11-10T09:00:00+03:00`. */
model Meeting {
  id: uuid;

  /** The whole meeting type, so a list of meetings needs no more requests. */
  meetingType: MeetingType;

  start: offsetDateTime;

  /** The start plus the duration of the meeting type. */
  end: offsetDateTime;

  @minLength(1)
  @maxLength(100)
  @pattern("\\S")
  guestName: string;

  @maxLength(254)
  @format("email")
  guestEmail: string;
}

/**
 * What the guest fills in to book a meeting. `start` is compared with the slots as a moment, so
 * any offset works. The server trims `guestName` and keeps `guestEmail` as it is.
 */
model NewMeeting {
  start: offsetDateTime;
  ...PickProperties<Meeting, "guestName" | "guestEmail">;
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

/** No meeting type has the id from the path. */
model MeetingTypeNotFoundResponse {
  @statusCode statusCode: 404;
  @body error: ApiError;
}

/** The time overlaps a meeting that already exists. */
model ConflictResponse {
  @statusCode statusCode: 409;
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

/** Reads one meeting type. An id that is not a UUID fails validation with `field: meetingTypeId`. */
@route("/api/meeting-types/{meetingTypeId}")
@get
op getMeetingType(@path meetingTypeId: uuid):
  | MeetingType
  | ValidationErrorResponse
  | MeetingTypeNotFoundResponse;

/** Lists the slots of a meeting type for each of the 14 days of the booking window, from tomorrow. */
@route("/api/meeting-types/{meetingTypeId}/slots")
@get
op listSlots(@path meetingTypeId: uuid):
  | SlotDay[]
  | ValidationErrorResponse
  | MeetingTypeNotFoundResponse;

/**
 * Books a meeting of the type. `start` must be one of the slots the server would list for it
 * right now. A start that no slot has even without other meetings fails validation with
 * `field: start`, and a start whose slot overlaps another meeting gets `conflict`.
 */
@route("/api/meeting-types/{meetingTypeId}/meetings")
@post
op createMeeting(@path meetingTypeId: uuid, @body meeting: NewMeeting):
  | {
      @statusCode statusCode: 201;
      @body meeting: Meeting;
    }
  | ValidationErrorResponse
  | MeetingTypeNotFoundResponse
  | ConflictResponse;
