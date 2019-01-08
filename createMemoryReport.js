const arrAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length;
const arrMax = arr => Math.max(...arr);
const arrMin = arr => Math.min(...arr);
const arrSum = arr => arr.reduce((a,b) => a + b, 0);
function resolve(path, obj) {
    return path.split('.').reduce(function(prev, curr) {
        return prev ? prev[curr] : null
    }, obj || self)
}
function formatBytes(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}

function reportPropStats(memoryObjects, propPath, propName) {
    // const usages = memoryObjects.map(o => resolve(propPath, o));
    const totalLeakageKey = `${propName}TotalLeakage`;
    const rawReport = {};
    // const timestampedUsage = memoryObjects.map(o => { o.timestamp, o.memoryUsage });
    const steps = [];
    memoryObjects.reduce((a, object, i) => {
      // skip first item since we don't have anything in the accumulator yet
        if (i !== 0)
            steps.push(resolve(propPath, object) - resolve(propPath, a));
        return object;
    });
    const sum = arrSum(steps);
    // only show positive leakage or 0
    rawReport[totalLeakageKey] = sum >= 0 ? sum : 0;
    // prevent divide by 0
    const stepsLength = steps.length > 0 ? steps.length : 1;
    rawReport[`${propName}AvgLeakagePerRefresh`] = rawReport[totalLeakageKey] / stepsLength;
    // rawReport[`${propName}Min`] = arrMin(usages);
    // rawReport[`${propName}Max`] = arrMax(usages);
    return rawReport;
}

function createRawReport(memoryObjects, propsToReport) {
    let rawReport = {};
    propsToReport.forEach(propToReport => {
        const propStats = reportPropStats(memoryObjects, propToReport.path, propToReport.name);
        rawReport = { ...rawReport, ...propStats };
    })
    return rawReport;
}

function createHumanReport(rawReport, memoryObjects) {
    const keys = Object.keys(rawReport)
    const report = {};
    keys.forEach(key => {
        report[key] = formatBytes(rawReport[key]);
    })
    report.totalRefreshes = memoryObjects.length;
    return report;
}

module.exports = (memoryObjects, propsToReport) => {
    const rawReport = createRawReport(memoryObjects, propsToReport);
    const report = createHumanReport(rawReport, memoryObjects);
    return report;
  }

