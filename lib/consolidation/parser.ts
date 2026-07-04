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
  SourceFooter,
  CrossCheckResult,
} from "./types";

// ─── Numeric helper ───────────────────────────────────────────────────────────

function parseNumeric(val: string): number {
  return parseFloat(String(val || "").replace(/,/g, "").trim()) || 0;
}

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
const COST_CENTER_ALIASES  = ["cost center", "cost centre", "costcenter", "cost ctr", "cost_center"];
const BIRTHDATE_ALIASES    = ["birthdate", "birth date", "birthday", "date of birth", "dob"];
const HIRED_DATE_ALIASES   = ["hired date", "hire date", "date hired", "hiredate"];

// ─── Matching helpers ─────────────────────────────────────────────────────────

function normalize(s: unknown): string {
  // Strip asterisks (e.g. "Date Hired *" → "date hired") before matching
  return String(s ?? "").trim().toLowerCase().replace(/\*/g, "").trim();
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

// Normalize any raw location value to BUGO or PLANTATION.
// If both tab inference and column are empty, returns "" (no location info).
function normalizeLocation(raw: string): string {
  if (!raw || !raw.trim()) return "";
  const loc = raw.toUpperCase().trim();
  if (loc === "BUGO" || loc.includes("BUGO")) return "BUGO";
  return "PLANTATION"; // CAMP PHILLIPS (COMPOUND), FAR EAST, PLANTATION, etc.
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

// ─── Footer parser ────────────────────────────────────────────────────────────

function parseFooter(rows: string[][], stopIdx: number): SourceFooter {
  // Extract grand total from the Total: row (rightmost numeric value)
  const totalRow = stopIdx < rows.length ? rows[stopIdx] : [];
  let grandTotalAmount = 0;
  for (let i = totalRow.length - 1; i >= 0; i--) {
    const v = parseNumeric(totalRow[i]);
    if (v > 0) { grandTotalAmount = v; break; }
  }

  const locations: SourceFooter["locations"] = [];
  let currentLoc = "";

  // Scan up to 300 rows after the stop for the footer section
  const limit = Math.min(stopIdx + 300, rows.length);
  for (let i = stopIdx + 1; i < limit; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;

    const first  = normalize(row[0] ?? "");
    const second = normalize(row[1] ?? "");

    // Detect location header rows (e.g. "BUGO", "PLANTATION", or "Location | BUGO")
    let locName = "";
    if (first === "bugo" || (first.includes("bugo") && !first.includes("grand"))) locName = "BUGO";
    else if (first === "plantation" || (first.includes("plantation") && !first.includes("grand"))) locName = "PLANTATION";
    else if (first === "location") {
      if (second.includes("bugo")) locName = "BUGO";
      else if (second.includes("plantation")) locName = "PLANTATION";
    }

    if (locName) { currentLoc = locName; continue; }

    // Detect Grand Total row within a location block
    if (currentLoc && (first === "grand total" || first.startsWith("grand"))) {
      const count = parseInt(String(row[1] || "0").replace(/,/g, "")) || 0;
      // Sum all numeric values from column 2 onwards (handles both PRA single-amount and SPP EE+ER)
      let total = 0;
      for (let c = 2; c < row.length; c++) total += parseNumeric(row[c]);
      locations.push({ location: currentLoc, count, totalAmount: total });
      currentLoc = "";
    }
  }

  return { grandTotalAmount, locations };
}

// ─── Parse PRA file (all sheets — tab location prevails over column) ──────────

export async function parsePRAFile(file: File): Promise<{
  records: PRARawRecord[];
  metadata: FileMetadata;
  detectedColumns: string[];
  sheets: SheetInfo[];
  footer: SourceFooter;
}> {
  const wb = await readWorkbook(file);

  const allRecords: PRARawRecord[] = [];
  const allColumns  = new Set<string>();
  const allSheets:  SheetInfo[]    = [];
  let firstMeta: FileMetadata = { title: "", company: "", period: "" };
  let isFirst = true;

  // Accumulate footer data across sheets
  let combinedGrandTotal = 0;
  const combinedLocations: Map<string, { count: number; totalAmount: number }> = new Map();

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
      costCenter:   findExact(headers, COST_CENTER_ALIASES),
      regDate:      findExact(headers, REG_DATE_ALIASES),
      contribution: findExact(headers, CONTRIBUTION_ALIASES),
    };

    const sheetStart = allRecords.length;

    let dataStopIdx = rows.length;
    for (let i = hIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (isStopRow(row)) { dataStopIdx = i; break; }
      if (isEmptyRow(row)) continue;
      const chapa = col.chapa >= 0 ? row[col.chapa] : "";
      if (!chapa) continue;

      // Tab name prevails; then normalize raw value → BUGO or PLANTATION
      const colLocation = col.location >= 0 ? row[col.location] : "";
      const location    = normalizeLocation(
        inferredLocation !== "" ? inferredLocation : colLocation
      );

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
        costCenter:          col.costCenter   >= 0 ? row[col.costCenter]   : "",
        regularizationDate:  col.regDate      >= 0 ? row[col.regDate]      : "",
        regularContribution: col.contribution >= 0 ? row[col.contribution] : "",
      });
    }

    // Parse this sheet's footer and merge into combined totals
    const sheetFooter = parseFooter(rows, dataStopIdx);
    combinedGrandTotal += sheetFooter.grandTotalAmount;
    for (const fl of sheetFooter.locations) {
      const existing = combinedLocations.get(fl.location);
      if (existing) {
        existing.count       += fl.count;
        existing.totalAmount += fl.totalAmount;
      } else {
        combinedLocations.set(fl.location, { count: fl.count, totalAmount: fl.totalAmount });
      }
    }

    const sheetRecords = allRecords.slice(sheetStart);
    const computedTotal = sheetRecords.reduce((s, r) => s + parseNumeric(String(r.regularContribution)), 0);

    allSheets.push({
      name:                sheetName,
      rows:                allRecords.length - sheetStart,
      inferredLocation,
      inferredStatus,
      sourceGrandTotal:    sheetFooter.grandTotalAmount,
      computedGrandTotal:  computedTotal,
    });
  }

  const footer: SourceFooter = {
    grandTotalAmount: combinedGrandTotal,
    locations: Array.from(combinedLocations.entries()).map(([location, v]) => ({
      location,
      count:       v.count,
      totalAmount: v.totalAmount,
    })),
  };

  return {
    records:         allRecords,
    metadata:        firstMeta,
    detectedColumns: Array.from(allColumns),
    sheets:          allSheets,
    footer,
  };
}

// ─── Parse SPP file (all sheets) ─────────────────────────────────────────────

export async function parseSPPFile(file: File): Promise<{
  records: SPPRawRecord[];
  metadata: FileMetadata;
  detectedColumns: string[];
  sheets: SheetInfo[];
  footer: SourceFooter;
}> {
  const wb = await readWorkbook(file);

  const allRecords: SPPRawRecord[] = [];
  const allColumns  = new Set<string>();
  const allSheets:  SheetInfo[]    = [];
  let firstMeta: FileMetadata = { title: "", company: "", period: "" };
  let isFirst = true;

  // Accumulate footer data across sheets
  let combinedGrandTotal = 0;
  const combinedLocations: Map<string, { count: number; totalAmount: number }> = new Map();

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
      permEmp:    (() => {
        let idx = findContains(headers, PERM_EMP_ALIASES);
        if (idx < 0) idx = findExact(headers, CHAPA_ALIASES);
        return idx;
      })(),
      surname:    findExact(headers, SURNAME_ALIASES),
      firstName:  findExact(headers, FIRST_NAME_ALIASES),
      middle:     findExact(headers, MIDDLE_ALIASES),
      empStatus:  findExact(headers, EMP_STATUS_ALIASES),
      location:   (() => {
        // Prefer "Location Code" column, fall back to plain "Location"
        let idx = findExact(headers, LOCATION_CODE_ALIASES);
        if (idx < 0) idx = findExact(headers, LOCATION_ALIASES);
        return idx;
      })(),
      costCenter: findExact(headers, COST_CENTER_ALIASES),
      eeCont:     findContains(headers, SPP_EE_SUBSTR),
      erCont:     findContains(headers, SPP_ER_SUBSTR),
    };

    const sheetStart = allRecords.length;

    let dataStopIdx = rows.length;
    for (let i = hIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (isStopRow(row)) { dataStopIdx = i; break; }
      if (isEmptyRow(row)) continue;

      const chapa = col.permEmp >= 0 ? row[col.permEmp] : "";
      if (!chapa) continue;

      // Tab name prevails; fall back to location code → raw column; normalize to BUGO/PLANTATION
      const rawLocation = col.location >= 0 ? row[col.location] : "";
      const location    = normalizeLocation(
        inferredLocation !== ""
          ? inferredLocation
          : resolveLocationCode(rawLocation) || rawLocation
      );

      // Resolve status: column first, fall back to sheet-name inference
      const rawStatus    = col.empStatus >= 0 ? row[col.empStatus] : "";
      const employeeStatus = rawStatus || inferredStatus;

      allRecords.push({
        chapaNo:       chapa,
        lastName:      col.surname    >= 0 ? row[col.surname]    : "",
        firstName:     col.firstName  >= 0 ? row[col.firstName]  : "",
        middleInitial: col.middle     >= 0 ? row[col.middle]     : "",
        employeeStatus,
        location,
        costCenter:    col.costCenter >= 0 ? row[col.costCenter] : "",
        sppEeCont:     col.eeCont     >= 0 ? row[col.eeCont]     : "",
        sppErCont:     col.erCont     >= 0 ? row[col.erCont]     : "",
      });
    }

    // Parse this sheet's footer and merge into combined totals
    const sheetFooter = parseFooter(rows, dataStopIdx);
    combinedGrandTotal += sheetFooter.grandTotalAmount;
    for (const fl of sheetFooter.locations) {
      const existing = combinedLocations.get(fl.location);
      if (existing) {
        existing.count       += fl.count;
        existing.totalAmount += fl.totalAmount;
      } else {
        combinedLocations.set(fl.location, { count: fl.count, totalAmount: fl.totalAmount });
      }
    }

    // Record sheet-level info for validation display
    const sheetRecords = allRecords.slice(sheetStart);
    const computedTotal = sheetRecords.reduce((s, r) => s + parseNumeric(String(r.sppEeCont)) + parseNumeric(String(r.sppErCont)), 0);
    allSheets.push({
      name:                sheetName,
      rows:                sheetRecords.length,
      inferredLocation,
      inferredStatus,
      sourceGrandTotal:    sheetFooter.grandTotalAmount,
      computedGrandTotal:  computedTotal,
    });
  }

  const footer: SourceFooter = {
    grandTotalAmount: combinedGrandTotal,
    locations: Array.from(combinedLocations.entries()).map(([location, v]) => ({
      location,
      count:       v.count,
      totalAmount: v.totalAmount,
    })),
  };

  return {
    records:          allRecords,
    metadata:         firstMeta,
    detectedColumns:  Array.from(allColumns),
    sheets:           allSheets,
    footer,
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
  { label: "Cost Center",          check: (cols: string[]) => cols.some((h) => matchExact(h, COST_CENTER_ALIASES)) },
  { label: "Regular Contribution", check: (cols: string[]) => cols.some((h) => matchExact(h, CONTRIBUTION_ALIASES)) },
];

// SPP: Location and Employee Status can come from sheet names — not required as columns
const SPP_REQUIRED = [
  { label: "Perm. Emp. No.", check: (cols: string[]) =>
      cols.some((h) => matchExact(h, PERM_EMP_ALIASES) || matchContains(h, PERM_EMP_ALIASES)) },
  { label: "Surname",        check: (cols: string[]) => cols.some((h) => matchExact(h, SURNAME_ALIASES)) },
  { label: "First Name",     check: (cols: string[]) => cols.some((h) => matchExact(h, FIRST_NAME_ALIASES)) },
  { label: "Cost Center",    check: (cols: string[]) => cols.some((h) => matchExact(h, COST_CENTER_ALIASES)) },
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

    const { records, metadata, detectedColumns, footer } = parsed;
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

    // ── Cross-check: compare footer totals against parsed records ─────────────
    const TOLERANCE = 0.02;

    const computedTotal =
      fileType === "pra"
        ? records.reduce((s, r: any) => s + parseNumeric(String(r.regularContribution)), 0)
        : records.reduce(
            (s, r: any) => s + parseNumeric(String(r.sppEeCont)) + parseNumeric(String(r.sppErCont)),
            0
          );

    const totalAmountMatch = Math.abs(computedTotal - footer.grandTotalAmount) <= TOLERANCE;

    const locationResults = footer.locations.map((fl) => {
      const ourRecs = records.filter((r: any) => r.location === fl.location);
      const ourCount = ourRecs.length;
      const ourAmount =
        fileType === "pra"
          ? ourRecs.reduce((s, r: any) => s + parseNumeric(String(r.regularContribution)), 0)
          : ourRecs.reduce(
              (s, r: any) => s + parseNumeric(String(r.sppEeCont)) + parseNumeric(String(r.sppErCont)),
              0
            );
      return {
        location:       fl.location,
        sourceCount:    fl.count,
        computedCount:  ourCount,
        sourceAmount:   fl.totalAmount,
        computedAmount: ourAmount,
        countMatch:     ourCount === fl.count,
        amountMatch:    Math.abs(ourAmount - fl.totalAmount) <= TOLERANCE,
      };
    });

    const crossCheck: CrossCheckResult = {
      hasDiscrepancy:      !totalAmountMatch || locationResults.some((l) => !l.countMatch || !l.amountMatch),
      sourceTotalAmount:   footer.grandTotalAmount,
      computedTotalAmount: computedTotal,
      totalAmountMatch,
      locationResults,
    };
    // ─────────────────────────────────────────────────────────────────────────

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
      sourceFooter:          footer,
      crossCheck,
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
