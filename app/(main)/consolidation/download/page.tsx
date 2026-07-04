"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { useConsolidation } from "@/lib/consolidation/context";
import { triggerDownload } from "@/lib/consolidation/generate";
import { cn } from "@/lib/utils";

const INDICATOR_STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Validate" },
  { number: 3, label: "Process" },
  { number: 4, label: "Download" },
];

const PRA_COLUMNS = [
  "CHAPA No.", "Last Name", "First Name", "Middle Initial",
  "Employee Status", "Location", "Birthdate", "Hired Date",
  "Regularization Date", "Regular Contribution",
];

const SPP_COLUMNS = [
  "CHAPA No.", "Last Name", "First Name", "Middle Initial",
  "Employee Status", "Location", "Birthdate", "Hired Date",
  "SPP EE Contribution", "SPP ER Contribution",
];

const ENRICHED_COLS = new Set(["Birthdate", "Hired Date"]);

type DlState = "idle" | "loading" | "done";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function DownloadPage() {
  const { processingResult, outputBlob, praFiles, sppFiles, reset } = useConsolidation();
  const [dlState, setDlState] = useState<DlState>("idle");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());

  const outputFileName = `PRA_SPP_Contribution_Register_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`;

  function handleDownload() {
    if (!outputBlob || dlState !== "idle") return;
    setDlState("loading");
    setTimeout(() => {
      triggerDownload(outputBlob, outputFileName);
      setDlState("done");
    }, 800);
  }

  if (!processingResult || !outputBlob) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-[#e5e7eb] py-5 px-8">
          <div className="max-w-7xl mx-auto">
            <StepIndicator steps={INDICATOR_STEPS} currentStep={4} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={36} className="text-[#9ca3af] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[15px] text-[#374151] font-medium">No output available.</p>
            <p className="text-[13px] text-[#9ca3af] mt-1">
              Please complete the processing step first.
            </p>
            <Link href="/consolidation/process" className="mt-4 inline-block text-[13px] text-[#00488d] underline">
              Go to Process
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalRecords = processingResult.praRecords.length + processingResult.sppRecords.length;
  const estimatedSize = formatFileSize(outputBlob.size);
  const unmatchedCount = processingResult.unmatchedChapaIds.length;

  const summaryStats = [
    { label: "PRA Records", value: processingResult.praRecords.length.toLocaleString(), sub: "from PRA files" },
    { label: "SPP Records", value: processingResult.sppRecords.length.toLocaleString(), sub: "from SPP files" },
    { label: "Reference Matched", value: unmatchedCount === 0 ? "100%" : `${Math.round(((totalRecords - unmatchedCount) / totalRecords) * 100)}%`, sub: unmatchedCount > 0 ? `${unmatchedCount} unmatched` : "all records enriched" },
    { label: "Output Columns", value: "10", sub: "standardized fields" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="bg-white border-b border-[#e5e7eb] py-5 px-8">
        <div className="max-w-7xl mx-auto">
          <StepIndicator steps={INDICATOR_STEPS} currentStep={4} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

          {/* ── Success hero ──────────────────────────────────── */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl px-8 py-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0">
              <CheckCircle2 size={28} className="text-[#16a34a]" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">
                Consolidation Complete!
              </h1>
              <p className="text-[14px] text-[#6b7280] mt-0.5">
                Your standardized output file is ready. Generated {processingResult.generatedAt}.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/consolidation/upload">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex items-center gap-2 text-[13px] h-9 px-4 border-[#d1d5db] text-[#374151]"
                >
                  <RotateCcw size={13} strokeWidth={2} />
                  New Consolidation
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Two-column layout ─────────────────────────────── */}
          <div className="grid grid-cols-5 gap-6">

            {/* Left: file card + columns */}
            <div className="col-span-3 space-y-5">

              {/* 0-records warning */}
              {totalRecords === 0 && (
                <div className="flex items-start gap-3 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="text-[#d97706] shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-[13px] text-[#92400e]">
                    No records were found in the output. Please go back to{" "}
                    <Link href="/consolidation/upload" className="underline font-semibold text-[#b45309] hover:text-[#92400e]">
                      re-upload and re-process your files
                    </Link>
                    .
                  </p>
                </div>
              )}

              {/* File download card */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#eef4ff] flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={24} className="text-[#00488d]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-[#111827] truncate" title={processingResult.outputFileName}>
                        {processingResult.outputFileName}
                      </p>
                      <span className="shrink-0 text-[10px] font-bold bg-[#dcfce7] text-[#15803d] rounded-full px-2 py-0.5 uppercase tracking-wide">
                        Ready
                      </span>
                    </div>
                    <p className="text-[12px] text-[#9ca3af] mt-0.5">
                      {estimatedSize} &middot; Excel &middot; 2 sheets (PRA + SPP) &middot; {totalRecords.toLocaleString()} rows
                    </p>

                    {/* Month / year picker */}
                    <div className="mt-4 p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl">
                      <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2.5">
                        Output Period
                      </p>
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedMonth}
                          onChange={(e) => { setSelectedMonth(Number(e.target.value)); setDlState("idle"); }}
                          className="h-8 px-2 text-[12px] font-medium border border-[#e5e7eb] rounded-lg bg-white text-[#111827] focus:outline-none focus:border-[#00488d] cursor-pointer"
                        >
                          {MONTHS.map((m, i) => (
                            <option key={m} value={i}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={selectedYear}
                          onChange={(e) => { setSelectedYear(Number(e.target.value)); setDlState("idle"); }}
                          className="h-8 px-2 text-[12px] font-medium border border-[#e5e7eb] rounded-lg bg-white text-[#111827] focus:outline-none focus:border-[#00488d] cursor-pointer"
                        >
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <span className="text-[11px] text-[#9ca3af] truncate">→ {outputFileName}</span>
                      </div>
                    </div>

                    {unmatchedCount > 0 && (
                      <div className="mt-3 flex items-start gap-2 bg-[#fffbeb] border border-[#fde68a] rounded-lg px-3 py-2">
                        <AlertCircle size={13} className="text-[#d97706] shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-[11px] text-[#92400e]">
                          {unmatchedCount} CHAPA No.{unmatchedCount > 1 ? "s" : ""} had no reference match — Birthdate &amp; Hired Date left blank for those records.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleDownload}
                      disabled={dlState === "loading"}
                      className={cn(
                        "mt-4 inline-flex items-center gap-2 text-[13px] font-semibold h-9 px-5 rounded-lg transition-all",
                        dlState === "done"
                          ? "bg-[#dcfce7] text-[#15803d] cursor-default"
                          : dlState === "loading"
                          ? "bg-[#00488d]/80 text-white cursor-not-allowed"
                          : "bg-[#00488d] hover:bg-[#003a72] text-white"
                      )}
                    >
                      {dlState === "loading" ? (
                        <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Preparing…</>
                      ) : dlState === "done" ? (
                        <><CheckCircle2 size={14} strokeWidth={2} />Downloaded</>
                      ) : (
                        <><Download size={14} strokeWidth={2} />Download File</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Output columns */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 space-y-5">
                {[
                  { label: "PRA Sheet", badge: "PRA", badgeColor: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]", cols: PRA_COLUMNS },
                  { label: "SPP Sheet", badge: "SPP", badgeColor: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]", cols: SPP_COLUMNS },
                ].map(({ label, badge, badgeColor, cols }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">{label}</p>
                      <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border", badgeColor)}>{badge}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cols.map((col) => (
                        <span key={col} className={cn(
                          "inline-flex items-center text-[11px] font-medium rounded-full px-2.5 py-0.5 border",
                          ENRICHED_COLS.has(col)
                            ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                            : "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]"
                        )}>
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-[12px] text-[#9ca3af] pt-1 leading-relaxed">
                  <span className="text-[#1d4ed8] font-medium">Birthdate</span> and{" "}
                  <span className="text-[#1d4ed8] font-medium">Hired Date</span> are
                  enriched from the reference file via CHAPA No. for both sheets.
                </p>
              </div>
            </div>

            {/* Right: summary + audit */}
            <div className="col-span-2 space-y-5">

              {/* Summary stats */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-4">
                  Consolidation Summary
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {summaryStats.map((s) => (
                    <div key={s.label} className="bg-[#f9fafb] border border-[#f0f0f0] rounded-xl px-3 py-3">
                      <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">
                        {s.label}
                      </p>
                      <p className="text-[22px] font-bold text-[#111827] leading-none tabular-nums">
                        {s.value}
                      </p>
                      <p className="text-[10px] text-[#9ca3af] mt-1">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit trail */}
              <div className="bg-[#00488d] rounded-2xl p-6 text-white">
                <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider mb-3">
                  Audit Trail
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "PRA files", value: `${praFiles.length} file${praFiles.length !== 1 ? "s" : ""}` },
                    { label: "SPP files", value: `${sppFiles.length} file${sppFiles.length !== 1 ? "s" : ""}` },
                    { label: "Reference file", value: processingResult.praMetadata.company || "Provided" },
                    { label: "Period", value: processingResult.praMetadata.period || "—" },
                    { label: "Generated", value: processingResult.generatedAt },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-3">
                      <span className="text-[12px] text-blue-200 shrink-0">{item.label}</span>
                      <span className="text-[12px] font-medium text-white text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#e5e7eb] py-4 px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/consolidation/process">
            <Button variant="outline" className="flex items-center gap-2 text-[13px] font-medium h-9 px-4 border-[#d1d5db] text-[#374151]">
              <ArrowLeft size={14} strokeWidth={2} />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/consolidation/upload">
              <Button variant="outline" onClick={reset} className="flex items-center gap-2 text-[13px] font-medium h-9 px-4 border-[#d1d5db] text-[#374151]">
                <RotateCcw size={13} strokeWidth={2} />
                Start New
              </Button>
            </Link>
            <button
              onClick={handleDownload}
              disabled={dlState === "loading" || dlState === "done"}
              className={cn(
                "inline-flex items-center gap-2 text-[13px] font-semibold h-9 px-5 rounded-lg transition-all",
                dlState === "done"
                  ? "bg-[#dcfce7] text-[#15803d] cursor-default"
                  : dlState === "loading"
                  ? "bg-[#00488d]/80 text-white cursor-not-allowed"
                  : "bg-[#00488d] hover:bg-[#003a72] text-white"
              )}
            >
              {dlState === "loading" ? (
                <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Preparing…</>
              ) : dlState === "done" ? (
                <><CheckCircle2 size={14} strokeWidth={2} />Downloaded</>
              ) : (
                <><Download size={14} strokeWidth={2} />Download File</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
