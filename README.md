# Electron Affinity Memory Leak

**Run with leakage:**
`npm run leak`

**Run without leakage:**
`npm start` will not leak

Leakage occurs if `affinity` is used. Each refresh will leak ~1.5Mb memory.
It's worth noting that "leaked memory" is defined as "memory not yet garbage collected"
From what I can tell, when affinity is on, the leaked memory in renderer process is never garbage collected.

### Augmenting report

Just add entry in `constants.js` with the property from memory data

`path` is used to locate the value of the property in the memory data

`name` is used to prefix the report output

### Heap snapshots
Heap snapshots are taken in the renderer process at every refresh and written to disk

### Renderer process memory data

*Includes:*
```
webFrame: webFrame.getResourceUsage(), 
processHeap: process.getHeapStatistics(), 
processMemUsage: process.memoryUsage(), 
processMemoryInfo: process.getSystemMemoryInfo(),
```
###  Main process memory data

*Includes:*
```
memObject.processHeap = process.getHeapStatistics();
memObject.processMemoryInfo = process.getSystemMemoryInfo();
memObject.processMemUsage = process.memoryUsage();
```