import { executeCalDavRequest } from "./src/js/caldav.js";
import {
    getAllJournals,
    saveJournal as saveLocalJournal
} from "./src/js/journal-store.js";
const $ = id =>
    document.getElementById(id);


/* ============================================================
   Synchronisationsstatus
   ============================================================ */

function getSyncStatus(uid) {
    if (!uid) {
        return "server";
    }

    const raw =
        localStorage.getItem("tbJournalSyncStatus");

    if (!raw) {
        return "server";
    }

    try {
        const status = JSON.parse(raw);
        return status[uid] || "server";
    } catch {
        return "server";
    }
}


function setSyncStatus(uid, status) {
    if (!uid) {
        return;
    }

    let data = {};

    try {
        data = JSON.parse(
            localStorage.getItem("tbJournalSyncStatus") || "{}"
        );
    } catch {
        data = {};
    }

    data[uid] = status;

    localStorage.setItem(
        "tbJournalSyncStatus",
        JSON.stringify(data)
    );
}


function getSyncStatusInfo(uid) {
    const status =
        getSyncStatus(uid);

    switch (status) {

        case "synced":
            return {
                text: "🟢 Lokal + Server",
                className: "sync-status sync-status-synced"
            };

        case "local":
            return {
                text: "🔵 Nur lokal",
                className: "sync-status sync-status-local"
            };

        case "dirty":
            return {
                text: "🟠 Lokal geändert",
                className: "sync-status sync-status-dirty"
            };

        default:
            return {
                text: "⚪ Nur Server",
                className: "sync-status sync-status-server"
            };
    }
}


function log(...args) {

    console.log(
        "[TB-JOURNAL]",
        ...args
    );
}


async function createTestVJournal() {

    const baseUrl =
        $("caldavUrl").value.trim();

    const username =
        $("caldavUsername").value;

    const password =
        $("caldavPassword").value;

    if (!baseUrl) {

        showResult(
            "Bitte eine CalDAV-URL eingeben."
        );

        return;
    }

    const url =
        baseUrl.replace(/\/+$/, "") +
        "/tb-journal-test-001.ics";

    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TB-JOURNAL//EN
BEGIN:VJOURNAL
UID:tb-journal-test-001
DTSTAMP:20261003T070000Z
SUMMARY:TB Journal Test
DESCRIPTION:Testeintrag für VJOURNAL über CalDAV
END:VJOURNAL
END:VCALENDAR
`;

    log(
        "=== VJOURNAL ANLEGEN ==="
    );

    log(
        "URL:",
        url
    );

    log(
        "iCalendar:",
        ical
    );

    try {

        const result =
            await executeCalDavRequest({

                operation: "PUT",

                url,

                username,

                password,

                body: ical
            });

        log(
            "VJOURNAL PUT Ergebnis:",
            result
        );

        showResult(
            [
                `HTTP ${result.status} ${result.statusText}`,
                "",
                result.body || "(keine Antwort)"
            ].join("\n")
        );

    } catch (error) {

        console.error(
            "[TB-JOURNAL] VJOURNAL PUT ERROR",
            error
        );

        showResult(
            `Fehler: ${error.message}`
        );
    }
}


function showResult(text) {

    $("connectionResult").textContent =
        text;
}


function parseVJournal(ical) {

    const unescapeIcal = value =>
        String(value || "")
            .replace(/\\n/gi, "\n")
            .replace(/\\,/g, ",")
            .replace(/\\;/g, ";")
            .replace(/\\\\/g, "\\");


    const getValue = name => {

        const re =
            new RegExp(
                "^" + name + "(?:;[^:]*)?:(.*)$",
                "mi"
            );

        const match =
            ical.match(re);

        return match
            ? unescapeIcal(match[1].trim())
            : "";
    };


    let dtstart =
        getValue("DTSTART");


    if (/^\d{8}$/.test(dtstart)) {

        dtstart =
            dtstart.substring(0, 4) +
            "-" +
            dtstart.substring(4, 6) +
            "-" +
            dtstart.substring(6, 8);
    }


    return {

        uid:
            getValue("UID"),

        summary:
            getValue("SUMMARY"),

        description:
            getValue("DESCRIPTION"),

        dtstart:
            dtstart
    };
}

function displayJournal(journal) {

    const container =
        $("journalList");

    container.innerHTML = "";


    const article =
        document.createElement("article");

    article.className =
        "journal-entry";


    const title =
        document.createElement("h3");

    title.textContent =
        journal.summary || "(ohne Betreff)";


    const description =
        document.createElement("p");

    description.textContent =
        journal.description || "";


    const date =
        document.createElement("p");

    date.textContent =
        journal.dtstart
            ? `Datum: ${journal.dtstart}`
            : "Kein Datum";


    const uid =
        document.createElement("small");

    uid.textContent =
        `UID: ${journal.uid || "(keine UID)"}`;


    article.appendChild(title);
    article.appendChild(description);
    article.appendChild(date);
    article.appendChild(uid);

    container.appendChild(article);
}


async function loadTestVJournal() {

    const baseUrl =
        $("caldavUrl").value.trim();

    const username =
        $("caldavUsername").value;

    const password =
        $("caldavPassword").value;

    if (!baseUrl) {

        showResult(
            "Bitte eine CalDAV-URL eingeben."
        );

        return;
    }

    const url =
        baseUrl.replace(/\/+$/, "") +
        "/tb-journal-test-001.ics";

    log(
        "=== VJOURNAL ABRUFEN ==="
    );

    log(
        "URL:",
        url
    );

    try {

        const result =
            await executeCalDavRequest({

                operation: "GET",

                url,

                username,

                password
            });

        log(
            "VJOURNAL GET Ergebnis:",
            result
        );

        log(
            "VJOURNAL Inhalt:",
            result.body
        );

        showResult(
            [
                `HTTP ${result.status} ${result.statusText}`,
                "",
                result.body || "(keine Antwort)"
            ].join("\n")
        );


        if (result.ok && result.body) {

            const journal =
                parseVJournal(result.body);

            log(
                "Geparstes VJOURNAL:",
                journal
            );

            displayJournal(journal);
        }


    } catch (error) {

        console.error(
            "[TB-JOURNAL] VJOURNAL GET ERROR",
            error
        );

        showResult(
            `Fehler: ${error.message}`
        );
    }
}




async function listVJournals() {

    const baseUrl =
        $("caldavUrl").value.trim();

    const username =
        $("caldavUsername").value;

    const password =
        $("caldavPassword").value;

    if (!baseUrl) {

        showResult(
            "Bitte eine CalDAV-URL eingeben."
        );

        return [];
    }

    log(
        "=== ALLE VJOURNALS LADEN ==="
    );

    try {

        const result =
            await executeCalDavRequest({

                operation: "PROPFIND",

                url: baseUrl,

                username,

                password
            });

        log(
            "PROPFIND Ergebnis:",
            result
        );

        if (!result.ok) {

            throw new Error(
                `PROPFIND fehlgeschlagen: HTTP ${result.status}`
            );
        }

        const xml =
            new DOMParser()
                .parseFromString(
                    result.body,
                    "application/xml"
                );

        const hrefNodes =
            [
                ...xml.getElementsByTagNameNS(
                    "DAV:",
                    "href"
                )
            ];

        const hrefs =
            hrefNodes
                .map(
                    node =>
                        node.textContent.trim()
                )
                .filter(
                    href =>
                        href.endsWith(".ics")
                );

        log(
            "ICS-Ressourcen:",
            hrefs
        );

        const journals = [];

        for (const href of hrefs) {

            const url =
                new URL(
                    href,
                    baseUrl
                ).href;

            try {

                const item =
                    await executeCalDavRequest({

                        operation: "GET",

                        url,

                        username,

                        password
                    });

                if (
                    !item.ok ||
                    !item.body
                ) {
                    continue;
                }

                if (
                    !item.body.includes(
                        "BEGIN:VJOURNAL"
                    )
                ) {
                    continue;
                }

                const journal =
                    parseVJournal(
                        item.body
                    );

                journal.url =
                    url;

                journal.ical =
                    item.body;

                journals.push(
                    journal
                );

                log(
                    "VJOURNAL gefunden:",
                    journal
                );

            } catch (error) {

                console.error(
                    "[TB-JOURNAL] Fehler beim Lesen:",
                    url,
                    error
                );
            }
        }

        log(
            "=== VJOURNALS GESAMT ===",
            journals
        );

        return journals;

    } catch (error) {

        console.error(
            "[TB-JOURNAL] LIST VJOURNAL ERROR",
            error
        );

        showResult(
            `Fehler: ${error.message}`
        );

        return [];
    }
}


let journalSortOrder = "desc";

function sortJournalsByDate(journals) {
    return [...journals].sort((a, b) => {
        const da = a.dtstart || "";
        const db = b.dtstart || "";

        const cmp = da.localeCompare(db);

        return journalSortOrder === "asc"
            ? cmp
            : -cmp;
    });
}


function displayJournals(journals) {

    const container =
        $("journalList");

    journals = sortJournalsByDate(journals);

    container.innerHTML = "";


    if (!journals.length) {

        container.innerHTML =
            "<p>Keine VJOURNAL-Einträge gefunden.</p>";

        return;
    }


    journals.forEach(
        journal => {

            const article =
                document.createElement("article");

            article.className =
                "journal-entry";


            const syncInfo =
                getSyncStatusInfo(journal.uid);

            const syncStatus =
                document.createElement("div");

            syncStatus.className =
                syncInfo.className;

            syncStatus.textContent =
                syncInfo.text;


            const title =
                document.createElement("h3");

            title.textContent =
                journal.summary ||
                "(ohne Betreff)";


            const description =
                document.createElement("p");

            description.textContent =
                journal.description ||
                "";


            const date =
                document.createElement("p");

            date.textContent =
                journal.dtstart
                    ? `Datum: ${journal.dtstart}`
                    : "Kein Datum";


            const uid =
                document.createElement("small");

            uid.textContent =
                `UID: ${journal.uid || "(keine UID)"}`;


            const actions =
                document.createElement("div");

            actions.className =
                "journal-entry-actions";


            const editButton =
                document.createElement("button");

            editButton.type =
                "button";

            editButton.textContent =
                "Bearbeiten";


            editButton.addEventListener(
                "click",
                () =>
                    openJournalEditor(journal)
            );


            actions.appendChild(
                editButton
            );


            article.appendChild(syncStatus);
            article.appendChild(title);
            article.appendChild(description);
            article.appendChild(date);
            article.appendChild(uid);
            article.appendChild(actions);


            container.appendChild(article);
        }
    );
}


async function loadVJournals() {

    const journals =
        await listVJournals();

    displayJournals(
        journals
    );

    showResult(
        `${journals.length} VJOURNAL-Einträge geladen.`
    );
}


/*
 * ------------------------------------------------------------
 * Manuelle Synchronisation
 * ------------------------------------------------------------
 */

function setSyncButtonsDisabled(disabled) {
    const serverToLocal =
        $("syncServerToLocalButton");

    const localToServer =
        $("syncLocalToServerButton");

    if (serverToLocal) {
        serverToLocal.disabled = disabled;
    }

    if (localToServer) {
        localToServer.disabled = disabled;
    }
}


async function syncServerToLocal() {

    const baseUrl =
        $("caldavUrl").value.trim();

    const username =
        $("caldavUsername").value;

    const password =
        $("caldavPassword").value;

    if (!baseUrl) {
        showResult("Bitte eine CalDAV-URL eingeben.");
        return;
    }

    setSyncButtonsDisabled(true);
    showResult("Sync läuft: Server → Lokal ...");

    log("=== SYNC SERVER → LOKAL START ===");

    try {

        const journals =
            await listVJournals();

        for (const journal of journals) {

            await saveLocalJournal(journal);

            setSyncStatus(
                journal.uid,
                "synced"
            );
        }

        displayJournals(journals);

        showResult(
            `Sync fertig. ${journals.length} Journale vom Server lokal gespeichert.`
        );

        log(
            "=== SYNC SERVER → LOKAL FERTIG ===",
            journals.length
        );

    } catch (error) {

        console.error(
            "[TB-JOURNAL] SYNC SERVER → LOKAL ERROR",
            error
        );

        showResult(
            `Sync-Fehler: ${error.message}`
        );

    } finally {

        setSyncButtonsDisabled(false);
    }
}


async function syncLocalToServer() {

    const baseUrl =
        $("caldavUrl").value.trim();

    const username =
        $("caldavUsername").value;

    const password =
        $("caldavPassword").value;

    if (!baseUrl) {
        showResult("Bitte eine CalDAV-URL eingeben.");
        return;
    }

    setSyncButtonsDisabled(true);
    showResult("Sync läuft: Lokal → Server ...");

    log("=== SYNC LOKAL → SERVER START ===");

    try {

        const journals =
            await getAllJournals();

        let count = 0;

        for (const journal of journals) {

            const uid =
                journal.uid;

            if (!uid) {
                continue;
            }

            const url =
                journal.url ||
                baseUrl.replace(/\/+$/, "") +
                "/" +
                uid +
                ".ics";

            let ical =
                journal.ical;

            if (!ical) {

                const escapeIcal =
                    value =>
                        String(value || "")
                            .replace(/\\/g, "\\\\")
                            .replace(/;/g, "\\;")
                            .replace(/,/g, "\\,")
                            .replace(/\r?\n/g, "\\n");

                const dtstart =
                    String(journal.dtstart || "")
                        .replace(/-/g, "");

                const now =
                    new Date()
                        .toISOString()
                        .replace(/[-:]/g, "")
                        .replace(/\.\d{3}Z$/, "Z");

                ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TB-JOURNAL//EN
BEGIN:VJOURNAL
UID:${escapeIcal(uid)}
DTSTAMP:${now}
SUMMARY:${escapeIcal(journal.summary)}
DESCRIPTION:${escapeIcal(journal.description)}
DTSTART;VALUE=DATE:${dtstart}
END:VJOURNAL
END:VCALENDAR
`;
            }

            const result =
                await executeCalDavRequest({

                    operation: "PUT",

                    url,

                    username,

                    password,

                    body: ical
                });

            if (!result.ok) {

                throw new Error(
                    `PUT ${url} fehlgeschlagen: HTTP ${result.status}`
                );
            }

            setSyncStatus(
                journal.uid,
                "synced"
            );

            count++;
        }

        showResult(
            `Sync fertig. ${count} lokale Journale zum Server übertragen.`
        );

        log(
            "=== SYNC LOKAL → SERVER FERTIG ===",
            count
        );

    } catch (error) {

        console.error(
            "[TB-JOURNAL] SYNC LOKAL → SERVER ERROR",
            error
        );

        showResult(
            `Sync-Fehler: ${error.message}`
        );

    } finally {

        setSyncButtonsDisabled(false);
    }
}



let editingJournal = null;


function openJournalEditor(journal = null) {

    editingJournal =
        journal;

    const editor =
        $("journalEditor");

    const heading =
        $("journalEditorHeading");

    const title =
        $("journalTitle");

    const description =
        $("journalDescription");

    const date =
        $("journalDate");


    if (journal) {

        heading.textContent =
            "Journal bearbeiten";

        title.value =
            journal.summary || "";

        description.value =
            journal.description || "";

        date.value =
            journal.date || "";

    } else {

        heading.textContent =
            "Neues Journal";

        title.value =
            "";

        description.value =
            "";

        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        date.value =
            today;
    }


    editor.hidden =
        false;

    title.focus();
}


function closeJournalEditor() {

    editingJournal =
        null;

    $("journalEditor").hidden =
        true;

    $("journalTitle").value =
        "";

    $("journalDescription").value =
        "";

    $("journalDate").value =
        "";
}


function createJournalUid() {

    if (
        crypto &&
        crypto.randomUUID
    ) {
        return crypto.randomUUID();
    }

    return (
        "tb-journal-" +
        Date.now()
    );
}


function createJournalIcal(
    uid,
    title,
    description,
    date
) {

    const now =
        new Date();

    const dtstamp =
        now.toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}Z$/, "Z");


    const escapeIcal =
        value =>
            String(value || "")
                .replace(/\\/g, "\\\\")
                .replace(/;/g, "\\;")
                .replace(/,/g, "\\,")
                .replace(/\r?\n/g, "\\n");

    const dtstart =
        String(date || "")
            .replace(/-/g, "");


    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TB-JOURNAL//EN
BEGIN:VJOURNAL
UID:${escapeIcal(uid)}
DTSTAMP:${dtstamp}
SUMMARY:${escapeIcal(title)}
DESCRIPTION:${escapeIcal(description)}
DTSTART;VALUE=DATE:${dtstart}
END:VJOURNAL
END:VCALENDAR
`;
}


async function saveJournal() {

    const title =
        $("journalTitle")
            .value
            .trim();

    const description =
        $("journalDescription")
            .value
            .trim();

    const date =
        $("journalDate")
            .value;

    const baseUrl =
        $("caldavUrl")
            .value
            .trim();

    const username =
        $("caldavUsername")
            .value;

    const password =
        $("caldavPassword")
            .value;


    if (!title) {

        alert(
            "Bitte einen Titel eingeben."
        );

        $("journalTitle").focus();

        return;
    }

    if (!date) {

        alert(
            "Bitte ein Datum eingeben."
        );

        $("journalDate").focus();

        return;
    }


    if (!baseUrl) {

        showResult(
            "Bitte eine CalDAV-URL eingeben."
        );

        return;
    }


    let uid;
    let url;


    if (editingJournal) {

        uid =
            editingJournal.uid;

        url =
            editingJournal.url;

    } else {

        uid =
            createJournalUid();

        url =
            baseUrl.replace(/\/+$/, "") +
            "/" +
            uid +
            ".ics";
    }


    const ical =
        createJournalIcal(
            uid,
            title,
            description,
            date
        );


    log(
        editingJournal
            ? "=== VJOURNAL ÄNDERN ==="
            : "=== VJOURNAL ANLEGEN ==="
    );

    log(
        "URL:",
        url
    );

    log(
        "iCalendar:",
        ical
    );


    try {

        const result =
            await executeCalDavRequest({

                operation: "PUT",

                url,

                username,

                password,

                body: ical
            });


        log(
            "VJOURNAL PUT Ergebnis:",
            result
        );


        if (!result.ok) {

            throw new Error(
                `HTTP ${result.status} ${result.statusText}`
            );
        }


        closeJournalEditor();

        showResult(
            editingJournal
                ? "Journal gespeichert."
                : "Journal angelegt."
        );


        await loadVJournals();


    } catch (error) {

        console.error(
            "[TB-JOURNAL] VJOURNAL SAVE ERROR",
            error
        );

        showResult(
            `Fehler: ${error.message}`
        );
    }
}


/*
 * ------------------------------------------------------------
 * Einstellungen
 * ------------------------------------------------------------
 */

function saveSettings() {

    const settings = {
        caldavUrl: $("caldavUrl").value.trim(),
        username: $("caldavUsername").value,
        password: $("caldavPassword").value
    };

    localStorage.setItem(
        "tbJournalSettings",
        JSON.stringify(settings)
    );

    showResult("Einstellungen gespeichert.");

    log("Einstellungen gespeichert.");
}


function loadSettings() {

    const raw =
        localStorage.getItem("tbJournalSettings");

    if (!raw) {

        showResult(
            "Keine gespeicherten Einstellungen gefunden."
        );

        return;
    }

    try {

        const settings =
            JSON.parse(raw);

        $("caldavUrl").value =
            settings.caldavUrl || "";

        $("caldavUsername").value =
            settings.username || "";

        $("caldavPassword").value =
            settings.password || "";

        showResult(
            "Einstellungen geladen."
        );

        log("Einstellungen geladen.");

    } catch (error) {

        console.error(
            "[TB-JOURNAL] SETTINGS ERROR",
            error
        );

        showResult(
            "Fehler beim Laden der Einstellungen."
        );
    }
}


async function testConnection() {

    const url =
        $("caldavUrl").value.trim();

    const username =
        $("caldavUsername").value;

    const password =
        $("caldavPassword").value;


    if (!url) {

        showResult(
            "Bitte eine CalDAV-URL eingeben."
        );

        return;
    }


    log(
        "=== CALDAV VERBINDUNG TESTEN ==="
    );

    log(
        "URL:",
        url
    );


    showResult(
        "Verbindung wird getestet ..."
    );


    try {

        const result =
            await executeCalDavRequest({

                operation: "PROPFIND",

                url,

                username,

                password
            });

        console.log(
            "[TB-JOURNAL] FULL CALDAV RESPONSE:",
            result.body
        );


        log(
            "CalDAV Ergebnis:",
            result
        );


        showResult(
            [
                `HTTP ${result.status} ${result.statusText}`,
                "",
                result.body || "(keine Antwort)"
            ].join("\n")
        );


    } catch (error) {

        console.error(
            "[TB-JOURNAL] CALDAV ERROR",
            error
        );


        showResult(
            `Fehler: ${error.message}`
        );
    }
}


$("loadSettingsButton")
    .addEventListener(
        "click",
        loadSettings
    );


$("saveSettingsButton")
    .addEventListener(
        "click",
        saveSettings
    );


$("testConnectionButton")
    .addEventListener(
        "click",
        testConnection
    );


$("createVJournalButton")?.addEventListener(
    "click",
    createTestVJournal
);

$("loadTestVJournalButton")?.addEventListener(
    "click",
    loadTestVJournal
);

$("loadVJournalsButton")?.addEventListener(
    "click",
    loadVJournals
);


$("syncServerToLocalButton")?.addEventListener(
    "click",
    syncServerToLocal
);

$("syncLocalToServerButton")?.addEventListener(
    "click",
    syncLocalToServer
);

$("newJournalButton")
    .addEventListener(
        "click",
        () => openJournalEditor()
    );


$("saveJournalButton")
    .addEventListener(
        "click",
        saveJournal
    );


$("cancelJournalButton")
    .addEventListener(
        "click",
        closeJournalEditor
    );



log(
    "TB Journal Electron geladen."
);

window.setJournalSortOrder = function(order) {
    if (order !== "asc" && order !== "desc") {
        return;
    }

    journalSortOrder = order;

    console.log(
        "[TB-JOURNAL] Sortierung:",
        order === "asc" ? "aufsteigend" : "absteigend"
    );

    loadVJournals();
};
