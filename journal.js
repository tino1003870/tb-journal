const $ = id => document.getElementById(id);

let calendars = [];
let currentCalendarId = null;


function log(...args) {
    console.log("[TB-JOURNAL]", ...args);
}


function setStatus(text, error = false) {
    $("status").textContent = text;
    $("status").classList.toggle("error", error);
}


/*
 * Thunderbird-Kalender laden
 */
async function loadCalendars() {

    log("=== KALENDER LADEN ===");

    try {

        setStatus("Lade Kalender ...");

        const result =
            await browser.tbJournalCalendar.listCalendars();

        log("Thunderbird calendars:", result);

        if (!Array.isArray(result)) {
            throw new Error("Ungültige Kalenderliste.");
        }

        calendars = result;

        const select =
            $("calendarSelect");

        const oldId =
            currentCalendarId || select.value;

        select.replaceChildren();

        for (const calendar of calendars) {

            const option =
                document.createElement("option");

            option.value =
                calendar.id;

            option.textContent =
                calendar.name || calendar.id;

            select.appendChild(option);
        }

        if (calendars.length === 0) {

            currentCalendarId = null;

            setStatus(
                "Keine Thunderbird-Kalender gefunden.",
                true
            );

            displayJournals([]);

            return;
        }

        /*
         * Vorher ausgewählten Kalender beibehalten,
         * sofern er noch vorhanden ist.
         */
        const stillExists =
            calendars.some(
                calendar =>
                    String(calendar.id) ===
                    String(oldId)
            );

        if (stillExists) {

            select.value = oldId;

        } else {

            select.selectedIndex = 0;
        }

        currentCalendarId =
            select.value;

        log(
            "Ausgewählter Kalender:",
            currentCalendarId
        );

        await loadJournals(currentCalendarId);

    } catch (error) {

        console.error(
            "[TB-JOURNAL] CALENDAR ERROR",
            error
        );

        setStatus(
            `Kalender Fehler: ${error.message}`,
            true
        );
    }
}


/*
 * VJOURNAL des ausgewählten Kalenders laden
 */
async function loadJournals(calendarId) {

    if (!calendarId) {

        displayJournals([]);

        setStatus(
            "Kein Kalender ausgewählt.",
            true
        );

        return;
    }

    log(
        "=== VJOURNAL LADEN ===",
        calendarId
    );

    try {

        setStatus("Lade VJOURNAL ...");

        const journals =
            await browser.tbJournalCalendar.listJournals(
                calendarId
            );

        log(
            "Thunderbird VJOURNAL:",
            journals
        );

        if (!Array.isArray(journals)) {
            throw new Error(
                "Ungültige VJOURNAL-Liste."
            );
        }

        displayJournals(journals);

        setStatus(
            `${journals.length} VJOURNAL geladen.`
        );

    } catch (error) {

        console.error(
            "[TB-JOURNAL] VJOURNAL ERROR",
            error
        );

        displayJournals([]);

        setStatus(
            `VJOURNAL Fehler: ${error.message}`,
            true
        );
    }
}


/*
 * Kalenderauswahl geändert
 */
$("calendarSelect").addEventListener(
    "change",
    async () => {

        currentCalendarId =
            $("calendarSelect").value;

        await loadJournals(
            currentCalendarId
        );
    }
);


/*
 * ↻ Reload
 */
$("refreshButton").addEventListener(
    "click",
    async () => {

        await loadCalendars();
    }
);


/*
 * Neues VJOURNAL anlegen
 */
$("createJournalButton").addEventListener(
    "click",
    async () => {

        if (!currentCalendarId) {

            setStatus(
                "Kein Kalender ausgewählt.",
                true
            );

            return;
        }

        log(
            "=== VJOURNAL ANLEGEN ===",
            currentCalendarId
        );

        try {

            setStatus(
                "Lege VJOURNAL an ..."
            );

            const result =
                await browser.tbJournalCalendar.createJournal(
                    currentCalendarId
                );

            log(
                "createJournal() Ergebnis:",
                result
            );

            setStatus(
                "VJOURNAL angelegt."
            );

            await loadJournals(
                currentCalendarId
            );

        } catch (error) {

            console.error(
                "[TB-JOURNAL] CREATE JOURNAL ERROR",
                error
            );

            setStatus(
                `VJOURNAL Fehler: ${error.message}`,
                true
            );
        }
    }
);



/*
 * VJOURNAL anzeigen
 */
function displayJournals(journals) {

    const container =
        $("journalList");

    container.replaceChildren();

    if (!journals.length) {

        const p =
            document.createElement("p");

        p.textContent =
            "Keine VJOURNAL-Einträge gefunden.";

        container.appendChild(p);

        return;
    }

    for (const journal of journals) {

        const article =
            document.createElement("article");

        article.className =
            "journal-entry";


        const title =
            document.createElement("h3");

        title.textContent =
            journal.summary || "(ohne Titel)";

        article.appendChild(title);


        if (journal.dtstart) {

            const date =
                document.createElement("div");

            date.className =
                "journal-date";

            date.textContent =
                `Datum: ${journal.dtstart}`;

            article.appendChild(date);
        }


        if (journal.description) {

            const description =
                document.createElement("p");

            description.textContent =
                journal.description;

            article.appendChild(description);
        }


        if (journal.uid) {

            const meta =
                document.createElement("small");

            meta.textContent =
                `UID: ${journal.uid}`;

            article.appendChild(meta);
        }


        container.appendChild(article);
    }
}


/*
 * Beim Start automatisch Kalender laden.
 */
loadCalendars();

log("TB Journal loaded.");
