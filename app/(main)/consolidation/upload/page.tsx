"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  FileText, Trash2, CirclePlus, Database,
  Info, ArrowRight, X, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { useConsolidation } from "@/lib/consolidation/context";
import type { UploadedFile } from "@/lib/consolidation/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Validate" },
  { number: 3, label: "Process" },
  { number: 4, label: "Download" },
];

function generateId() { return Math.random().toString(36).slice(2, 9); }

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─── File chip ────────────────────────────────────────────────────────────────

function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 w-[240px]">
      <FileText size={18} className="text-[#3b82f6] shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#111827] truncate" title={file.name}>{file.name}</p>
        <p className="text-[11px] text-[#6b7280] mt-0.5">{formatFileSize(file.size)} &bull; Uploaded</p>
      </div>
      <button
        onClick={() => onRemove(file.id)}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── Multi-file section ───────────────────────────────────────────────────────

function MultiFileSection({
  label, description, badge, badgeColor,
  files, inputRef, onAdd, onRemove,
}: {
  label: string; description: string; badge: string; badgeColor: string;
  files: UploadedFile[]; inputRef: React.RefObject<HTMLInputElement | null>;
  onAdd: (f: UploadedFile[]) => void; onRemove: (id: string) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((f) => ({
      id: generateId(), name: f.name, size: f.size, file: f,
    }));
    onAdd(picked);
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[15px] font-semibold text-[#111827]">{label}</h2>
        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", badgeColor)}>
          {badge}
        </span>
      </div>
      <p className="text-[13px] text-[#6b7280] mb-3">{description}</p>
      <div className="flex flex-wrap gap-3">
        {files.map((f) => <FileChip key={f.id} file={f} onRemove={onRemove} />)}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border-2 border-dashed border-[#d1d5db] rounded-xl px-5 py-3 w-[190px] text-[13px] font-medium text-[#6b7280] hover:border-[#00488d] hover:text-[#00488d] hover:bg-[#f0f7ff] transition-colors"
        >
          <CirclePlus size={16} strokeWidth={1.75} />
          Add File
        </button>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleChange} />
    </div>
  );
}

// ─── Reference dialog (shared for PRA + SPP) ─────────────────────────────────

function ReferenceDialog({
  open, onClose, file, inputRef, onSet, onRemove,
}: {
  open: boolean; onClose: () => void;
  file: UploadedFile | null; inputRef: React.RefObject<HTMLInputElement | null>;
  onSet: (f: UploadedFile) => void; onRemove: () => void;
}) {
  if (!open) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    onSet({ id: generateId(), name: f.name, size: f.size, file: f });
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl w-[420px] mx-4 overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#eff6ff] rounded-lg flex items-center justify-center shrink-0">
              <Database size={17} className="text-[#3b82f6]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827] leading-tight">
                Employee Reference File
              </h2>
              <p className="text-[12px] text-[#6b7280] mt-0.5">
                Shared for both PRA &amp; SPP enrichment
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors shrink-0">
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-[12px] text-[#6b7280] mb-3">
            Each employee is matched by <span className="font-medium text-[#374151]">CHAPA No.</span> and enriched with
            Birthdate and Hired Date. This single file is used for both PRA and SPP. Unmatched records are left blank.
          </p>
          <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Required columns</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {["CHAPA No.", "Birthday", "Date Hired *"].map((col) => (
              <span key={col} className="text-[11px] font-medium text-[#374151] bg-[#f3f4f6] border border-[#e5e7eb] rounded-full px-2.5 py-0.5">
                {col}
              </span>
            ))}
          </div>

          {file ? (
            <div className="flex items-center gap-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3">
              <FileText size={16} className="text-[#3b82f6] shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111827] truncate" title={file.name}>{file.name}</p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">{formatFileSize(file.size)} &bull; Uploaded</p>
              </div>
              <button onClick={onRemove} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors">
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#d1d5db] rounded-xl px-5 py-6 flex flex-col items-center gap-2 text-center">
              <Database size={22} className="text-[#d1d5db]" strokeWidth={1.5} />
              <p className="text-[12px] text-[#9ca3af]">No reference file selected</p>
              <button onClick={() => inputRef.current?.click()} className="mt-1 text-[13px] font-semibold text-[#00488d] hover:underline">
                Browse file
              </button>
              <p className="text-[11px] text-[#c4c8d4]">.xlsx accepted</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="text-[13px] h-9 px-4 border-[#d1d5db] text-[#374151]">Close</Button>
          {!file && (
            <Button onClick={() => inputRef.current?.click()} className="text-[13px] h-9 px-4 bg-[#00488d] hover:bg-[#003a72] text-white">
              Select File
            </Button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const {
    praFiles, setPraFiles,
    sppFiles, setSppFiles,
    referenceFile, setReferenceFile,
  } = useConsolidation();

  const praInputRef = useRef<HTMLInputElement>(null);
  const sppInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [refOpen, setRefOpen] = useState(false);

  const totalUploaded = praFiles.length + sppFiles.length + (referenceFile ? 1 : 0);
  const canContinue   = praFiles.length > 0 || sppFiles.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-[#e5e7eb] py-5 px-8">
        <div className="max-w-7xl mx-auto">
          <StepIndicator steps={STEPS} currentStep={1} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">

          {/* Heading row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-semibold text-[#111827] tracking-tight">Step 1: Upload Files</h1>
              <p className="text-[14px] text-[#6b7280] mt-1">
                Provide the necessary data sets for enterprise-wide consolidation.
              </p>
            </div>

            {/* Single shared reference button */}
            <button
              onClick={() => setRefOpen(true)}
              className={cn(
                "shrink-0 flex items-center gap-2 text-[13px] font-medium h-9 px-4 rounded-lg border transition-colors mt-1",
                referenceFile
                  ? "bg-[#f0fdf4] border-[#86efac] text-[#15803d] hover:bg-[#dcfce7]"
                  : "bg-white border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb] hover:border-[#9ca3af]"
              )}
            >
              {referenceFile
                ? <><CheckCircle2 size={14} strokeWidth={2} className="text-[#16a34a]" />Reference File Set</>
                : <><Database size={14} strokeWidth={1.75} className="text-[#6b7280]" />Set Reference File</>}
            </button>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 mt-5 px-4 py-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl">
            <Info size={15} className="text-[#3b82f6] mt-0.5 shrink-0" strokeWidth={2} />
            <p className="text-[13px] text-[#1d4ed8] leading-relaxed">
              Upload PRA and SPP files separately. One shared reference file provides Birthdate &amp; Hired Date for all records.
              The system auto-detects headers, ignores summary footers, and reads all Excel tabs.
            </p>
          </div>

          {/* Upload zones */}
          <div className="mt-8 space-y-8">
            <MultiFileSection
              label="PRA Contribution Register" badge="PRA"
              badgeColor="bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]"
              description="Upload one or more PRA files. Tabs like BUGO or PLNT are detected automatically."
              files={praFiles} inputRef={praInputRef}
              onAdd={(f) => setPraFiles([...praFiles, ...f])}
              onRemove={(id) => setPraFiles(praFiles.filter((f) => f.id !== id))}
            />

            <hr className="border-[#e5e7eb]" />

            <MultiFileSection
              label="SPP Contribution Register" badge="SPP"
              badgeColor="bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]"
              description="Upload one or more SPP files. Uses 'Perm. Emp. No.' and 'Surname' columns."
              files={sppFiles} inputRef={sppInputRef}
              onAdd={(f) => setSppFiles([...sppFiles, ...f])}
              onRemove={(id) => setSppFiles(sppFiles.filter((f) => f.id !== id))}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#e5e7eb] py-4 px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button variant="outline" disabled className="text-[13px] font-medium h-9 px-5 border-[#d1d5db] text-[#9ca3af] disabled:opacity-60">
            Back
          </Button>
          <div className="flex items-center gap-4">
            {totalUploaded > 0 && (
              <span className="text-[13px] text-[#6b7280]">
                {totalUploaded} {totalUploaded === 1 ? "file" : "files"} uploaded
              </span>
            )}
            {canContinue ? (
              <Link href="/consolidation/validate">
                <Button className="flex items-center gap-2 text-[13px] font-semibold h-9 px-6 rounded-lg bg-[#00488d] hover:bg-[#003a72] text-white">
                  Continue <ArrowRight size={14} strokeWidth={2} />
                </Button>
              </Link>
            ) : (
              <Button disabled className="flex items-center gap-2 text-[13px] font-semibold h-9 px-6 rounded-lg bg-[#e5e7eb] text-[#9ca3af]">
                Continue <ArrowRight size={14} strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ReferenceDialog
        open={refOpen} onClose={() => setRefOpen(false)}
        file={referenceFile} inputRef={refInputRef}
        onSet={setReferenceFile} onRemove={() => setReferenceFile(null)}
      />
    </div>
  );
}
