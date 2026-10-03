# TB Journal

TB Journal is a small desktop journal application based on Electron.

It provides a graphical interface for managing journal entries stored as
[VJOURNAL](https://www.rfc-editor.org/rfc/rfc5545) objects on a CalDAV server.

The application was developed as part of the TB Planner project and is
currently focused on a simple, independent journal client.

## Features

- CalDAV connection
- Load VJOURNAL entries from a calendar
- Create new journal entries
- Edit existing journal entries
- Edit the journal date
- Edit title and description
- Multi-line journal descriptions
- Search journal entries
- Sort entries by date
  - ascending
  - descending
- Load/save CalDAV settings
- Password does not need to be entered for every operation
- Loading/status messages during CalDAV operations
- Electron desktop application
- Linux AppImage

## Technology

- Electron
- JavaScript
- HTML
- CSS
- CalDAV
- iCalendar / VJOURNAL
- electron-builder

No database is required.

Journal entries remain on the configured CalDAV server.

## CalDAV

TB Journal uses CalDAV to access a calendar collection.

Journal entries are represented as iCalendar `VJOURNAL` components.

A typical entry looks like:

```ical
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TB-JOURNAL//EN
BEGIN:VJOURNAL
UID:...
DTSTAMP:...
DTSTART;VALUE=DATE:20261003
SUMMARY:Example
DESCRIPTION:Journal entry
END:VJOURNAL
END:VCALENDAR
```

The application uses the CalDAV server for storing and retrieving these
entries.

## Requirements

For development:

- Linux
- Node.js
- npm
- Electron
- electron-builder

The Electron runtime is installed through npm.

`node_modules` is intentionally not stored in the Git repository.

## Development

Clone the repository:

```bash
git clone https://github.com/tino1003870/tb-journal.git
cd tb-journal
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

## Build

Build a Linux x64 AppImage:

```bash
npm run build
```

The resulting AppImage is placed in:

```text
dist/
```

For an ARM64 build:

```bash
npx electron-builder --linux AppImage --arm64
```

The ARM64 build is intended for ARM64 Linux devices such as the PineTab2
and compatible PostmarketOS installations.

## Repository

The main development branch is:

```text
main
```

Repository:

https://github.com/tino1003870/tb-journal

## Project Status

TB Journal is currently under active development.

The current version provides the basic VJOURNAL CRUD functionality together
with search, date sorting and CalDAV settings management.

The application is intentionally kept small and independent of larger
calendar or CRM systems.

## License

License: TBD
