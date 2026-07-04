import * as XLSX from "xlsx";
import type {
  FileMetadata,
  PRARawRecord,
  SPPRawRecord,
  ReferenceRecord,
  FileValidationResult,
  ReferenceValidationResult,
  SheetInfo,
  FileType,
} from "./types";

// ─── Column aliases ───────────────────────────────────────────────────────────

const CHAPA_ALIASES        = ["chapa no.", "chapa no", "chapa"];
const PERM_EMP_ALIASES     = ["perm. emp. no.", "perm emp no", "perm. emp no", "perm.emp.no.", "perm. emp. no"];
const LAST_NAME_ALIASES    = ["last name", "lastname", "last"];
const SURNAME_ALIASES      = ["surname", "sur name"];
const FIRST_NAME_ALIASES   = ["first name", "firstname", "given name", "first"];
const MIDDLE_ALIASES       = ["middle initial", "m.i.", "mi", "middle"];
const EMP_STATUS_ALIASES   = ["employee status", "emp status", "emp. status", "status"];
const LOCATION_ALIASES     = ["location"];
const LOCATION_CODE_ALIASES = ["location code", "loc. code", "loc code", "loccode", "loc. cd", "loc cd"];
const REG_DATE_ALIASES     = ["regularization date", "reg date", "reg. date", "regularization"];
const CONTRIBUTION_ALIASES = ["regular contribution", "reg contribution", "reg. contribution", "contribution"];
const SPP_EE_SUBSTR        = ["spp ee cont", "ee cont", "spp ee contribution", "ee contribution"];
const SPP_ER_SUBSTR        = ["spp er cont", "er cont", "spp er contribution", "er contribution"];
const BIRTHDATE_ALIASES    = ["birthdate", "birth date", "date of birth", "dob"];
const HIRED_DATE_ALIASES   = ["hired date", "hire date", "date hired", "hiredate"];

// ─── Matching helpers ─────────────────────────────────────────────────────────

function normalize(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function matchExact(header: string, aliases: string[]): boolean {
  const n = normalize(header);
  return aliases.some((a) => n === a.toLowerCase());
}

function matchContains(header: string, substrings: string[]): boolean {
  const n = normalize(header);
  return substrings.some((s) => n.includes(s.toLowerCase()));
}

function findExact(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => matchExact(h, aliases));
}

function findContains(headers: string[], substrings: string[]): number {
  return headers.findIndex((h) => matchContains(h, substrings));
}

// ─── Location code → name ─────────────────────────────────────────────────────

const LOCATION_CODE_MAP: Record<string, string> = {
  "1": "BUGO",
  "2": "PLANTATION",
};

function resolveLocationCode(raw: string): string {
  const trimmed = raw.trim();
  return LOCATION_CODE_MAP[trimmed] ?? trimmed;
}

// ─── Sheet name → inferred status / location ──────────────────────────────────

function inferStatusFromContext(sheetName: string, metaText: string): string {
  const name = sheetName.toUpperCase();
  const meta = metaText.toUpperCase();

  if (name.includes("HRLS") || name.includes("HOURLY") || meta.includes("HOURLIES"))  return "HOURLIES";
  if (name.includes("MNS")  || name.includes("MONTHLY") || meta.includes("MONTHLIES")) return "MONTHLIES";
  // Supervisor file: tabs are BUGO/PLTN but metadata or sheet context says supervisor
  if (
    name.includes("SUP") ||
    meta.includes("SUPERVISOR") ||
    meta.includes("CONFI") ||
    // If the sheet name is purely a location name, the status comes from metadata
    ((name.includes("BUGO") || name.includes("PLTN") || name.includes("PLANTATION")) &&
      (meta.includes("SUPERVISOR") || meta.includes("CONFI")))
  ) {
    return "SUPERVISOR";
  }
  return "";
}

function inferLocationFromSheetName(sheetName: string): string {
  const name = sheetName.toUpperCase();
  if (name.includes("BUGO"))                                      return "BUGO";
  if (name.includes("PLTN") || name.includes("PLNT") || name.includes("PLANTATION")) return "PLANTATION";
  return "";
}

// ─── Excel I/O ────────────────────────────────────────────────────────────────

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
}

function getSheetRows(wb: XLSX.WorkBook, sheetName: string): string[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
  return raw.map((row) => (row as unknown[]).map((c) => String(c ?? "").trim()));
}

// ─── Header detection ─────────────────────────────────────────────────────────

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (
      row.some((c) => matchExact(c, CHAPA_ALIASES)) ||
      row.some((c) => matchExact(c, PERM_EMP_ALIASES)) ||
      row.some((c) => matchContains(c, PERM_EMP_ALIASES))
    ) {
      return i;
    }
  }
  return -1;
}

function extractMetadata(rows: string[][], headerIdx: number): FileMetadata {
  const above = rows.slice(0, headerIdx).map((r) => r.join(" ").trim()).filter(Boolean);
  return {
    title:   above[0] ?? "",
    company: above[1] ?? "",
    period:  above[2] ?? "",
  };
}

function isStopRow(row: string[]): boolean {
  const first  = normalize(row[0] ?? "");
  const joined = row.join(" ").trim().toLowerCase();
  return (
    first === "total:" ||
    first === "total"  ||
    joined.startsWith("total:") ||
    joined.startsWith("grand total") ||
    joined.startsWith("job level") ||
    joined.startsWith("location")
  );
}

function isEmptyRow(row: string[]): boolean {
  return row.every((c) => !c || c.trim() === "");
}

// ─── Parse PRA file (all sheets — tab location prevails over column) ──────────

export async function parsePRAFile(file: File): Promise<{
  records: PRARawRecord[];
  metadata: FileMetadata;
  detectedColumns: string[];
  sheets: SheetInfo[];
}> {
  const wb = await readWorkbook(file);

  const allRecords: PRARawRecord[] = [];
  const allColumns  = new Set<string>();
  const allSheets:  SheetInfo[]    = [];
  let firstMeta: FileMetadata = { title: "", company: "", period: "" };
  let isFirst = true;

  for (const sheetName of wb.SheetNames) {
    const rows = getSheetRows(wb, sheetName);
    const hIdx = findHeaderRow(rows);
    if (hIdx === -1) continue;

    const metadata = extractMetadata(rows, hIdx);
    if (isFirst) { firstMeta = metadata; isFirst = false; }

    const metaText        = [metadata.title, metadata.company, metadata.period].join(" ");
    const inferredLocation = inferLocationFromSheetName(sheetName);
    const inferredStatus   = inferStatusFromContext(sheetName, metaText);

    const headers = rows[hIdx];
    headers.filter(Boolean).forEach((c) => allColumns.add(c));

    const col = {
      chapa:        findExact(headers, CHAPA_ALIASES),
      lastName:     findExact(headers, LAST_NAME_ALIASES),
      firstName:    findExact(headers, FIRST_NAME_ALIASES),
      middle:       findExact(headers, MIDDLE_ALIASES),
      empStatus:    findExact(headers, EMP_STATUS_ALIASES),
      location:     findExact(headers, LOCATION_ALIASES),
      regDate:      findExact(headers, REG_DATE_ALIASES),
      contribution: findExact(headers, CONTRIBUTION_ALIASES),
    };

    const sheetStart = allRecords.length;

    for (let i = hIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (isStopRow(row)) break;
      if (isEmptyRow(row)) continue;
      const chapa = col.chapa >= 0 ? row[col.chapa] : "";
      if (!chapa) continue;

      // Tab name prevails over column value for location
      const colLocation = col.location >= 0 ? row[col.location] : "";
      const location    = inferredLocation !== "" ? inferredLocation : colLocation;

      // Tab name / metadata prevails for status if column is absent
      const colStatus     = col.empStatus >= 0 ? row[col.empStatus] : "";
      const employeeStatus = colStatus || inferredStatus;

      allRecords.push({
        chapaNo:             chapa,
        lastName:            col.lastName     >= 0 ? row[col.lastName]     : "",
        firstName:           col.firstName    >= 0 ? row[col.firstName]    : "",
        middleInitial:       col.middle       >= 0 ? row[col.middle]       : "",
        employeeStatus,
        location,
        regularizationDate:  col.regDate      >= 0 ? row[col.regDate]      : "",
        regularContribution: col.contribution >= 0 ? row[col.contribution] : "",
      });
    }

    allSheets.push({
      name:             sheetName,
      rows:             allRecords.length - sheetStart,
      inferredLocation,
      inferredStatus,
    });
  }

  return {
    records:         allRecords,
    metadata:        firstMeta,
    detectedColumns: Array.from(allColumns),
    sheets:          allSheets,
  };
}

// ─── Parse SPP file (all sheets) ─────────────────────────────────────────────

export async function parseSPPFile(file: File): Promise<{
  records: SPPRawRecord[];
  metadata: FileMetadata;
  detectedColumns: string[];
  sheets: SheetInfo[];
}> {
  const wb = await readWorkbook(file);

  const allRecords: SPPRawRecord[] = [];
  const allColumns  = new Set<string>();
  const allSheets:  SheetInfo[]    = [];
  let firstMeta: FileMetadata = { title: "", company: "", period: "" };
  let isFirst = true;

  for (const sheetName of wb.SheetNames) {
    const rows = getSheetRows(wb, sheetName);
    const hIdx = findHeaderRow(rows);
    if (hIdx === -1) continue; // sheet has no recognisable data — skip

    const metadata = extractMetadata(rows, hIdx);
    if (isFirst) { firstMeta = metadata; isFirst = false; }

    // Infer status and location from sheet name + metadata text
    const metaText        = [metadata.title, metadata.company, metadata.period].join(" ");
    const inferredStatus   = inferStatusFromContext(sheetName, metaText);
    const inferredLocation = inferLocationFromSheetName(sheetName);

    const headers = rows[hIdx];
    headers.filter(Boolean).forEach((c) => allColumns.add(c));

    const col = {
      permEmp:   (() => {
        let idx = findContains(headers, PERM_EMP_ALIASES);
        if (idx < 0) idx = findExact(headers, CHAPA_ALIASES);
        return idx;
      })(),
      surname:   findExact(headers, SURNAME_ALIASES),
      firstName: findExact(headers, FIRST_NAME_ALIASES),
      middle:    findExact(headers, MIDDLE_ALIASES),
      empStatus: findExact(headers, EMP_STATUS_ALIASES),
      location:  (() => {
        // Prefer "Location Code" column, fall back to plain "Location"
        let idx = findExact(headers, LOCATION_CODE_ALIASES);
        if (idx < 0) idx = findExact(headers, LOCATION_ALIASES);
        return idx;
      })(),
      eeCont:    findContains(headers, SPP_EE_SUBSTR),
      erCont:    findContains(headers, SPP_ER_SUBSTR),
    };

    for (let i = hIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (isStopRow(row)) break;
      if (isEmptyRow(row)) continue;

      const chapa = col.permEmp >= 0 ? row[col.permEmp] : "";
      if (!chapa) continue;

      // Tab name prevails; fall back to location code column, then raw column value
      const rawLocation = col.location >= 0 ? row[col.location] : "";
      const location    = inferredLocation !== ""
        ? inferredLocation
        : resolveLocationCode(rawLocation) || rawLocation;

      // Resolve status: column first, fall back to sheet-name inference
      const rawStatus    = col.empStatus >= 0 ? row[col.empStatus] : "";
      const employeeStatus = rawStatus || inferredStatus;

      allRecords.push({
        chapaNo:       chapa,
        lastName:      col.surname   >= 0 ? row[col.surname]   : "",
        firstName:     col.firstName >= 0 ? row[col.firstName] : "",
        middleInitial: col.middle    >= 0 ? row[col.middle]    : "",
        employeeStatus,
        location,
        sppEeCont:     col.eeCont >= 0 ? row[col.eeCont] : "",
        sppErCont:     col.erCont >= 0 ? row[col.erCont] : "",
      });
    }

    // Record sheet-level info for validation display
    const sheetRowCount = allRecords.length - (allSheets.reduce((s, sh) => s + sh.rows, 0));
    allSheets.push({
      name:             sheetName,
      rows:             sheetRowCount,
      inferredLocation,
      inferredStatus,
    });
  }

  return {
    records:          allRecords,
    metadata:         firstMeta,
    detectedColumns:  Array.from(allColumns),
    sheets:           allSheets,
  };
}

// ─── Parse reference file ─────────────────────────────────────────────────────

export async function parseReferenceFile(file: File): Promise<{
  records: ReferenceRecord[];
  detectedColumns: string[];
}> {
  const wb   = await readWorkbook(file);
  const rows = getSheetRows(wb, wb.SheetNames[0]);
  const hIdx = findHeaderRow(rows);
  if (hIdx === -1) throw new Error(`No header row found in reference file`);

  const headers         = rows[hIdx];
  const detectedColumns = headers.filter(Boolean);

  const col = {
    chapa:     (() => {
      let idx = findExact(headers, CHAPA_ALIASES);
      if (idx < 0) idx = findContains(headers, PERM_EMP_ALIASES);
      return idx;
    })(),
    birthdate: findExact(headers, BIRTHDATE_ALIASES),
    hiredDate: findExact(headers, HIRED_DATE_ALIASES),
  };

  const records: ReferenceRecord[] = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;
    const chapa = col.chapa >= 0 ? row[col.chapa] : "";
    if (!chapa) continue;
    records.push({
      chapaNo:   chapa,
      birthdate: col.birthdate >= 0 ? row[col.birthdate] : "",
      hiredDate: col.hiredDate >= 0 ? row[col.hiredDate] : "",
    });
  }

  return { records, detectedColumns };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const PRA_REQUIRED = [
  { label: "CHAPA No.",            check: (cols: string[]) => cols.some((h) => matchExact(h, CHAPA_ALIASES)) },
  { label: "Last Name",            check: (cols: string[]) => cols.some((h) => matchExact(h, LAST_NAME_ALIASES)) },
  { label: "First Name",           check: (cols: string[]) => cols.some((h) => matchExact(h, FIRST_NAME_ALIASES)) },
  { label: "Employee Status",      check: (cols: string[]) => cols.some((h) => matchExact(h, EMP_STATUS_ALIASES)) },
  { label: "Location",             check: (cols: string[]) => cols.some((h) => matchExact(h, LOCATION_ALIASES)) },
  { label: "Regular Contribution", check: (cols: string[]) => cols.some((h) => matchExact(h, CONTRIBUTION_ALIASES)) },
];

// SPP: Location and Employee Status can come from sheet names — not required as columns
const SPP_REQUIRED = [
  { label: "Perm. Emp. No.", check: (cols: string[]) =>
      cols.some((h) => matchExact(h, PERM_EMP_ALIASES) || matchContains(h, PERM_EMP_ALIASES)) },
  { label: "Surname",        check: (cols: string[]) => cols.some((h) => matchExact(h, SURNAME_ALIASES)) },
  { label: "First Name",     check: (cols: string[]) => cols.some((h) => matchExact(h, FIRST_NAME_ALIASES)) },
  { label: "SPP EE Cont",    check: (cols: string[]) => cols.some((h) => matchContains(h, SPP_EE_SUBSTR)) },
  { label: "SPP ER Cont",    check: (cols: string[]) => cols.some((h) => matchContains(h, SPP_ER_SUBSTR)) },
];

export async function validateTransactionFile(
  uploadedFile: { id: string; name: string; size: number; file: File },
  fileType: FileType
): Promise<FileValidationResult> {
  try {
    const parsed =
      fileType === "pra"
        ? await parsePRAFile(uploadedFile.file)
        : await parseSPPFile(uploadedFile.file);

    const { records, metadata, detectedColumns } = parsed;
    const required = fileType === "pra" ? PRA_REQUIRED : SPP_REQUIRED;

    const missingRequiredColumns = required
      .filter(({ check }) => !check(detectedColumns))
      .map(({ label }) => label);

    const chapaValues = records.map((r) => r.chapaNo);
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const c of chapaValues) {
      if (seen.has(c)) dups.add(c);
      seen.add(c);
    }

    return {
      fileId:                uploadedFile.id,
      fileName:              uploadedFile.name,
      fileSize:              uploadedFile.size,
      fileType,
      totalRows:             records.length,
      detectedColumns,
      missingRequiredColumns,
      duplicateChapaCount:   dups.size,
      isValid:               missingRequiredColumns.length === 0,
      metadata,
      sheets:                parsed.sheets ?? [],
    };
  } catch {
    return {
      fileId:                uploadedFile.id,
      fileName:              uploadedFile.name,
      fileSize:              uploadedFile.size,
      fileType,
      totalRows:             0,
      detectedColumns:       [],
      missingRequiredColumns:["Could not parse file"],
      duplicateChapaCount:   0,
      isValid:               false,
      metadata:              { title: "", company: "", period: "" },
      sheets:                [],
    };
  }
}

export async function validateReferenceFile(
  uploadedFile: { id: string; name: string; size: number; file: File }
): Promise<ReferenceValidationResult> {
  try {
    const { records, detectedColumns } = await parseReferenceFile(uploadedFile.file);

    const required = [
      { label: "CHAPA No.", check: (cols: string[]) =>
          cols.some((h) => matchExact(h, CHAPA_ALIASES) || matchContains(h, PERM_EMP_ALIASES)) },
      { label: "Birthdate",  check: (cols: string[]) => cols.some((h) => matchExact(h, BIRTHDATE_ALIASES)) },
      { label: "Hired Date", check: (cols: string[]) => cols.some((h) => matchExact(h, HIRED_DATE_ALIASES)) },
    ];

    const missingRequiredColumns = required
      .filter(({ check }) => !check(detectedColumns))
      .map(({ label }) => label);

    return {
      fileId:                uploadedFile.id,
      fileName:              uploadedFile.name,
      fileSize:              uploadedFile.size,
      totalRows:             records.length,
      detectedColumns,
      missingRequiredColumns,
      isValid:               missingRequiredColumns.length === 0,
    };
  } catch {
    return {
      fileId:                uploadedFile.id,
      fileName:              uploadedFile.name,
      fileSize:              uploadedFile.size,
      totalRows:             0,
      detectedColumns:       [],
      missingRequiredColumns:["Could not parse file"],
      isValid:               false,
    };
  }
}
