export async function executeCalDavRequest({
    operation,
    url,
    username,
    password,
    body = null,
    etag = null
}) {
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

    /*
     * PUT:
     * Replace the selected CalDAV resource with the
     * edited iCalendar data.
     */
    if (operation === "PUT") {
        options.headers["Content-Type"] =
            "text/calendar; charset=utf-8";
options.body = body || "";
    }

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
            <c:comp-filter name="VTODO"/>
        </c:comp-filter>
    </c:filter>

</c:calendar-query>`;
    }

    /*
     * Electron transport:
     * HTTP requests are executed in the Electron main process
     * to avoid browser CORS restrictions.
     */
    if (
        typeof window === "undefined" ||
        !window.electronAPI ||
        typeof window.electronAPI.caldavRequest !== "function"
    ) {
        throw new Error(
            "Electron CalDAV transport is not available."
        );
    }

    const result =
        await window.electronAPI.caldavRequest({
            operation,
            url,
            username,
            password,
            headers: options.headers,
            body: options.body ?? null
        });

    /*
     * Debug information about the actual request.
     * Never expose the password or Authorization header.
     */
    result.requestDebug = {
        operation,
        url,
        username,
        headers: {
            ...options.headers,
            Authorization: options.headers.Authorization
                ? "[hidden]"
                : undefined
        },
        bodyLength: options.body
            ? options.body.length
            : 0,
        body: options.body || ""
    };

    const responseBody =
        result.body || "";

    /*
     * REPORT:
     * Parse the CalDAV multistatus response.
     */
    if (operation === "REPORT" && result.status >= 200 && result.status < 300) {
        result.todos =
            parseCalDavReport(responseBody);
    }

    return result;
}


/**
 * Parse a CalDAV REPORT multistatus response.
 */
function parseCalDavReport(xmlText) {

    const xml =
        new DOMParser().parseFromString(
            xmlText,
            "application/xml"
        );

    const parserError =
        xml.querySelector("parsererror");

    if (parserError) {
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

    const todos = [];

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
            continue;
        }

        const calendarData =
            calendarDataElement.textContent || "";

        const todo =
            parseVTodo(calendarData);

        if (!todo) {
            continue;
        }

        todo.href =
            hrefElement?.textContent || "";

        todo.etag =
            etagElement?.textContent || "";

        todos.push(todo);
    }

    return todos;
}


/**
 * Parse one iCalendar VCALENDAR containing a VTODO.
 */
function parseVTodo(calendarText) {

    const lines =
        unfoldIcsLines(calendarText);

    const start =
        lines.findIndex(
            line => line === "BEGIN:VTODO"
        );

    const end =
        lines.findIndex(
            (line, index) =>
                index > start &&
                line === "END:VTODO"
        );

    if (start < 0 || end < 0) {
        return null;
    }

    const todoLines =
        lines.slice(start + 1, end);

    const todo = {};

    for (const line of todoLines) {

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

        const normalizedName =
            name.toUpperCase();

        switch (normalizedName) {

            case "UID":
                todo.uid = unescapeIcs(value);
                break;

            case "SUMMARY":
                todo.summary = unescapeIcs(value);
                break;

            case "DESCRIPTION":
                todo.description =
                    unescapeIcs(value);
                break;

            case "STATUS":
                todo.status = value;
                break;

            case "PERCENT-COMPLETE":
                todo.percentComplete =
                    Number.parseInt(value, 10);
                break;

            case "DTSTART":
                todo.dtstart = value;
                todo.dtstartParameters =
                    parameters;
                break;

            case "DUE":
                todo.due = value;
                todo.dueParameters =
                    parameters;
                break;

            case "X-TB-PLANNER-WBS":
                todo.wbs =
                    unescapeIcs(value);
                break;

            case "X-TB-PLANNER-PARENT":
                todo.parent =
                    unescapeIcs(value);
                break;

            case "X-TB-PLANNER-ORDER":
                todo.order =
                    Number.parseInt(value, 10);
                break;

            default:
                break;
        }
    }

    console.log(
        "[TB-PLANNER DEBUG] PARSED VTODO",
        "SUMMARY=" + (todo.summary || ""),
        "DTSTART=" + (todo.dtstart || ""),
        "DTSTART-PARAMS=" + (todo.dtstartParameters || ""),
        "DUE=" + (todo.due || ""),
        "DUE-PARAMS=" + (todo.dueParameters || "")
    );

    return todo;
}


/**
 * RFC 5545 line unfolding.
 */
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


/**
 * Decode common iCalendar escaping.
 */
function unescapeIcs(value) {

    return value
        .replace(/\\n/gi, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\");
}
