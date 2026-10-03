const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("node:path");
const https = require("node:https");


function createWindow() {

    const win = new BrowserWindow({

        width: 1200,
        height: 800,

        webPreferences: {

            preload:
                path.join(
                    __dirname,
                    "preload.js"
                ),

            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(
        path.join(
            __dirname,
            "..",
            "journal.html"
        )
    );
}


ipcMain.handle(
    "caldav-request",
    async (_event, request) => {

        const {
            operation,
            url,
            username,
            password,
            headers = {},
            body = null
        } = request;

        if (!url) {
            throw new Error(
                "CalDAV URL is empty."
            );
        }

        let parsedUrl;

        try {

            parsedUrl =
                new URL(url);

        } catch {

            throw new Error(
                `Invalid CalDAV URL: ${url}`
            );
        }

        if (
            parsedUrl.protocol !== "https:"
        ) {

            throw new Error(
                `Unsupported protocol: ${parsedUrl.protocol}`
            );
        }

        const requestHeaders = {
            ...headers
        };

        if (
            username ||
            password
        ) {

            const credentials =
                Buffer.from(
                    `${username || ""}:${password || ""}`,
                    "utf8"
                ).toString("base64");

            requestHeaders["Authorization"] =
                `Basic ${credentials}`;
        }

        if (
            body !== null &&
            body !== undefined
        ) {

            requestHeaders["Content-Length"] =
                Buffer.byteLength(
                    body,
                    "utf8"
                );
        }

        return await new Promise(
            (resolve, reject) => {

                const req =
                    https.request(
                        parsedUrl,
                        {
                            method:
                                operation,

                            headers:
                                requestHeaders
                        },

                        res => {

                            const chunks = [];

                            res.on(
                                "data",
                                chunk => {
                                    chunks.push(chunk);
                                }
                            );

                            res.on(
                                "end",
                                () => {

                                    const responseBody =
                                        Buffer
                                            .concat(chunks)
                                            .toString("utf8");

                                    const responseHeaders = [];

                                    for (
                                        const [
                                            name,
                                            value
                                        ]
                                        of Object.entries(
                                            res.headers
                                        )
                                    ) {

                                        if (
                                            Array.isArray(
                                                value
                                            )
                                        ) {

                                            responseHeaders.push(
                                                `${name}: ${value.join(", ")}`
                                            );

                                        } else {

                                            responseHeaders.push(
                                                `${name}: ${value ?? ""}`
                                            );
                                        }
                                    }

                                    const status =
                                        res.statusCode ||
                                        0;

                                    resolve({

                                        ok:
                                            status >= 200 &&
                                            status < 300,

                                        status,

                                        statusText:
                                            res.statusMessage ||
                                            "",

                                        headers:
                                            responseHeaders.join(
                                                "\n"
                                            ),

                                        body:
                                            responseBody
                                    });
                                }
                            );
                        }
                    );

                req.on(
                    "error",
                    error => {
                        reject(error);
                    }
                );

                if (
                    body !== null &&
                    body !== undefined
                ) {

                    req.write(body);
                }

                req.end();
            }
        );
    }
);


app.whenReady().then(
    () => {

        createWindow();

        app.on(
            "activate",
            () => {

                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {
                    createWindow();
                }
            }
        );
    }
);


app.on(
    "window-all-closed",
    () => {

        if (
            process.platform !== "darwin"
        ) {
            app.quit();
        }
    }
);
