let { BrowserWindow, app, session, ipcMain } = require('electron')
const path = require('path');
const fs = require('fs');
const { mainProcessPropsToReport, rendererProcessPropsToReport } = require('./constants');
const createMemoryReport = require('./createMemoryReport');
mainProcessMemoryObject = {};
const mainProcessMemoryData = [];
const rendererProcessMemoryData = [];

function writeReport({dataPath, reportPath, memArray, memObject, reportProps, reportTitle}) {
  memArray.push(memObject);
  fs.writeFileSync(dataPath, JSON.stringify(memArray, null, 2));
  const report = createMemoryReport(memArray, reportProps);
  const pretty = JSON.stringify(report, null, 2);
  fs.writeFileSync(reportPath, pretty);
  console.log(`${reportTitle}: \n`, pretty, '\n');
}

function rendererProcessReport(arg) {
  const memObject = { ...arg, timestamp: Date.now() };
  const reportProps = {
    dataPath: './rendererProcessMemoryData.json',
    reportPath: './rendererProcessReport.json',
    memArray: rendererProcessMemoryData,
    memObject,
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

app.on('ready', async function() {
  const affinity = process.argv.includes('--affinity') ? 'test' : null;
  const ses = new session.fromPartition('name');
  const main = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      affinity,
      session: ses,
    }
  });
  main.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.on('reload', (e, arg) => {
    rendererProcessReport(arg);
    // main process doesn't leak memory as far as I can tell. Feel free to uncomment if you'd care to examine
    // mainProcessReport();
    clearSessionData(ses);
  });
});

