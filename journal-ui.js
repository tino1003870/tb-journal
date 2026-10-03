/*
 * TB Journal - Suche, Sortierung und Ladeanzeige
 */

(() => {
    "use strict";

    const log = (...args) =>
        console.log("[TB-JOURNAL-UI]", ...args);

    let currentSort = "desc";
    let searchText = "";
    let observer = null;
    let processing = false;

    function getJournalList() {
        return document.getElementById("journalList");
    }

    function getJournalEntries() {
        const list = getJournalList();

        if (!list) {
            return [];
        }

        return Array.from(list.children).filter(element => {
            const text = element.textContent || "";

            return (
                text.includes("UID:") &&
                text.includes("Datum:")
            );
        });
    }

    function getDateFromEntry(element) {
        const text = element.textContent || "";
        const match = text.match(/Datum:\s*(\d{4})[-.]?(\d{2})[-.]?(\d{2})/);

        if (!match) {
            return 0;
        }

        return Number(
            match[1] + match[2] + match[3]
        );
    }

    function getSearchText(element) {
        return (element.textContent || "")
            .toLocaleLowerCase("de-DE");
    }

    /*
     * ------------------------------------------------------------
     * Ladeanzeige
     * ------------------------------------------------------------
     */

    function getStatusElement() {
        return document.getElementById("journalLoadingStatus");
    }

    function setLoadingStatus(text, loading = false) {
        const status = getStatusElement();

        if (!status) {
            return;
        }

        status.textContent = text;

        if (loading) {
            status.style.color = "#555";
        } else {
            status.style.color = "#666";
        }
    }

    function createLoadingStatus() {
        if (document.getElementById("journalLoadingStatus")) {
            return;
        }

        const list = getJournalList();

        if (!list) {
            return;
        }

        const status = document.createElement("div");

        status.id = "journalLoadingStatus";
        status.style.fontSize = "13px";
        status.style.color = "#666";
        status.style.margin = "8px 0";

        list.parentNode.insertBefore(status, list);

        setLoadingStatus("Noch keine Journale geladen.");
    }

    /*
     * ------------------------------------------------------------
     * Suche
     * ------------------------------------------------------------
     */

    function applyFilter() {
        const entries = getJournalEntries();

        const query = searchText
            .trim()
            .toLocaleLowerCase("de-DE");

        entries.forEach(entry => {
            const visible =
                !query ||
                getSearchText(entry).includes(query);

            entry.style.display = visible ? "" : "none";
        });
    }

    /*
     * ------------------------------------------------------------
     * Sortierung
     * ------------------------------------------------------------
     */

    function applySort() {
        if (processing) {
            return;
        }

        const list = getJournalList();

        if (!list) {
            return;
        }

        const entries = getJournalEntries();

        if (entries.length < 2) {
            applyFilter();
            return;
        }

        const sorted = [...entries].sort((a, b) => {
            const dateA = getDateFromEntry(a);
            const dateB = getDateFromEntry(b);

            if (currentSort === "asc") {
                return dateA - dateB;
            }

            return dateB - dateA;
        });

        /*
         * Nur DOM verändern, wenn die Reihenfolge tatsächlich
         * geändert werden muss.
         *
         * Das ist wichtig, damit der MutationObserver keine
         * Endlosschleife erzeugt.
         */
        let changed = false;

        for (let i = 0; i < entries.length; i++) {
            if (entries[i] !== sorted[i]) {
                changed = true;
                break;
            }
        }

        if (changed) {
            processing = true;

            sorted.forEach(entry => {
                list.appendChild(entry);
            });

            processing = false;
        }

        applyFilter();

        log(
            "Sortierung:",
            currentSort === "asc"
                ? "aufsteigend"
                : "absteigend"
        );
    }

    function updateSortButtons() {
        const asc = document.getElementById("journalSortAsc");
        const desc = document.getElementById("journalSortDesc");

        if (!asc || !desc) {
            return;
        }

        asc.disabled = currentSort === "asc";
        desc.disabled = currentSort === "desc";
    }

    /*
     * ------------------------------------------------------------
     * Such- und Sortierleiste
     * ------------------------------------------------------------
     */

    function createControls() {
        if (document.getElementById("journalUiControls")) {
            return;
        }

        const list = getJournalList();

        if (!list) {
            return;
        }

        const controls = document.createElement("div");

        controls.id = "journalUiControls";

        controls.style.display = "flex";
        controls.style.flexWrap = "wrap";
        controls.style.gap = "8px";
        controls.style.alignItems = "center";
        controls.style.marginBottom = "10px";

        /*
         * Suche
         */

        const search = document.createElement("input");

        search.id = "journalSearch";
        search.type = "search";
        search.placeholder = "Journale suchen ...";
        search.autocomplete = "off";

        search.style.flex = "1";
        search.style.minWidth = "220px";
        search.style.maxWidth = "450px";
        search.style.padding = "5px 8px";

        search.addEventListener("input", () => {
            searchText = search.value;
            applyFilter();
        });

        /*
         * Aufsteigend
         */

        const asc = document.createElement("button");

        asc.id = "journalSortAsc";
        asc.type = "button";
        asc.textContent = "Datum ↑";

        asc.addEventListener("click", () => {
            currentSort = "asc";
            applySort();
            updateSortButtons();
        });

        /*
         * Absteigend
         */

        const desc = document.createElement("button");

        desc.id = "journalSortDesc";
        desc.type = "button";
        desc.textContent = "Datum ↓";

        desc.addEventListener("click", () => {
            currentSort = "desc";
            applySort();
            updateSortButtons();
        });

        controls.appendChild(search);
        controls.appendChild(asc);
        controls.appendChild(desc);

        /*
         * Controls vor die Journale setzen.
         */

        list.parentNode.insertBefore(controls, list);

        updateSortButtons();

        log("Such- und Sortiersteuerung erzeugt.");
    }

    /*
     * ------------------------------------------------------------
     * Beobachtung der Journal-Liste
     * ------------------------------------------------------------
     */

    function startObserver() {
        const list = getJournalList();

        if (!list || observer) {
            return;
        }

        observer = new MutationObserver(() => {

            if (processing) {
                return;
            }

            /*
             * Nicht sofort mehrfach sortieren.
             * Erst warten, bis journal.js mit dem Rendern fertig ist.
             */
            clearTimeout(startObserver.timer);

            startObserver.timer = setTimeout(() => {

                const entries = getJournalEntries();

                if (entries.length > 0) {

                    setLoadingStatus(
                        `${entries.length} Journal${
                            entries.length === 1 ? "" : "e"
                        } geladen.`
                    );

                    applySort();
                    updateSortButtons();
                }

            }, 100);

        });

        /*
         * Nur direkte Kinder beobachten.
         * KEIN subtree:true!
         */
        observer.observe(list, {
            childList: true
        });

        log("Journal-Observer aktiviert.");
    }

    /*
     * ------------------------------------------------------------
     * Klick auf "Alle Journale laden"
     * ------------------------------------------------------------
     */

    function connectLoadButton() {
        const buttons = Array.from(
            document.querySelectorAll("button")
        );

        const button = buttons.find(
            b => b.textContent.trim() === "Alle Journale laden"
        );

        if (!button) {
            return;
        }

        if (button.dataset.tbJournalUiConnected === "1") {
            return;
        }

        button.dataset.tbJournalUiConnected = "1";

        button.addEventListener("click", () => {
            setLoadingStatus("Journale werden geladen …", true);
        });

        log("Ladeanzeige mit 'Alle Journale laden' verbunden.");
    }

    /*
     * ------------------------------------------------------------
     * Initialisierung
     * ------------------------------------------------------------
     */

    function initialize() {
        const list = getJournalList();

        if (!list) {
            log("journalList noch nicht vorhanden.");
            return;
        }

        createLoadingStatus();
        createControls();
        connectLoadButton();
        startObserver();

        const entries = getJournalEntries();

        if (entries.length > 0) {
            setLoadingStatus(
                `${entries.length} Journal${
                    entries.length === 1 ? "" : "e"
                } geladen.`
            );

            applySort();
        }

        log("TB Journal UI aktiviert.");
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );
    } else {
        initialize();
    }

})();
