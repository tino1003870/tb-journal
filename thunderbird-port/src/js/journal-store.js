const DB_NAME = "tb-journal";
const DB_VERSION = 1;

const JOURNALS_STORE = "journals";
const SYNC_STORE = "syncQueue";

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(JOURNALS_STORE)) {
                db.createObjectStore(JOURNALS_STORE, { keyPath: "uid" });
            }

            if (!db.objectStoreNames.contains(SYNC_STORE)) {
                const store = db.createObjectStore(SYNC_STORE, {
                    keyPath: "id",
                    autoIncrement: true
                });

                store.createIndex("uid", "uid", { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllJournals() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(JOURNALS_STORE, "readonly");
        const request = tx.objectStore(JOURNALS_STORE).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveJournal(journal) {
    if (!journal?.uid) {
        throw new Error("Lokales Journal benötigt eine UID.");
    }

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(JOURNALS_STORE, "readwrite");
        tx.objectStore(JOURNALS_STORE).put(journal);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteJournal(uid) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(JOURNALS_STORE, "readwrite");
        tx.objectStore(JOURNALS_STORE).delete(uid);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function enqueueSync(operation, journal) {
    if (!journal?.uid) {
        throw new Error("Sync-Eintrag benötigt eine Journal-UID.");
    }

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE, "readwrite");

        tx.objectStore(SYNC_STORE).add({
            operation,
            uid: journal.uid,
            journal,
            createdAt: Date.now()
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getSyncQueue() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE, "readonly");
        const request = tx.objectStore(SYNC_STORE).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function removeSyncEntry(id) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE, "readwrite");
        tx.objectStore(SYNC_STORE).delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
