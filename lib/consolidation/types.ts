export type FileType = "pra" | "spp" | "reference";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

export interface FileMetadata {
  title: string;
  company: string;
  period: string;
}

// ─── Raw parsed records (before enrichment) ───────────────────────────────────

export interface PRARawRecord {
  chapaNo: string;
  lastName: string;
  firstName: string;
  middleInitial: string;
  employeeStatus: string;
  location: string;
  regularizationDate: string;
  regularContribution: string;
}

export interface SPPRawRecord {
  chapaNo: string;       // sourced from "Perm. Emp. No."
  lastName: string;      // sourced from "Surname"
  firstName: string;
  middleInitial: string;
  employeeStatus: string;
  location: string;
  sppEeCont: string;     // "SPP EE Cont for the Month of …"
  sppErCont: string;     // "SPP ER Cont for the Month of …"
}

export interface ReferenceRecord {
  chapaNo: string;
  birthdate: string;
  hiredDate: string;
}

// ─── Output records (after reference enrichment) ──────────────────────────────

export interface PRAOutputRecord extends PRARawRecord {
  birthdate: string;
  hiredDate: string;
}

export interface SPPOutputRecord extends SPPRawRecord {
  birthdate: string;
  hiredDate: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface SheetInfo {
  name: string;
  rows: number;
  inferredLocation: string;
  inferredStatus: string;
}

export interface FileValidationResult {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: FileType;
  totalRows: number;
  detectedColumns: string[];
  missingRequiredColumns: string[];
  duplicateChapaCount: number;
  isValid: boolean;
  metadata: FileMetadata;
  sheets: SheetInfo[];
}

export interface ReferenceValidationResult {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  detectedColumns: string[];
  missingRequiredColumns: string[];
  isValid: boolean;
}

export interface ValidationState {
  praResults: FileValidationResult[];
  sppResults: FileValidationResult[];
  referenceResult: ReferenceValidationResult | null;
  unmatchedChapaCount: number;
  totalPraRows: number;
  totalSppRows: number;
  allValid: boolean;
}

// ─── Processing result ────────────────────────────────────────────────────────

export interface ProcessingResult {
  praRecords: PRAOutputRecord[];
  sppRecords: SPPOutputRecord[];
  praMetadata: FileMetadata;
  sppMetadata: FileMetadata;
  unmatchedChapaIds: string[];
  generatedAt: string;
  outputFileName: string;
}
