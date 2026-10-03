export function parseVJournal(icalText) {
    const lines = unfoldLines(icalText);

    const start = lines.findIndex(
        line => line === "BEGIN:VJOURNAL"
    );

    const end = lines.findIndex(
        (line, index) =>
            index > start &&
            line === "END:VJOURNAL"
    );

    if (start < 0 || end < 0) {
        return null;
    }

    const journal = {
        type: "VJOURNAL"
    };

    for (const line of lines.slice(start + 1, end)) {

        const separator = line.indexOf(":");

        if (separator === -1) {
            continue;
        }

        const propertyPart =
            line.substring(0, separator);

        const value =
            unescapeIcs(
                line.substring(separator + 1)
            );

        const parts =
            propertyPart.split(";");

        const name =
            parts[0].toUpperCase();

        const parameters = {};

        for (const part of parts.slice(1)) {
            const equal = part.indexOf("=");

            if (equal !== -1) {
                parameters[
                    part.substring(0, equal).toUpperCase()
                ] = part.substring(equal + 1);
            }
        }

        switch (name) {

            case "UID":
                journal.uid = value;
                break;

            case "SUMMARY":
                journal.summary = value;
                break;

            case "DESCRIPTION":
                journal.description = value;
                break;

            case "DTSTAMP":
                journal.dtstamp = value;
                break;

            case "DTSTART":
                journal.dtstart = value;
                journal.dtstartParams = parameters;
                break;

            case "STATUS":
                journal.status = value;
                break;
        }
    }

    return journal;
}


export function createVJournal({
    uid,
    summary = "",
    description = "",
    dtstamp,
    dtstart,
    status = null
}) {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TB Journal//EN",
        "BEGIN:VJOURNAL",
        `UID:${escapeIcs(uid)}`,
        `DTSTAMP:${dtstamp}`,
        `SUMMARY:${escapeIcs(summary)}`
    ];

    if (dtstart) {
        lines.push(`DTSTART:${dtstart}`);
    }

    if (description) {
        lines.push(
            `DESCRIPTION:${escapeIcs(description)}`
        );
    }

    if (status) {
        lines.push(`STATUS:${status}`);
    }

    lines.push(
        "END:VJOURNAL",
        "END:VCALENDAR"
    );

    return lines.join("\r\n") + "\r\n";
}


function unfoldLines(text) {

    const normalized =
        text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");

    const physicalLines =
        normalized.split("\n");

    const logicalLines = [];

    for (const line of physicalLines) {

        if (
            (line.startsWith(" ") ||
             line.startsWith("\t")) &&
            logicalLines.length > 0
        ) {
            logicalLines[logicalLines.length - 1] +=
                line.substring(1);
        } else {
            logicalLines.push(line);
        }
    }

    return logicalLines;
}


function escapeIcs(value) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}


function unescapeIcs(value) {

    return value
        .replace(/\\n/gi, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\");
}
