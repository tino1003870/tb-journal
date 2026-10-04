var { ExtensionCommon } =
  ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionCommon.sys.mjs"
  );

var { cal } =
  ChromeUtils.importESModule(
    "resource:///modules/calendar/calUtils.sys.mjs"
  );


function dateToString(date) {

  if (!date) {
    return null;
  }

  try {
    return date.icalString;
  } catch (error) {
    return null;
  }
}


function journalToPlainObject(item, calendar) {

  return {
    id:
      String(item.id || ""),

    calendarId:
      String(calendar.id),

    uid:
      String(item.id || ""),

    summary:
      String(item.title || ""),

    description:
      String(
        item.getProperty("DESCRIPTION") || ""
      ),

    dtstart:
      dateToString(
        item.startDate
      ),

    dtstamp:
      dateToString(
        item.getProperty("DTSTAMP")
      ),

    icalString:
      String(item.icalString || "")
  };
}


var tbJournalCalendar =
  class extends ExtensionCommon.ExtensionAPI {

    getAPI(context) {

      console.log(
        "[TB-JOURNAL] Experiment getAPI()"
      );

      return {

        tbJournalCalendar: {

          async ping() {

            console.log(
              "[TB-JOURNAL] ping()"
            );

            return "PONG";
          },


          async listCalendars() {

            console.log(
              "[TB-JOURNAL] listCalendars()"
            );

            const calendars =
              cal.manager.getCalendars();

            console.log(
              "[TB-JOURNAL] Kalender:",
              calendars.length
            );

            return calendars.map(
              calendar => ({

                id:
                  String(calendar.id),

                name:
                  String(calendar.name || ""),

                type:
                  String(calendar.type || ""),

                uri:
                  String(calendar.uri?.spec || ""),

                readOnly:
                  Boolean(calendar.readOnly)

              })
            );
          },


          async createJournal(calendarId) {

            console.log(
              "[TB-JOURNAL] createJournal()",
              calendarId
            );

            const calendar =
              cal.manager
                .getCalendars()
                .find(
                  calendar =>
                    String(calendar.id) ===
                    String(calendarId)
                );

            if (!calendar) {
              throw new Error(
                "Kalender nicht gefunden: " +
                calendarId
              );
            }

            const uid =
              ("tb-journal-" + Date.now() + "-" + Math.random().toString(16).slice(2));

            const now =
              new Date()
                .toISOString()
                .replace(/\.\d{3}Z$/, "Z")
                .replace(/[-:]/g, "");

            const icalString =
`BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//TB Journal//EN\r
BEGIN:VJOURNAL\r
UID:${uid}\r
DTSTAMP:${now}\r
SUMMARY:TB Journal TEST\r
DESCRIPTION:Dieser Eintrag wurde von TB Journal als VJOURNAL-Test erzeugt.\r
END:VJOURNAL\r
END:VCALENDAR\r
`;

            console.log(
              "[TB-JOURNAL] VJOURNAL erzeugt:",
              icalString
            );

            console.log(
              "[TB-JOURNAL] Kalender:",
              {
                id: String(calendar.id),
                name: String(calendar.name || ""),
                type: String(calendar.type || ""),
                uri: String(calendar.uri?.spec || "")
              }
            );

            return {
              id: uid,
              icalString
            };
          },

          async listJournals(calendarId) {

            console.log(
              "[TB-JOURNAL] listJournals()",
              calendarId
            );

            const calendar =
              cal.manager
                .getCalendars()
                .find(
                  calendar =>
                    String(calendar.id) ===
                    String(calendarId)
                );

            if (!calendar) {

              throw new Error(
                "Kalender nicht gefunden: " +
                calendarId
              );
            }


            const items =
              await calendar.getItemsAsArray(
                Ci.calICalendar.ITEM_FILTER_ALL_ITEMS,
                0,
                null,
                null
              );


            console.log(
              "[TB-JOURNAL] Thunderbird liefert",
              items.length,
              "Objekte"
            );

            /*
             * Diagnose: Welche Daten liefert Thunderbird
             * tatsächlich für die Calendar-Items?
             */
            for (const [index, item] of items.slice(0, 10).entries()) {

              const ical =
                item.icalString || "";

              console.log(
                "[TB-JOURNAL] ITEM",
                index,
                {
                  id: item.id,
                  title: item.title,
                  summary: item.getProperty
                    ? item.getProperty("SUMMARY")
                    : null,

                  type: item.type,
                  itemType: item.itemType,

                  hasIcalString:
                    typeof item.icalString === "string",

                  icalLength:
                    ical.length,

                  icalStart:
                    ical.substring(0, 200)
                }
              );
            }

            for (const [index, item] of items.slice(0, 10).entries()) {

              let componentType = "(nicht verfügbar)";
              let icalString = "(nicht verfügbar)";

              try {
                if (item.icalComponent) {
                  componentType =
                    item.icalComponent.componentType ||
                    "(kein componentType)";

                  icalString =
                    item.icalComponent.icalString ||
                    "(kein icalString)";
                }
              } catch (e) {
                componentType = "FEHLER: " + e.message;
              }

              console.log(
                "[TB-JOURNAL] COMPONENT",
                index,
                {
                  componentType,
                  icalString: String(icalString).slice(0, 500)
                }
              );
            }

            const journals =
              items.filter(item => {

                try {
                  return (
                    item.icalComponent &&
                    item.icalComponent.componentType === "VJOURNAL"
                  );
                } catch (e) {
                  console.error(
                    "[TB-JOURNAL] VJOURNAL CHECK ERROR",
                    e
                  );

                  return false;
                }
              });

            console.log(
              "[TB-JOURNAL] VJOURNAL:",
              journals.length
            );


            for (const journal of journals) {

              console.log(
                "[TB-JOURNAL] VJOURNAL:",
                journal.title
              );

              console.log(
                journal.icalString
              );
            }


            return journals.map(
              journal =>
                journalToPlainObject(
                  journal,
                  calendar
                )
            );
          }

        }

      };
    }
  };

this.tbJournalCalendar =
  tbJournalCalendar;
