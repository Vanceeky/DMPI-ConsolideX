"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Table2,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { useConsolidation } from "@/lib/consolidation/context";
import { parsePRAFile, parseSPPFile, parseReferenceFile } from "@/lib/consolidation/parser";
import { generateOutputWorkbook } from "@/lib/consolidation/generate";
import type { PRAOutputRecord, SPPOutputRecord, FileMetadata } from "@/lib/consolidation/types";
import { cn } from "@/lib/utils";

const INDICATOR_STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Validate" },
  { number: 3, label: "Process" },
  { number: 4, label: "Download" },
];

const PROCESS_STEPS = [
  { label: "Reading Excel Files…",            completesAt: 18 },
  { label: "Merging Records…",                completesAt: 38 },
  { label: "Matching Employee Reference…",    completesAt: 63 },
  { label: "Generating Standardized Output…", completesAt: 88 },
  { label: "Preparing Download…",             completesAt: 100 },
];

type StepStatus = "complete" | "working" | "pending";

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularProgress({ progress }: { progress: number }) {
  const SIZE = 168, R = 58, CX = SIZE / 2, CY = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const offset = circumference - (progress / 100) * circumference;
  const isDone = progress >= 100;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e5e7eb" strokeWidth={11} />
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke={isDone ? "#16a34a" : "#00488d"} strokeWidth={11} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.35s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-bold text-[#111827] leading-none tabular-nums">{progress}%</span>
        <span className={cn("text-[10px] font-semibold tracking-widest uppercase mt-1.5 transition-colors",
          isDone ? "text-[#16a34a]" : "text-[#3b82f6]")}>
          {isDone ? "Complete" : "Processing"}
        </span>
      </div>
    </div>
  );
}

// ─── Process step row ─────────────────────────────────────────────────────────

function ProcessStep({ label, status, withinPct }: { label: string; status: StepStatus; withinPct: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === "complete" ? <CheckCircle2 size={17} className="text-[#16a34a] shrink-0" strokeWidth={2} />
          : status === "working"  ? <Loader2 size={17} className="text-[#3b82f6] shrink-0 animate-spin" strokeWidth={2} />
          :                         <Circle size={17} className="text-[#d1d5db] shrink-0" strokeWidth={2} />}
          <span className={cn("text-[13px] font-medium",
            status === "complete" ? "text-[#374151]" : status === "working" ? "text-[#3b82f6]" : "text-[#9ca3af]")}>
            {label}
          </span>
        </div>
        <span className={cn("text-[12px] font-semibold",
          status === "complete" ? "text-[#374151]" : status === "working" ? "text-[#3b82f6]" : "text-[#9ca3af]")}>
          {status === "complete" ? "100%" : status === "working" ? "Working" : "Pending"}
        </span>
      </div>
      {status === "working" && (
        <div className="ml-8 h-0.5 bg-[#e5e7eb] rounded-full overflow-hidden">
          <div className="h-full bg-[#3b82f6] rounded-full transition-all duration-300" style={{ width: `${withinPct}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Pre-flight queue card ────────────────────────────────────────────────────

function QueueCard({ label, badge, badgeColor, files, sheetCount }: {
  label: string; badge: string; badgeColor: string;
  files: { name: string }[]; sheetCount?: number;
}) {
  return (
    <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 flex-1">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", badgeColor)}>
          {badge}
        </span>
        <span className="text-[12px] font-medium text-[#374151]">{label}</span>
      </div>
      {files.length === 0 ? (
        <p className="text-[11px] text-[#9ca3af] italic">No files uploaded</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <FileText size={12} className="text-[#9ca3af] shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] text-[#374151] truncate">{f.name}</span>
            </div>
          ))}
          {sheetCount !== undefined && sheetCount > files.length && (
            <p className="text-[10px] text-[#9ca3af] mt-1">{sheetCount} sheets total across all files</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProcessPage() {
  const {
    praFiles, sppFiles,
    praReferenceFile, sppReferenceFile,
    setProcessingResult, setOutputBlob,
  } = useConsolidation();

  const [progress, setProgress]       = useState(0);
  const [isDone, setIsDone]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [warnings, setWarnings]       = useState<string[]>([]);
  const [started, setStarted]         = useState(false);

  useEffect(() => {
    if (started) return;
    if (praFiles.length === 0 && sppFiles.length === 0) return;
    setStarted(true);

    async function run() {
      try {
        let currentProgress = 0;
        const advance = async (to: number, ms = 600) =>
          new Promise<void>((resolve) => {
            const startVal = currentProgress, startTime = Date.now();
            const tick = () => {
              const t = Math.min((Date.now() - startTime) / ms, 1);
              setProgress(Math.round(startVal + (to - startVal) * t));
              if (t < 1) requestAnimationFrame(tick);
              else { currentProgress = to; resolve(); }
            };
            requestAnimationFrame(tick);
          });

        // ── Step 1: Parse each file independently ─────────────────────────
        await advance(5, 200);
        const parseWarnings: string[] = [];

        // PRA — one file at a time so one bad file doesn't block the rest
        const praParseResults: Awaited<ReturnType<typeof parsePRAFile>>[] = [];
        for (const f of praFiles) {
          try {
            praParseResults.push(await parsePRAFile(f.file));
          } catch (e) {
            parseWarnings.push(`PRA "${f.name}": ${e instanceof Error ? e.message : "parse error"}`);
          }
        }

        // SPP — same pattern
        const sppParseResults: Awaited<ReturnType<typeof parseSPPFile>>[] = [];
        for (const f of sppFiles) {
          try {
            sppParseResults.push(await parseSPPFile(f.file));
          } catch (e) {
            parseWarnings.push(`SPP "${f.name}": ${e instanceof Error ? e.message : "parse error"}`);
          }
        }

        if (parseWarnings.length > 0) setWarnings(parseWarnings);
        await advance(20, 400);

        // ── Step 2: Merge records ─────────────────────────────────────────
        const praRecordsRaw = praParseResults.flatMap((r) => r.records);
        const sppRecordsRaw = sppParseResults.flatMap((r) => r.records);

        const praMetadata: FileMetadata = praParseResults[0]?.metadata ?? {
          title: "PRA Contribution Register", company: "", period: "",
        };
        const sppMetadata: FileMetadata = sppParseResults[0]?.metadata ?? {
          title: "SPP Contribution Register", company: "", period: "",
        };
        await advance(42, 500);

        // ── Step 3: Reference lookups (separate per type) ─────────────────
        const buildRefMap = async (refFile: typeof praReferenceFile) => {
          const map = new Map<string, { birthdate: string; hiredDate: string }>();
          if (!refFile) return map;
          try {
            const { records } = await parseReferenceFile(refFile.file);
            for (const r of records) {
              map.set(String(r.chapaNo).trim(), { birthdate: r.birthdate, hiredDate: r.hiredDate });
            }
          } catch (e) {
            parseWarnings.push(`Reference "${refFile.name}": ${e instanceof Error ? e.message : "parse error"}`);
            setWarnings([...parseWarnings]);
          }
          return map;
        };

        const [praRefMap, sppRefMap] = await Promise.all([
          buildRefMap(praReferenceFile),
          buildRefMap(sppReferenceFile),
        ]);
        await advance(63, 600);

        const unmatchedSet = new Set<string>();

        const lookupPRA = (chapaNo: string) => {
          const ref = praRefMap.get(String(chapaNo).trim());
          if (!ref && praReferenceFile) unmatchedSet.add(chapaNo);
          return { birthdate: ref?.birthdate ?? "", hiredDate: ref?.hiredDate ?? "" };
        };
        const lookupSPP = (chapaNo: string) => {
          const ref = sppRefMap.get(String(chapaNo).trim());
          if (!ref && sppReferenceFile) unmatchedSet.add(chapaNo);
          return { birthdate: ref?.birthdate ?? "", hiredDate: ref?.hiredDate ?? "" };
        };

        // ── Step 4: Enrich ────────────────────────────────────────────────
        const praEnriched: PRAOutputRecord[] = praRecordsRaw.map((r) => ({ ...r, ...lookupPRA(r.chapaNo) }));
        const sppEnriched: SPPOutputRecord[] = sppRecordsRaw.map((r) => ({ ...r, ...lookupSPP(r.chapaNo) }));
        await advance(88, 500);

        // ── Step 5: Generate output ───────────────────────────────────────
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "_");
        const outputFileName = `Consolidated_Output_${dateStr}.xlsx`;

        const result = {
          praRecords: praEnriched,
          sppRecords: sppEnriched,
          praMetadata,
          sppMetadata,
          unmatchedChapaIds: Array.from(unmatchedSet),
          generatedAt: now.toLocaleString("en-PH", {
            month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
          }),
          outputFileName,
        };

        const blob = generateOutputWorkbook(result);
        setProcessingResult(result);
        setOutputBlob(blob);
        await advance(100, 400);
        setIsDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    }

    run();
  }, [started, praFiles.length, sppFiles.length]);

  const getStatus = (i: number): StepStatus => {
    const threshold = PROCESS_STEPS[i].completesAt;
    const prev = i > 0 ? PROCESS_STEPS[i - 1].completesAt : 0;
    if (progress >= threshold) return "complete";
    if (progress >= prev) return "working";
    return "pending";
  };

  const getWithinPct = (i: number): number => {
    const step = PROCESS_STEPS[i];
    const prev = i > 0 ? PROCESS_STEPS[i - 1].completesAt : 0;
    return Math.min(100, ((progress - prev) / (step.completesAt - prev)) * 100);
  };

  const estimatedSec = isDone ? 0 : Math.max(1, Math.round((100 - progress) * 0.14));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-[#e5e7eb] py-5 px-8">
        <div className="max-w-7xl mx-auto">
          <StepIndicator steps={INDICATOR_STEPS} currentStep={3} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl px-10 py-10">

            {praFiles.length === 0 && sppFiles.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[16px] font-semibold text-[#dc2626] mb-2">No Files to Process</p>
                <p className="text-[13px] text-[#6b7280] mb-4">
                  No PRA or SPP files were found. Please go back and upload your files before processing.
                </p>
                <Link href="/consolidation/upload" className="text-[13px] text-[#00488d] underline">
                  Go back and upload files
                </Link>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-[16px] font-semibold text-[#dc2626] mb-2">Processing Failed</p>
                <p className="text-[13px] text-[#6b7280] mb-4">{error}</p>
                <Link href="/consolidation/upload" className="text-[13px] text-[#00488d] underline">
                  Go back and re-upload
                </Link>
              </div>
            ) : (
              <>
                {/* Heading */}
                <div className="text-center mb-6">
                  <h1 className="text-[28px] font-bold text-[#111827] tracking-tight">
                    {isDone ? "Processing Complete!" : "Crunching the numbers"}
                  </h1>
                  <p className="text-[14px] text-[#6b7280] mt-2 max-w-md mx-auto">
                    {isDone
                      ? "Your consolidated output is ready. Proceed to download."
                      : "Reading, merging, and enriching your employee records."}
                  </p>
                </div>

                {/* Pre-flight queue — visible before processing completes */}
                {!isDone && (
                  <div className="flex gap-3 mb-8">
                    <QueueCard
                      label={`${praFiles.length} file${praFiles.length !== 1 ? "s" : ""} queued`}
                      badge="PRA"
                      badgeColor="bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                      files={praFiles}
                    />
                    <QueueCard
                      label={`${sppFiles.length} file${sppFiles.length !== 1 ? "s" : ""} queued`}
                      badge="SPP"
                      badgeColor="bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
                      files={sppFiles}
                    />
                    {(praReferenceFile || sppReferenceFile) && (
                      <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]">
                            REF
                          </span>
                          <span className="text-[12px] font-medium text-[#374151]">Reference files</span>
                        </div>
                        <div className="space-y-1.5">
                          {praReferenceFile && (
                            <div className="flex items-center gap-2">
                              <FileText size={12} className="text-[#9ca3af] shrink-0" strokeWidth={1.5} />
                              <span className="text-[11px] text-[#374151] truncate">PRA: {praReferenceFile.name}</span>
                            </div>
                          )}
                          {sppReferenceFile && (
                            <div className="flex items-center gap-2">
                              <FileText size={12} className="text-[#9ca3af] shrink-0" strokeWidth={1.5} />
                              <span className="text-[11px] text-[#374151] truncate">SPP: {sppReferenceFile.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Warnings (parse errors that didn't halt processing) */}
                {warnings.length > 0 && (
                  <div className="mb-6 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle size={14} className="text-[#d97706] shrink-0" strokeWidth={2} />
                      <p className="text-[12px] font-semibold text-[#92400e]">
                        {warnings.length} file{warnings.length > 1 ? "s" : ""} had parse issues — processing continued without them
                      </p>
                    </div>
                    <ul className="space-y-0.5 ml-5">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-[11px] text-[#92400e] list-disc">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Circular ring */}
                <div className="flex justify-center mb-10">
                  <CircularProgress progress={progress} />
                </div>

                {/* Steps list */}
                <div className="max-w-lg mx-auto space-y-4 mb-10">
                  {PROCESS_STEPS.map((step, i) => (
                    <ProcessStep key={step.label} label={step.label} status={getStatus(i)} withinPct={getWithinPct(i)} />
                  ))}
                </div>

                {/* Data flow */}
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-[160px] h-[80px] bg-[#f9fafb] border border-[#e5e7eb] rounded-xl flex flex-col items-center justify-center gap-1.5">
                      <Table2 size={20} className="text-[#9ca3af]" strokeWidth={1.5} />
                      <span className="text-[11px] font-medium text-[#9ca3af]">
                        {praFiles.length + sppFiles.length} Source File{praFiles.length + sppFiles.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#c4c8d4] font-medium uppercase tracking-wider">Input</span>
                  </div>

                  <div className={cn("transition-colors duration-500 mb-4", progress > 20 ? "text-[#00488d]" : "text-[#e5e7eb]")}>
                    <ArrowRight size={22} strokeWidth={2.5} />
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-[160px] h-[80px] rounded-xl flex flex-col items-center justify-center gap-1.5 border transition-all duration-500",
                      isDone ? "bg-[#00488d] border-[#00488d]"
                      : progress > 60 ? "bg-[#eef4ff] border-[#bfdbfe]"
                      : "bg-[#f9fafb] border-[#e5e7eb]"
                    )}>
                      <FileSpreadsheet size={20} className={cn("transition-colors duration-500",
                        isDone ? "text-white" : progress > 60 ? "text-[#3b82f6]" : "text-[#d1d5db]"
                      )} strokeWidth={1.5} />
                      <span className={cn("text-[11px] font-medium transition-colors duration-500",
                        isDone ? "text-white" : progress > 60 ? "text-[#3b82f6]" : "text-[#9ca3af]"
                      )}>
                        Consolidated Output
                      </span>
                    </div>
                    <span className="text-[10px] text-[#c4c8d4] font-medium uppercase tracking-wider">Output</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#e5e7eb] py-4 px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/consolidation/validate">
            <Button variant="outline" className="flex items-center gap-2 text-[13px] font-medium h-9 px-4 border-[#d1d5db] text-[#374151]">
              <ArrowLeft size={14} strokeWidth={2} />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-5">
            <p className="text-[13px] text-[#374151]">
              Estimated completion:{" "}
              <span className="font-bold">{isDone ? "Done" : `~${estimatedSec} seconds`}</span>
            </p>
            {isDone ? (
              <Link href="/consolidation/download">
                <Button className="flex items-center gap-2 text-[13px] font-semibold h-9 px-5 bg-[#00488d] hover:bg-[#003a72] text-white rounded-lg">
                  Continue <ArrowRight size={14} strokeWidth={2} />
                </Button>
              </Link>
            ) : (
              <Button disabled className="flex items-center gap-2 text-[13px] font-semibold h-9 px-5 rounded-lg bg-[#e5e7eb] text-[#9ca3af]">
                Continue <ArrowRight size={14} strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
