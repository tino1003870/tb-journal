export function parseXml(xmlText) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, "application/xml");
}

