let { webFrame, ipcRenderer } = require('electron');
const path = require('path');
window.A = [];
for (let i = 0; i < 1000000; i++) {
    window.A[i] = "test";
}

window.addEventListener("beforeunload", (event) => {
    const snapshotPath = path.join(__dirname, 'snapshots', `snapshot${Date.now().toString()}.heapsnapshot`);
    // process.takeHeapSnapshot(snapshotPath);
    ipcRenderer.send('close', {
        webFrame: webFrame.getResourceUsage(),
        processHeap: process.getHeapStatistics(),
        processMemUsage: process.memoryUsage(),
        processMemoryInfo: process.getSystemMemoryInfo(),
        pid: process.pid,
    });
});

setTimeout(process.crash, 2000);