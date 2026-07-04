import * as XLSX from "xlsx-js-style";
import type { PRAOutputRecord, SPPOutputRecord, FileMetadata, ProcessingResult } from "./types";

// ─── Column headers ───────────────────────────────────────────────────────────

const PRA_HEADERS = [
  "CHAPA No.", "Last Name", "First Name", "Middle Initial",
  "Employee Status", "Location", "Birthdate", "Hired Date",
  "Regularization Date", "Regular Contribution", "Cost Center",
];

// SPP output uses "Perm. Emp. No." as the first column header
const SPP_HEADERS = [
  "Perm. Emp. No.", "Last Name", "First Name", "Middle Initial",
  "Employee Status", "Location", "Birthdate", "Hired Date",
  "SPP EE Contribution", "SPP ER Contribution", "Cost Center",
];

// ─── Style helpers ────────────────────────────────────────────────────────────

type CellStyle = Record<string, unknown>;

function setStyle(ws: XLSX.WorkSheet, r: number, c: number, style: CellStyle): void {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: "s", v: "" };
  ws[addr].s = style;
}

const BOLD: CellStyle = { font: { bold: true } };

// Column headers — thin border on all four sides
const HEADER_STYLE: CellStyle = {
  font: { bold: true },
  border: {
    top:    { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left:   { style: "thin", color: { rgb: "000000" } },
    right:  { style: "thin", color: { rgb: "000000" } },
  },
};

// Total row — medium border top + bottom only (no left/right on empty cells)
const TOTAL_STYLE: CellStyle = {
  font: { bold: true },
  border: {
    top:    { style: "medium", color: { rgb: "000000" } },
    bottom: { style: "medium", color: { rgb: "000000" } },
  },
};

const SUMMARY_LOCATION_STYLE: CellStyle = { font: { bold: true, sz: 11 } };

// Summary column headers — thin border top AND bottom
const SUMMARY_HEADER_STYLE: CellStyle = {
  font: { bold: true },
  border: {
    top:    { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
  },
};

// Grand Total in summary — bold + thin top border
const SUMMARY_GRAND_TOTAL_STYLE: CellStyle = {
  font: { bold: true },
  border: { top: { style: "thin", color: { rgb: "000000" } } },
};

// ─── Job-level / amount / location helpers ────────────────────────────────────

function normalizeJobLevel(status: string): string {
  const up = String(status || "").toUpperCase();
  if (up.includes("HOUR") || up.includes("HRLS")) return "Hourlies";
  if (up.includes("MONTH") || up.includes("MNS")) return "Monthlies";
  if (up.includes("SUP")) return "Supervisor";
  return status || "Other";
}

// For the summary tables, normalise every location to BUGO or PLANTATION only.
// Tab-name inference (parsePRAFile / parseSPPFile) already sets most records
// to BUGO/PLANTATION; this catches any residual column-value locations.
function normalizeLocationForSummary(location: string): string {
  const loc = String(location || "").toUpperCase().trim();
  if (loc.includes("BUGO")) return "BUGO";
  return "PLANTATION"; // everything else belongs to Plantation
}

function parseAmount(val: unknown): number {
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}

// ─── Summary builders ─────────────────────────────────────────────────────────

type RowMark = "blank" | "location" | "header" | "data" | "grand-total";

interface SummaryResult {
  rows: unknown[][];
  marks: RowMark[];
  cols: number; // number of columns in the summary table
}

function buildPRASummary(records: PRAOutputRecord[]): SummaryResult {
  const locationMap = new Map<string, Map<string, { count: number; rc: number }>>();

  for (const r of records) {
    const loc = normalizeLocationForSummary(r.location);
    const jl  = normalizeJobLevel(r.employeeStatus);
    if (!locationMap.has(loc)) locationMap.set(loc, new Map());
    const jlMap = locationMap.get(loc)!;
    if (!jlMap.has(jl)) jlMap.set(jl, { count: 0, rc: 0 });
    const e = jlMap.get(jl)!;
    e.count++;
    e.rc += parseAmount(r.regularContribution);
  }

  const rows: unknown[][] = [[], []];
  const marks: RowMark[]  = ["blank", "blank"];

  for (const loc of [...locationMap.keys()].sort()) {
    // Location label row: "Location" | locationName
    rows.push(["Location", loc]);  marks.push("location");
    rows.push(["Job Level", "Employee Count", "Contribution"]);
    marks.push("header");

    let gCount = 0, gRC = 0;
    for (const [jl, d] of locationMap.get(loc)!) {
      rows.push([jl, d.count, d.rc]);  marks.push("data");
      gCount += d.count;  gRC += d.rc;
    }
    rows.push(["Grand Total", gCount, gRC]);  marks.push("grand-total");
    rows.push([]);  marks.push("blank");
    rows.push([]);  marks.push("blank");
  }

  return { rows, marks, cols: 3 };
}

function buildSPPSummary(records: SPPOutputRecord[]): SummaryResult {
  const locationMap = new Map<string, Map<string, { count: number; ee: number; er: number }>>();

  for (const r of records) {
    const loc = normalizeLocationForSummary(r.location);
    const jl  = normalizeJobLevel(r.employeeStatus);
    if (!locationMap.has(loc)) locationMap.set(loc, new Map());
    const jlMap = locationMap.get(loc)!;
    if (!jlMap.has(jl)) jlMap.set(jl, { count: 0, ee: 0, er: 0 });
    const e = jlMap.get(jl)!;
    e.count++;
    e.ee += parseAmount(r.sppEeCont);
    e.er += parseAmount(r.sppErCont);
  }

  const rows: unknown[][] = [[], []];
  const marks: RowMark[]  = ["blank", "blank"];

  for (const loc of [...locationMap.keys()].sort()) {
    rows.push(["Location", loc]);  marks.push("location");
    rows.push(["Job Level", "Employee Count", "Contribution EE", "Contribution ER"]);
    marks.push("header");

    let gCount = 0, gEE = 0, gER = 0;
    for (const [jl, d] of locationMap.get(loc)!) {
      rows.push([jl, d.count, d.ee, d.er]);  marks.push("data");
      gCount += d.count;  gEE += d.ee;  gER += d.er;
    }
    rows.push(["Grand Total", gCount, gEE, gER]);  marks.push("grand-total");
    rows.push([]);  marks.push("blank");
    rows.push([]);  marks.push("blank");
  }

  return { rows, marks, cols: 4 };
}

// ─── Style applicator ─────────────────────────────────────────────────────────

function applySheetStyles(
  ws: XLSX.WorkSheet,
  dataCols: number,
  totalRowIdx: number,
  summaryStartIdx: number,
  summary: SummaryResult,
): void {
  // Bold metadata rows 0–2
  for (let r = 0; r <= 2; r++) setStyle(ws, r, 0, BOLD);

  // Column header row (row 4): bold + thin top + thin bottom border
  for (let c = 0; c < dataCols; c++) setStyle(ws, 4, c, HEADER_STYLE);

  // Total row: bold + medium top + medium bottom border
  for (let c = 0; c < dataCols; c++) setStyle(ws, totalRowIdx, c, TOTAL_STYLE);

  // Summary rows
  for (let i = 0; i < summary.marks.length; i++) {
    const r    = summaryStartIdx + i;
    const mark = summary.marks[i];

    if (mark === "location") {
      // Bold both "Location" label and the name beside it
      setStyle(ws, r, 0, SUMMARY_LOCATION_STYLE);
      setStyle(ws, r, 1, SUMMARY_LOCATION_STYLE);
    } else if (mark === "header") {
      for (let c = 0; c < summary.cols; c++) setStyle(ws, r, c, SUMMARY_HEADER_STYLE);
    } else if (mark === "grand-total") {
      for (let c = 0; c < summary.cols; c++) setStyle(ws, r, c, SUMMARY_GRAND_TOTAL_STYLE);
    }
  }
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildPRASheet(records: PRAOutputRecord[], metadata: FileMetadata): XLSX.WorkSheet {
  const totalRC  = records.reduce((s, r) => s + parseAmount(r.regularContribution), 0);
  const dataRows = records.map((r) => [
    r.chapaNo, r.lastName, r.firstName, r.middleInitial,
    r.employeeStatus, r.location, r.birthdate, r.hiredDate,
    r.regularizationDate, r.regularContribution, r.costCenter,
  ]);
  const totalRow = ["Total:", "", "", "", "", "", "", "", "", totalRC, ""];
  const summary  = buildPRASummary(records);

  const rows: unknown[][] = [
    ["PRA Contribution Register"],                   // row 0 — stripped of location/type suffix
    [metadata.company],                              // row 1
    [metadata.period],                               // row 2
    [],                                              // row 3 blank
    PRA_HEADERS,                                     // row 4
    ...dataRows,                                     // rows 5 … 5+N-1
    totalRow,                                        // row 5+N
    ...summary.rows,
  ];

  const ws          = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ showGridLines: false }];
  const totalRowIdx = 5 + dataRows.length;
  applySheetStyles(ws, PRA_HEADERS.length, totalRowIdx, totalRowIdx + 1, summary);
  return ws;
}

function buildSPPSheet(records: SPPOutputRecord[], metadata: FileMetadata): XLSX.WorkSheet {
  const totalEE  = records.reduce((s, r) => s + parseAmount(r.sppEeCont), 0);
  const totalER  = records.reduce((s, r) => s + parseAmount(r.sppErCont), 0);
  const dataRows = records.map((r) => [
    r.chapaNo, r.lastName, r.firstName, r.middleInitial,
    r.employeeStatus, r.location, r.birthdate, r.hiredDate,
    r.sppEeCont, r.sppErCont, r.costCenter,
  ]);
  const totalRow = ["Total:", "", "", "", "", "", "", "", totalEE, totalER, ""];
  const summary  = buildSPPSummary(records);

  const rows: unknown[][] = [
    ["SPP Contribution Register"],                   // row 0 — stripped of location/type suffix
    [metadata.company],
    [metadata.period],
    [],
    SPP_HEADERS,
    ...dataRows,
    totalRow,
    ...summary.rows,
  ];

  const ws          = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ showGridLines: false }];
  const totalRowIdx = 5 + dataRows.length;
  applySheetStyles(ws, SPP_HEADERS.length, totalRowIdx, totalRowIdx + 1, summary);
  return ws;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateOutputWorkbook(result: ProcessingResult): Blob {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildPRASheet(result.praRecords, result.praMetadata), "PRA Contribution Register");
  XLSX.utils.book_append_sheet(wb, buildSPPSheet(result.sppRecords, result.sppMetadata), "SPP Contribution Register");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
