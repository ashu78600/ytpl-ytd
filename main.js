const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { dialog } = require("electron");

let mainWindow;
app.on("ready", () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(path.resolve(__dirname, "src/index.html"));
});

ipcMain.handle("ytpl:dirPath", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "openDirectory"],
  });
  console.log(result);
  return result.filePaths[0];
});
