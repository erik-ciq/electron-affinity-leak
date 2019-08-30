let { BrowserWindow, app, session, ipcMain } = require('electron')
const path = require('path');
const fs = require('fs');
const { mainProcessPropsToReport, rendererProcessPropsToReport } = require('./constants');
const createMemoryReport = require('./createMemoryReport');
const mainProcessMemoryObject = {};
const mainProcessMemoryData = [];
const rendererProcessMemoryData = [];
let affinity, originalAffinity, allowCrashes, ses, closeCount = 0;

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

function createWindow({ close, random, crash }) {

  if (!ses) {
    ses = new session.fromPartition('name');
  }

  if (random) {
    affinity = `${originalAffinity}${Math.random(1000)}`;
  }

  const main = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      affinity,
      session: ses,
    }
  });

  if (close) {
    closeCount++; // we mod closeCount and every 5th close we crash to recover our memory leak

    if (crash) {
      main.loadFile(path.join(__dirname, 'crashProcess.html')); // use html that loads javascript to crash process
    }

    else {
      let crashArg = false; // assume we won't crash

      if (allowCrashes && closeCount % 5 === 0) {
        crashArg = true; // crash on every 5th reload to recover memory leak
      }

      main.loadFile(path.join(__dirname, 'closingLeak.html')); // load code to automatically close the window
      main.on('closed', (e, arg) => createWindow({ close, random, crash: crashArg })); // recreate the window on close with our crash argument
    }
   
    main.webContents.on('crashed', (e) => {
      console.log('crashed');
      main.close(); // close and destroy window if we crashed to avoid a dangling white screen
      main.destroy();
      setTimeout(() => createWindow({ close, random }), 2000); // recreate our window after a 2 second pause. Instantly recreating will crash the process
    });

  } else {
    main.loadFile(path.join(__dirname, 'refreshingLeak.html')); // load file to reload every 2 second to demonstrate memory leak with affinity
  }
}

allowCrashes = process.argv.includes('--crash'); // if crash arg is provided, allow crashing to reclaim memory
affinity = originalAffinity = process.argv.includes('--affinity') ? 'test' : null; // if affinity arg is provided via CLI, set affinity to 'test'
const random = process.argv.includes('--random'); // randomizes the uuid each time to ensure no affinity processes are re-used
const close = process.argv.includes('--close'); // if close arg is provided, then produce memory leak using closes rather than refreshes

app.on('ready', () => createWindow({ affinityArg: originalAffinity, close, random }));
app.on('window-all-closed', e => e.preventDefault())

ipcMain.on('memoryUpdate', (e, arg) => {
  rendererProcessReport(arg);
  // main process doesn't leak memory as far as I can tell. Feel free to uncomment if you'd care to examine
  // mainProcessReport();
  clearSessionData(ses);
});
