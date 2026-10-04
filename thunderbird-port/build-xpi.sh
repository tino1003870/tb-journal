#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

OUTPUT="../tb-journal-thunderbird.xpi"

rm -f "$OUTPUT"

zip -r "$OUTPUT" \
    manifest.json \
    journal.html \
    journal.css \
    journal.js \
    journal-ui.js \
    src \
    experiments

echo
echo "Addon gebaut: $OUTPUT"
echo
echo "Enthaltene Experiment-Dateien:"
unzip -l "$OUTPUT" | grep 'experiments/tbJournalCalendar'
