let { BrowserWindow, app, session, ipcMain } = require('electron')
const path = require('path');
const fs = require('fs');
const { mainProcessPropsToReport, rendererProcessPropsToReport } = require('./constants');
const createMemoryReport = require('./createMemoryReport');
mainProcessMemoryObject = {};
const mainProcessMemoryData = [];
const rendererProcessMemoryData = [];
let ses;
let affinity; 

function writeReport({dataPath, reportPath, memArray, reportProps, reportTitle}) {
  fs.writeFileSync(dataPath, JSON.stringify(memArray, null, 2));
  const report = createMemoryReport(memArray, reportProps);
  report.affinity = affinity;
  const pretty = JSON.stringify(report, null, 2);
  fs.writeFileSync(reportPath, pretty);
  console.log(`${reportTitle}: \n`, pretty, '\n');
}

function rendererProcessReport(arg) {
  const memObject = { ...arg, timestamp: Date.now() };
  rendererProcessMemoryData.push(memObject)
  const reportProps = {
    dataPath: './rendererProcessMemoryData.json',
    reportPath: './rendererProcessReport.json',
    memArray: rendererProcessMemoryData,
    reportProps: rendererProcessPropsToReport,
    reportTitle: 'Renderer Process Report',
  }
  writeReport(reportProps);
}

function mainProcessReport() {
  // main process
  const memObject = { pid: process.pid, timestamp: Date.now() };
  
  memObject.processHeap = process.getHeapStatistics();
  memObject.processMemoryInfo = process.getSystemMemoryInfo();
  memObject.processMemUsage = process.memoryUsage();
  
  
  const reportProps = {
    dataPath: './mainProcessMemoryData.json',
    reportPath: './mainProcessReport.json',
    memArray: mainProcessMemoryData,
    memObject,
    reportProps: mainProcessPropsToReport,
    reportTitle: 'Main Process Report',
  }
  writeReport(reportProps);
}

function clearSessionData(ses) {
  ses.getCacheSize(size => mainProcessMemoryObject.cacheSize = size);
  ses.clearStorageData();
  ses.flushStorageData();
}

function createWindow() {
  affinity = process.argv.includes('--affinity') ? 'test' : null;
  const random = process.argv.includes('--random');
  const close = process.argv.includes('--close');
  if (!ses) {
    ses = new session.fromPartition('name');
  }
  if (random) {
    affinity = `${affinity}${Math.random(1000)}`;
  }
  const main = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      affinity,
      session: ses,
    }
  });

  if (close) {
    main.loadFile(path.join(__dirname, 'closingLeak.html'));
    main.on('closed', (e, arg) => createWindow({ close: true }));
    main.webContents.on('crashed', () => {
      console.log('crashed');
      createWindow({ close: true });
    })
  } else {
    main.loadFile(path.join(__dirname, 'refreshingLeak.html'));
  }
}

app.on('ready', () => createWindow());
app.on('window-all-closed', e => e.preventDefault())
ipcMain.on('reload', (e, arg) => {
  rendererProcessReport(arg);
  // main process doesn't leak memory as far as I can tell. Feel free to uncomment if you'd care to examine
  // mainProcessReport();
  clearSessionData(ses);
});

ipcMain.on('close', (e, arg) => {
  rendererProcessReport(arg);
  // main process doesn't leak memory as far as I can tell. Feel free to uncomment if you'd care to examine
  // mainProcessReport();
  clearSessionData(ses);
});
