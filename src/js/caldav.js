export async function executeCalDavRequest({
    operation,
    url,
    username,
    password,
    body = null
}) {
    console.log("[TB-JOURNAL] CalDAV REQUEST");
    console.log("[TB-JOURNAL] Operation:", operation);
    console.log("[TB-JOURNAL] URL:", url);
    console.log("[TB-JOURNAL] Username:", username);

    const headers = {};

    if (username || password) {
        const credentials = `${username}:${password}`;

        headers["Authorization"] =
            `Basic ${btoa(credentials)}`;
    }

    const options = {
        method: operation,
        headers
    };

    if (operation === "PROPFIND") {
        options.headers["Depth"] = "1";
        options.headers["Content-Type"] =
            "application/xml; charset=utf-8";

        options.body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:resourcetype/>
        <d:displayname/>
    </d:prop>
</d:propfind>`;
    }

    if (operation === "REPORT") {
        options.headers["Depth"] = "1";
        options.headers["Content-Type"] =
            "application/xml; charset=utf-8";

        options.body = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query
    xmlns:c="urn:ietf:params:xml:ns:caldav"
    xmlns:d="DAV:">

    <d:prop>
        <d:getetag/>
        <c:calendar-data/>
    </d:prop>

    <c:filter>
        <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VJOURNAL"/>
        </c:comp-filter>
    </c:filter>

</c:calendar-query>`;
    }

    if (operation === "PUT") {
        options.headers["Content-Type"] =
            "text/calendar; charset=utf-8";

        options.body = body || "";
    }

    console.log(
        "[TB-JOURNAL] Request headers:",
        {
            ...headers,
            Authorization: headers.Authorization
                ? "[hidden]"
                : undefined
        }
    );

    console.log(
        "[TB-JOURNAL] Request body:",
        options.body || ""
    );

    const response = await fetch(url, options);

    const responseBody = await response.text();

    const responseHeaders = {};

    response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
    });

    console.log(
        "[TB-JOURNAL] RESPONSE",
        response.status,
        response.statusText
    );

    console.log(
        "[TB-JOURNAL] Response headers:",
        responseHeaders
    );

    console.log(
        "[TB-JOURNAL] Response body:",
        responseBody
    );

    const result = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody
    };

    if (
        operation === "REPORT" &&
        response.ok
    ) {
        result.journals =
            parseVJournalReport(responseBody);
    }

    return result;
}


function parseVJournalReport(xmlText) {

    console.log(
        "[TB-JOURNAL] Parsing VJOURNAL REPORT"
    );

    const xml =
        new DOMParser().parseFromString(
            xmlText,
            "application/xml"
        );

    const parserError =
        xml.querySelector("parsererror");

    if (parserError) {
        console.error(
            "[TB-JOURNAL] Invalid CalDAV XML:",
            parserError.textContent
        );

        throw new Error(
            `Invalid CalDAV XML: ${parserError.textContent}`
        );
    }

    const responses = [
        ...xml.getElementsByTagNameNS(
            "DAV:",
            "response"
        )
    ];

    console.log(
        "[TB-JOURNAL] REPORT responses:",
        responses.length
    );

    const journals = [];

    for (const response of responses) {

        const hrefElement =
            response.getElementsByTagNameNS(
                "DAV:",
                "href"
            )[0];

        const etagElement =
            response.getElementsByTagNameNS(
                "DAV:",
                "getetag"
            )[0];

        const calendarDataElement =
            response.getElementsByTagNameNS(
                "urn:ietf:params:xml:ns:caldav",
                "calendar-data"
            )[0];

        if (!calendarDataElement) {
            console.log(
                "[TB-JOURNAL] Response without calendar-data"
            );

            continue;
        }

        const calendarData =
            calendarDataElement.textContent || "";

        console.log(
            "[TB-JOURNAL] Calendar data:",
            calendarData
        );

        const journal =
            parseVJournal(calendarData);

        if (!journal) {
            console.warn(
                "[TB-JOURNAL] No VJOURNAL found"
            );

            continue;
        }

        journal.href =
            hrefElement?.textContent || "";

        journal.etag =
            etagElement?.textContent || "";

        journals.push(journal);
    }

    console.log(
        "[TB-JOURNAL] Parsed VJOURNALs:",
        journals
    );

    return journals;
}


function parseVJournal(calendarText) {

    const lines =
        unfoldIcsLines(calendarText);

    const start =
        lines.findIndex(
            line => line === "BEGIN:VJOURNAL"
        );

    const end =
        lines.findIndex(
            (line, index) =>
                index > start &&
                line === "END:VJOURNAL"
        );

    if (start < 0 || end < 0) {
        return null;
    }

    const journalLines =
        lines.slice(start + 1, end);

    const journal = {
        type: "VJOURNAL"
    };

    for (const line of journalLines) {

        const colon =
            line.indexOf(":");

        if (colon < 0) {
            continue;
        }

        const property =
            line.substring(0, colon);

        const value =
            line.substring(colon + 1);

        const semicolon =
            property.indexOf(";");

        const name =
            semicolon >= 0
                ? property.substring(0, semicolon)
                : property;

        const parameters =
            semicolon >= 0
                ? property.substring(semicolon + 1)
                : "";

        switch (name.toUpperCase()) {

            case "UID":
                journal.uid =
                    unescapeIcs(value);
                break;

            case "SUMMARY":
                journal.summary =
                    unescapeIcs(value);
                break;

            case "DESCRIPTION":
                journal.description =
                    unescapeIcs(value);
                break;

            case "DTSTART":
                journal.dtstart =
                    value;

                journal.dtstartParameters =
                    parameters;
                break;

            case "DTSTAMP":
                journal.dtstamp =
                    value;
                break;

            case "STATUS":
                journal.status =
                    value;
                break;

            default:
                break;
        }
    }

    console.log(
        "[TB-JOURNAL] Parsed VJOURNAL:",
        journal
    );

    return journal;
}


function unfoldIcsLines(text) {

    const normalized =
        text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");

    const physicalLines =
        normalized.split("\n");

    const lines = [];

    for (const line of physicalLines) {

        if (
            (line.startsWith(" ") ||
             line.startsWith("\t")) &&
            lines.length > 0
        ) {
            lines[lines.length - 1] +=
                line.substring(1);
        } else {
            lines.push(line);
        }
    }

    return lines;
}


function unescapeIcs(value) {

    return value
        .replace(/\\n/gi, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\");
}
