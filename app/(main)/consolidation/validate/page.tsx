"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { useConsolidation } from "@/lib/consolidation/context";
import {
  validateTransactionFile,
  validateReferenceFile,
} from "@/lib/consolidation/parser";
import type {
  FileValidationResult,
  ReferenceValidationResult,
  ValidationState,
  SheetInfo,
} from "@/lib/consolidation/types";
import { cn } from "@/lib/utils";

const INDICATOR_STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Validate" },
  { number: 3, label: "Process" },
  { number: 4, label: "Download" },
];

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  status = "neutral",
}: {
  label: string;
  value: string | number;
  status?: "neutral" | "good" | "error";
}) {
  return (
    <div className="bg-[#f9fafb] rounded-lg px-3 py-3 border border-[#f0f0f0]">
      <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
        {label}
      </p>
      <p
        className={cn(
          "text-[20px] font-bold leading-none tabular-nums",
          status === "error"
            ? "text-[#dc2626]"
            : status === "good"
            ? "text-[#16a34a]"
            : "text-[#111827]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Sheet pill ───────────────────────────────────────────────────────────────

function SheetPill({ sheet }: { sheet: SheetInfo }) {
  const hasTotal   = sheet.sourceGrandTotal !== undefined && sheet.sourceGrandTotal > 0;
  const totalMatch = hasTotal &&
    Math.abs((sheet.computedGrandTotal ?? 0) - (sheet.sourceGrandTotal ?? 0)) < 0.02;

  return (
    <div className={cn(
      "flex flex-col gap-1.5 rounded-lg px-3 py-2.5 min-w-[100px] border",
      hasTotal
        ? totalMatch
          ? "bg-[#f0fdf4] border-[#bbf7d0]"
          : "bg-[#fef2f2] border-[#fecaca]"
        : "bg-[#f9fafb] border-[#e5e7eb]"
    )}>
      {/* Tab name + match indicator */}
      <div className="flex items-center justify-between gap-1">
        <p className="text-[11px] font-semibold text-[#374151] leading-none">{sheet.name}</p>
        {hasTotal && (
          totalMatch
            ? <CheckCircle2 size={10} className="text-[#16a34a] shrink-0" strokeWidth={2.5} />
            : <XCircle size={10} className="text-[#dc2626] shrink-0" strokeWidth={2.5} />
        )}
      </div>

      {/* Row count */}
      <p className="text-[10px] text-[#9ca3af]">{sheet.rows.toLocaleString()} rows</p>

      {/* Grand total cross-check */}
      {hasTotal && (
        <div className="space-y-0.5">
          <p className="text-[9px] text-[#6b7280]">
            Source: {sheet.sourceGrandTotal!.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </p>
          {!totalMatch && (
            <p className="text-[9px] text-[#dc2626] font-semibold">
              Computed: {(sheet.computedGrandTotal ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}

      {/* Location / status badges */}
      <div className="flex flex-wrap gap-1">
        {sheet.inferredLocation && (
          <span className="text-[9px] font-bold bg-[#e0f2fe] text-[#0369a1] rounded-full px-1.5 py-0.5 leading-none">
            {sheet.inferredLocation}
          </span>
        )}
        {sheet.inferredStatus && (
          <span className="text-[9px] font-bold bg-[#ede9fe] text-[#5b21b6] rounded-full px-1.5 py-0.5 leading-none">
            {sheet.inferredStatus}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Transaction file card ────────────────────────────────────────────────────

function FileCard({
  result,
  typeBadge,
  typeBadgeColor,
}: {
  result: FileValidationResult;
  typeBadge: string;
  typeBadgeColor: string;
}) {
  const columnsOk    = result.missingRequiredColumns.length === 0;
  const hasSheets    = result.sheets.length > 1;   // only show if more than 1 tab
  const skippedSheets = result.sheets.filter((s) => s.rows === 0);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <FileText size={16} className="text-[#3b82f6] shrink-0 mt-[2px]" strokeWidth={1.5} />
            <p className="text-[13px] font-semibold text-[#111827] leading-snug truncate" title={result.fileName}>
              {result.fileName}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full", typeBadgeColor)}>
              {typeBadge}
            </span>
            <span className={cn(
              "flex items-center gap-0.5 text-[10px] font-bold rounded-full px-2 py-0.5",
              result.isValid ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"
            )}>
              {result.isValid
                ? <CheckCircle2 size={9} strokeWidth={2.5} />
                : <XCircle size={9} strokeWidth={2.5} />}
              {result.isValid ? "Valid" : "Issues"}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-[#9ca3af] mt-1 pl-[22px]">
          {formatFileSize(result.fileSize)} &middot; Excel
          {result.sheets.length > 0 && ` · ${result.sheets.length} sheet${result.sheets.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Total Rows" value={result.totalRows.toLocaleString()} />
        <StatBox
          label="Columns Found"
          value={result.detectedColumns.length}
          status={columnsOk ? "good" : "error"}
        />
        <StatBox
          label="Dup. Chapa Nos"
          value={result.duplicateChapaCount}
          status={result.duplicateChapaCount > 0 ? "error" : "neutral"}
        />
        <StatBox
          label="Missing Cols"
          value={result.missingRequiredColumns.length}
          status={result.missingRequiredColumns.length > 0 ? "error" : "neutral"}
        />
      </div>

      {/* Cross-check against source file footer */}
      {result.crossCheck && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
            Source File Cross-Check
          </p>

          {/* Overall total match */}
          <div className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg text-[11px]",
            result.crossCheck.totalAmountMatch
              ? "bg-[#f0fdf4] border border-[#bbf7d0]"
              : "bg-[#fef2f2] border border-[#fecaca]"
          )}>
            <span className="text-[#374151] font-medium">Grand Total</span>
            <div className="flex items-center gap-2">
              <span className="text-[#6b7280]">
                Source: {result.crossCheck.sourceTotalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
              {result.crossCheck.totalAmountMatch
                ? <CheckCircle2 size={12} className="text-[#16a34a]" strokeWidth={2.5} />
                : <XCircle size={12} className="text-[#dc2626]" strokeWidth={2.5} />}
            </div>
          </div>

          {/* Per-location breakdown */}
          {result.crossCheck.locationResults.map(lr => (
            <div key={lr.location} className={cn(
              "px-3 py-2 rounded-lg text-[11px] border",
              lr.countMatch && lr.amountMatch
                ? "bg-[#f0fdf4] border-[#bbf7d0]"
                : "bg-[#fef2f2] border-[#fecaca]"
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#374151]">{lr.location}</span>
                {lr.countMatch && lr.amountMatch
                  ? <CheckCircle2 size={12} className="text-[#16a34a]" strokeWidth={2.5} />
                  : <AlertCircle size={12} className="text-[#dc2626]" strokeWidth={2.5} />}
              </div>
              <div className="flex gap-4 text-[#6b7280]">
                <span>
                  Rows: <span className={lr.countMatch ? "text-[#374151]" : "text-[#dc2626] font-semibold"}>
                    {lr.computedCount}
                  </span>
                  {!lr.countMatch && ` (source: ${lr.sourceCount})`}
                </span>
                <span>
                  Amount: <span className={lr.amountMatch ? "text-[#374151]" : "text-[#dc2626] font-semibold"}>
                    {lr.computedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                  {!lr.amountMatch && ` (source: ${lr.sourceAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })})`}
                </span>
              </div>
            </div>
          ))}

          {result.crossCheck.locationResults.length === 0 && (
            <p className="text-[11px] text-[#9ca3af] italic px-1">
              No location summary found in source file footer.
            </p>
          )}
        </div>
      )}

      {/* Sheets breakdown — shown when file has multiple tabs */}
      {hasSheets && (
        <div>
          <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
            Sheets Detected
          </p>
          <div className="flex flex-wrap gap-2">
            {result.sheets.map((sheet) => (
              <SheetPill key={sheet.name} sheet={sheet} />
            ))}
          </div>
          {skippedSheets.length > 0 && (
            <p className="text-[10px] text-[#9ca3af] mt-1.5">
              {skippedSheets.length} sheet{skippedSheets.length > 1 ? "s" : ""} skipped (no data found)
            </p>
          )}
        </div>
      )}

      {/* Missing column alert */}
      {result.missingRequiredColumns.length > 0 && (
        <div className="flex items-start gap-2 bg-[#fef2f2] border border-[#fecaca] rounded-lg px-3 py-2">
          <AlertCircle size={13} className="text-[#dc2626] shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[11px] text-[#b91c1c]">
            Missing: {result.missingRequiredColumns.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Verified / failed panel ──────────────────────────────────────────────────

function SummaryPanel({ validation }: { validation: ValidationState }) {
  const allOk = validation.allValid;
  return (
    <div className={cn(
      "rounded-xl p-5 flex flex-col text-white",
      allOk ? "bg-[#00488d]" : "bg-[#b91c1c]"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center mb-4 shrink-0",
        allOk ? "bg-white/10" : "bg-white/10"
      )}>
        {allOk
          ? <ShieldCheck size={20} className="text-white" strokeWidth={1.5} />
          : <AlertCircle size={20} className="text-white" strokeWidth={1.5} />}
      </div>

      <h3 className="text-[15px] font-bold leading-snug mb-2">
        {allOk ? "Structure Verified" : "Validation Failed"}
      </h3>
      <p className="text-[12px] opacity-80 leading-relaxed flex-1">
        {allOk
          ? `All ${validation.praResults.length + validation.sppResults.length} files passed the structural integrity check. Required columns are present.`
          : "One or more files have missing required columns. Please fix and re-upload before proceeding."}
      </p>

      {allOk && validation.unmatchedChapaCount > 0 && (
        <div className="mt-3 bg-white/10 border border-white/20 rounded-lg px-3 py-2">
          <p className="text-[11px] text-yellow-200">
            ⚠ {validation.unmatchedChapaCount} CHAPA No.{validation.unmatchedChapaCount > 1 ? "s" : ""} not found in reference — Birthdate &amp; Hired Date will be blank for those records.
          </p>
        </div>
      )}

      <div className="border-t border-white/10 my-4" />

      <div className="space-y-1.5 text-[12px] opacity-80">
        <div className="flex justify-between">
          <span>PRA rows</span>
          <span className="font-semibold text-white">{validation.totalPraRows.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>SPP rows</span>
          <span className="font-semibold text-white">{validation.totalSppRows.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Total records</span>
          <span className="font-semibold text-white">{(validation.totalPraRows + validation.totalSppRows).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  const {
    praFiles, sppFiles,
    referenceFile,
    validation, setValidation,
  } = useConsolidation();

  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"pra" | "spp">("pra");

  // Auto-switch to whichever tab actually has files once results arrive
  useEffect(() => {
    if (!validation) return;
    if (validation.praResults.length === 0 && validation.sppResults.length > 0) {
      setActiveTab("spp");
    }
  }, [validation]);

  useEffect(() => {
    // Always re-scan — validation is cleared by context whenever files change
    if (praFiles.length === 0 && sppFiles.length === 0) return;

    async function runValidation() {
      setScanning(true);
      setValidation(null);
      try {
        const [praResults, sppResults] = await Promise.all([
          Promise.all(praFiles.map((f) => validateTransactionFile(f, "pra"))),
          Promise.all(sppFiles.map((f) => validateTransactionFile(f, "spp"))),
        ]);

        let refResult: ReferenceValidationResult | null = null;
        if (referenceFile) {
          refResult = await validateReferenceFile(referenceFile);
        }

        const totalPraRows = praResults.reduce((s, r) => s + r.totalRows, 0);
        const totalSppRows = sppResults.reduce((s, r) => s + r.totalRows, 0);

        const allValid =
          praResults.every((r) => r.isValid) &&
          sppResults.every((r) => r.isValid) &&
          (refResult === null || refResult.isValid);

        setValidation({
          praResults,
          sppResults,
          referenceResult: refResult,
          unmatchedChapaCount: 0,
          totalPraRows,
          totalSppRows,
          allValid,
        });
      } finally {
        setScanning(false);
      }
    }

    runValidation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praFiles, sppFiles, referenceFile]);

  const allResults: FileValidationResult[] = [
    ...(validation?.praResults ?? []),
    ...(validation?.sppResults ?? []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="bg-white border-b border-[#e5e7eb] py-5 px-8">
        <div className="max-w-7xl mx-auto">
          <StepIndicator steps={INDICATOR_STEPS} currentStep={2} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <h1 className="text-[26px] font-semibold text-[#111827] tracking-tight">
            Step 2: Data Integrity Check
          </h1>
          <p className="text-[14px] text-[#6b7280] mt-1">
            We&apos;ve scanned your uploaded files for consistency and structure.
          </p>

          {/* Scanning state */}
          {scanning && (
            <div className="mt-8 flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="text-[#00488d] animate-spin" strokeWidth={1.5} />
              <p className="text-[14px] text-[#6b7280]">Scanning files…</p>
            </div>
          )}

          {/* No files */}
          {!scanning && praFiles.length === 0 && sppFiles.length === 0 && (
            <div className="mt-8 py-16 text-center">
              <p className="text-[14px] text-[#9ca3af]">
                No files uploaded.{" "}
                <Link href="/consolidation/upload" className="text-[#00488d] underline">
                  Go back to upload.
                </Link>
              </p>
            </div>
          )}

          {/* Results */}
          {!scanning && validation && (
            <>
              {/* Summary strip */}
              <div className="flex items-center gap-6 mt-5 px-4 py-3 bg-white border border-[#e5e7eb] rounded-xl">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", validation.allValid ? "bg-[#16a34a]" : "bg-[#dc2626]")} />
                  <span className="text-[12px] font-medium text-[#374151]">
                    {allResults.length} files scanned
                  </span>
                </div>
                <div className="w-px h-4 bg-[#e5e7eb]" />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                  <span className="text-[12px] font-medium text-[#374151]">
                    {(validation.totalPraRows + validation.totalSppRows).toLocaleString()} total rows
                  </span>
                </div>
                <div className="w-px h-4 bg-[#e5e7eb]" />
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", validation.allValid ? "bg-[#16a34a]" : "bg-[#dc2626]")} />
                  <span className="text-[12px] font-medium text-[#374151]">
                    {validation.allValid ? "No issues detected" : "Issues found — review required"}
                  </span>
                </div>
                {validation.referenceResult && (
                  <>
                    <div className="w-px h-4 bg-[#e5e7eb]" />
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", validation.referenceResult.isValid ? "bg-[#16a34a]" : "bg-[#f59e0b]")} />
                      <span className="text-[12px] font-medium text-[#374151]">
                        Reference file {validation.referenceResult.isValid ? "valid" : "has issues"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* File analysis — tabbed */}
              <div className="mt-6 flex gap-5 items-start">

                {/* Left: tab bar + file cards */}
                <div className="flex-1 min-w-0">
                  {/* Tab bar */}
                  <div className="flex border-b border-[#e5e7eb] mb-5">
                    {(["pra", "spp"] as const).map((tab) => {
                      const isPra      = tab === "pra";
                      const results    = isPra ? validation.praResults : validation.sppResults;
                      const uploadedCount = isPra ? praFiles.length : sppFiles.length;
                      const hasIssue   = results.some((r) => !r.isValid);
                      const isEmpty    = results.length === 0;
                      const isActive   = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors cursor-pointer",
                            isActive
                              ? isPra
                                ? "border-[#1d4ed8] text-[#1d4ed8]"
                                : "border-[#15803d] text-[#15803d]"
                              : "border-transparent text-[#6b7280] hover:text-[#374151] hover:border-[#d1d5db]"
                          )}
                        >
                          <span>{isPra ? "PRA Contribution Register" : "SPP Contribution Register"}</span>
                          <span className={cn(
                            "text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center",
                            isEmpty
                              ? "bg-[#f3f4f6] text-[#9ca3af]"
                              : hasIssue
                              ? "bg-[#fee2e2] text-[#b91c1c]"
                              : isActive
                              ? isPra
                                ? "bg-[#eff6ff] text-[#1d4ed8]"
                                : "bg-[#f0fdf4] text-[#15803d]"
                              : "bg-[#f3f4f6] text-[#6b7280]"
                          )}>
                            {uploadedCount}
                          </span>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isEmpty     ? "bg-[#d1d5db]"
                            : hasIssue  ? "bg-[#dc2626]"
                            :             "bg-[#16a34a]"
                          )} />
                        </button>
                      );
                    })}
                  </div>

                  {/* File cards for active tab */}
                  {(() => {
                    const activeResults = activeTab === "pra"
                      ? validation.praResults
                      : validation.sppResults;
                    const badge      = activeTab === "pra" ? "PRA" : "SPP";
                    const badgeColor = activeTab === "pra"
                      ? "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]"
                      : "bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]";

                    if (activeResults.length === 0) {
                      const uploadedCount = activeTab === "pra" ? praFiles.length : sppFiles.length;
                      return (
                        <div className="py-12 text-center bg-white border border-[#e5e7eb] rounded-xl">
                          {uploadedCount === 0 ? (
                            <>
                              <p className="text-[14px] font-medium text-[#374151]">
                                No {activeTab.toUpperCase()} files in this zone
                              </p>
                              <p className="text-[12px] text-[#9ca3af] mt-1">
                                Did you upload your {activeTab.toUpperCase()} file in the{" "}
                                <span className="font-medium text-[#374151]">
                                  {activeTab === "pra" ? "SPP" : "PRA"}
                                </span>{" "}
                                zone by mistake?
                              </p>
                              <Link
                                href="/consolidation/upload"
                                className="mt-3 inline-block text-[12px] font-medium text-[#00488d] underline"
                              >
                                Go back to re-upload
                              </Link>
                            </>
                          ) : (
                            <p className="text-[13px] text-[#9ca3af]">Scanning…</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className={cn(
                        "grid gap-4",
                        activeResults.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2"
                      )}>
                        {activeResults.map((r) => (
                          <FileCard
                            key={r.fileId}
                            result={r}
                            typeBadge={badge}
                            typeBadgeColor={badgeColor}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Right: summary panel */}
                <div className="w-[260px] shrink-0">
                  <SummaryPanel validation={validation} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#e5e7eb] py-4 px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/consolidation/upload">
            <Button variant="outline" className="flex items-center gap-2 text-[13px] font-medium h-9 px-4 border-[#d1d5db] text-[#374151]">
              <ArrowLeft size={14} strokeWidth={2} />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-5">
            {validation?.allValid && (
              <div className="text-right">
                <p className="text-[12px] text-[#374151] font-medium">
                  Validation complete. All systems nominal.
                </p>
                <p className="text-[11px] text-[#9ca3af] mt-0.5">
                  Estimated Processing Time &middot; ~2 min 45 sec
                </p>
              </div>
            )}
            <Link href="/consolidation/process" prefetch={false}>
              <Button
                disabled={!validation?.allValid}
                className="flex items-center gap-2 text-[13px] font-semibold h-9 px-5 bg-[#00488d] hover:bg-[#003a72] text-white rounded-lg disabled:bg-[#e5e7eb] disabled:text-[#9ca3af]"
              >
                Process Files
                <ArrowRight size={14} strokeWidth={2} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
