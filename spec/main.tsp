import "@typespec/http";

using Http;

@service(#{ title: "Calendar API" })
namespace CalendarApi;

model Health {
  status: "ok";
}

@route("/api/health")
@get
op getHealth(): Health;
