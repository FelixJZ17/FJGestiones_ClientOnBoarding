// Datos de tramos RETA por ejercicio.
// Este fichero es compartido por la calculadora y el comparador anual.
const TABLAS = {
  2023: {
    pct: 0.313,
    deduccionFisica: 0.07,
    deduccionSocietario: 0.03,
    baseMinSocietario: 1.0,
    tarifaPlana: 65.76,
    tramos: [
      {id:'R1', desde:0, hasta:670, bMin:751.63, bMax:849.66, cMin:234.51, cMax:265.09},
      {id:'R2', desde:670, hasta:900, bMin:849.67, bMax:900, cMin:265.10, cMax:280.80},
      {id:'R3', desde:900, hasta:1166.7, bMin:898.69, bMax:1166.7, cMin:280.39, cMax:364.01},
      {id:'1', desde:1166.7, hasta:1300, bMin:950.98, bMax:1300, cMin:296.71, cMax:405.60},
      {id:'2', desde:1300, hasta:1500, bMin:960.78, bMax:1500, cMin:299.76, cMax:468.00},
      {id:'3', desde:1500, hasta:1700, bMin:960.78, bMax:1700, cMin:299.76, cMax:530.40},
      {id:'4', desde:1700, hasta:1850, bMin:1013.07, bMax:1850, cMin:316.08, cMax:577.20},
      {id:'5', desde:1850, hasta:2030, bMin:1029.41, bMax:2030, cMin:321.18, cMax:633.36},
      {id:'6', desde:2030, hasta:2330, bMin:1045.75, bMax:2330, cMin:326.27, cMax:726.96},
      {id:'7', desde:2330, hasta:2760, bMin:1078.43, bMax:2760, cMin:336.47, cMax:861.12},
      {id:'8', desde:2760, hasta:3190, bMin:1143.79, bMax:3190, cMin:356.86, cMax:995.28},
      {id:'9', desde:3190, hasta:3620, bMin:1209.15, bMax:3620, cMin:377.25, cMax:1129.44},
      {id:'10', desde:3620, hasta:4050, bMin:1274.51, bMax:4050, cMin:397.65, cMax:1263.60},
      {id:'11', desde:4050, hasta:6000, bMin:1372.55, bMax:4139.4, cMin:428.24, cMax:1291.49},
      {id:'12', desde:6000, hasta:9999999, bMin:1633.99, bMax:4139.4, cMin:509.80, cMax:1291.49}
    ]
  },
  2024: {
    pct: 0.313,
    deduccionFisica: 0.07,
    deduccionSocietario: 0.03,
    baseMinSocietario: 1.0,
    tarifaPlana: 86.66,
    tramos: [
      {id:'R1', desde:0, hasta:670, bMin:753.29, bMax:816.98, cMin:235.78, cMax:255.71},
      {id:'R2', desde:670, hasta:900, bMin:753.29, bMax:816.98, cMin:235.78, cMax:255.71},
      {id:'R3', desde:900, hasta:1166.7, bMin:872.55, bMax:1166.7, cMin:273.11, cMax:365.18},
      {id:'1', desde:1166.7, hasta:1300, bMin:950.98, bMax:1300, cMin:297.66, cMax:406.90},
      {id:'2', desde:1300, hasta:1500, bMin:960.78, bMax:1500, cMin:300.72, cMax:469.50},
      {id:'3', desde:1500, hasta:1700, bMin:960.78, bMax:1700, cMin:300.72, cMax:532.10},
      {id:'4', desde:1700, hasta:1850, bMin:1045.75, bMax:1850, cMin:327.32, cMax:579.05},
      {id:'5', desde:1850, hasta:2030, bMin:1062.09, bMax:2030, cMin:332.43, cMax:635.39},
      {id:'6', desde:2030, hasta:2330, bMin:1078.43, bMax:2330, cMin:337.55, cMax:729.29},
      {id:'7', desde:2330, hasta:2760, bMin:1111.11, bMax:2760, cMin:347.78, cMax:863.88},
      {id:'8', desde:2760, hasta:3190, bMin:1176.47, bMax:3190, cMin:368.24, cMax:998.47},
      {id:'9', desde:3190, hasta:3620, bMin:1241.83, bMax:3620, cMin:388.69, cMax:1133.06},
      {id:'10', desde:3620, hasta:4050, bMin:1307.19, bMax:4050, cMin:409.15, cMax:1267.65},
      {id:'11', desde:4050, hasta:6000, bMin:1454.25, bMax:4139.4, cMin:455.18, cMax:1295.63},
      {id:'12', desde:6000, hasta:9999999, bMin:1732.03, bMax:4139.4, cMin:542.13, cMax:1295.63}
    ]
  },
  2025: {
    pct: 0.314,
    deduccionFisica: 0.07,
    deduccionSocietario: 0.03,
    baseMinSocietario: 1424.40,
    tarifaPlana: 87.61,
    tramos: [
      {id:'R1', desde:0, hasta:670, bMin:653.59, bMax:718.94, cMin:205.23, cMax:225.75},
      {id:'R2', desde:670, hasta:900, bMin:718.95, bMax:900, cMin:225.75, cMax:282.60},
      {id:'R3', desde:900, hasta:1166.7, bMin:849.67, bMax:1166.7, cMin:266.80, cMax:366.34},
      {id:'1', desde:1166.7, hasta:1300, bMin:950.98, bMax:1300, cMin:298.61, cMax:408.20},
      {id:'2', desde:1300, hasta:1500, bMin:960.78, bMax:1500, cMin:301.68, cMax:471.00},
      {id:'3', desde:1500, hasta:1700, bMin:960.78, bMax:1700, cMin:301.68, cMax:533.80},
      {id:'4', desde:1700, hasta:1850, bMin:1143.79, bMax:1850, cMin:359.15, cMax:580.90},
      {id:'5', desde:1850, hasta:2030, bMin:1209.15, bMax:2030, cMin:379.67, cMax:637.42},
      {id:'6', desde:2030, hasta:2330, bMin:1274.51, bMax:2330, cMin:400.20, cMax:731.62},
      {id:'7', desde:2330, hasta:2760, bMin:1356.21, bMax:2760, cMin:425.85, cMax:866.64},
      {id:'8', desde:2760, hasta:3190, bMin:1437.91, bMax:3190, cMin:451.50, cMax:1001.66},
      {id:'9', desde:3190, hasta:3620, bMin:1519.61, bMax:3620, cMin:477.16, cMax:1136.68},
      {id:'10', desde:3620, hasta:4050, bMin:1601.31, bMax:4050, cMin:502.81, cMax:1271.70},
      {id:'11', desde:4050, hasta:6000, bMin:1732.03, bMax:4909.5, cMin:543.86, cMax:1541.58},
      {id:'12', desde:6000, hasta:9999999, bMin:1928.10, bMax:4909.5, cMin:605.42, cMax:1541.58}
    ]
  },
  2026: {
    pct: 0.315,
    deduccionFisica: 0.07,
    deduccionSocietario: 0.03,
    baseMinSocietario: 1424.40,
    tarifaPlana: 88.56,
    tramos: [
      {id:'R1', desde:0, hasta:670, bMin:653.59, bMax:718.94, cMin:205.88, cMax:226.47},
      {id:'R2', desde:670, hasta:900, bMin:718.95, bMax:900, cMin:226.47, cMax:283.50},
      {id:'R3', desde:900, hasta:1166.7, bMin:849.67, bMax:1166.7, cMin:267.65, cMax:367.51},
      {id:'1', desde:1166.7, hasta:1300, bMin:950.98, bMax:1300, cMin:299.56, cMax:409.50},
      {id:'2', desde:1300, hasta:1500, bMin:960.78, bMax:1500, cMin:302.65, cMax:472.50},
      {id:'3', desde:1500, hasta:1700, bMin:960.78, bMax:1700, cMin:302.65, cMax:535.50},
      {id:'4', desde:1700, hasta:1850, bMin:1143.79, bMax:1850, cMin:360.29, cMax:582.75},
      {id:'5', desde:1850, hasta:2030, bMin:1209.15, bMax:2030, cMin:380.88, cMax:639.45},
      {id:'6', desde:2030, hasta:2330, bMin:1274.51, bMax:2330, cMin:401.47, cMax:733.95},
      {id:'7', desde:2330, hasta:2760, bMin:1356.21, bMax:2760, cMin:427.21, cMax:869.40},
      {id:'8', desde:2760, hasta:3190, bMin:1437.91, bMax:3190, cMin:452.94, cMax:1004.85},
      {id:'9', desde:3190, hasta:3620, bMin:1519.61, bMax:3620, cMin:478.68, cMax:1140.30},
      {id:'10', desde:3620, hasta:4050, bMin:1601.31, bMax:4050, cMin:504.41, cMax:1275.75},
      {id:'11', desde:4050, hasta:6000, bMin:1732.03, bMax:4909.5, cMin:545.59, cMax:1546.49},
      {id:'12', desde:6000, hasta:9999999, bMin:1928.10, bMax:4909.5, cMin:607.35, cMax:1546.49}
    ]
  }
};
