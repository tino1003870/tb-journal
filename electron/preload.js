const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

    ping: () => "pong",

    caldavRequest: request =>
        ipcRenderer.invoke(
            "caldav-request",
            request
        )

});
