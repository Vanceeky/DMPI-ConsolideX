import Link from "next/link";
import {
  Upload,
  ShieldCheck,
  Zap,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Users,
} from "lucide-react";

const STEPS = [
  {
    number: 1,
    label: "Upload",
    icon: Upload,
    description: "Upload your PRA and SPP Excel files along with an optional employee reference file.",
    color: "#1d4ed8",
    bg: "#eff6ff",
  },
  {
    number: 2,
    label: "Validate",
    icon: ShieldCheck,
    description: "The system auto-scans each file for required columns, tab structure, and data integrity.",
    color: "#15803d",
    bg: "#f0fdf4",
  },
  {
    number: 3,
    label: "Process",
    icon: Zap,
    description: "Records from all locations are merged, enriched with Birthdate and Hired Date, then standardized.",
    color: "#b45309",
    bg: "#fffbeb",
  },
  {
    number: 4,
    label: "Download",
    icon: Download,
    description: "Download the consolidated Excel workbook with two sheets — PRA and SPP — ready for submission.",
    color: "#00488d",
    bg: "#e8f0fb",
  },
];

const INPUTS = [
  { icon: FileText,        label: "PRA Files",       desc: "PRA Contribution Register Excel files (BUGO / PLANTATION tabs)" },
  { icon: FileText,        label: "SPP Files",       desc: "SPP Contribution Register Excel files (BUGO, PLNT, MNS, HRLS tabs)" },
  { icon: FileSpreadsheet, label: "Reference File",  desc: "Optional — provides employee Birthdate and Hired Date by CHAPA No." },
];

const OUTPUTS = [
  { text: "Single consolidated Excel workbook (.xlsx)" },
  { text: "PRA Contribution Register sheet" },
  { text: "SPP Contribution Register sheet" },
  { text: "Employee details enriched from reference" },
  { text: "Summary tables by Location and Job Level" },
  { text: "Grand totals per contribution column" },
];

export default function HomePage() {
  return (
    <div className="overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-[#00488d] px-10 py-10 flex items-center justify-between gap-8 overflow-hidden relative">
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-4 bottom-[-30px] w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10 max-w-lg">
            <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-3">
              Del Monte Philippines, Inc.
            </span>
            <h1 className="text-[28px] font-bold text-white leading-snug">
              PRA & SPP Contribution<br />Consolidation System
            </h1>
            <p className="text-[14px] text-blue-100 mt-3 leading-relaxed">
              Automate the consolidation of payroll contribution files from multiple locations into a single standardized Excel workbook — in minutes, not hours.
            </p>
            <Link
              href="/consolidation/upload"
              className="mt-6 inline-flex items-center gap-2 bg-white text-[#00488d] text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Start New Consolidation
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

          {/* Right stat pills */}
          <div className="relative z-10 flex flex-col gap-3 shrink-0">
            {[
              { icon: FileText, label: "PRA Files",     value: "Contribution Register" },
              { icon: FileText, label: "SPP Files",     value: "Contribution Register" },
              { icon: MapPin,   label: "Locations",     value: "BUGO · PLANTATION" },
              { icon: Users,    label: "Employee Types", value: "Hourlies · Monthlies · Supervisor" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
                <Icon size={14} className="text-blue-200 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-[10px] text-blue-200 font-medium leading-none">{label}</p>
                  <p className="text-[12px] text-white font-semibold mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-[17px] font-semibold text-[#111827] mb-1">How It Works</h2>
          <p className="text-[13px] text-[#6b7280] mb-5">Four simple steps from raw Excel files to a ready-to-submit output.</p>

          <div className="grid grid-cols-4 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute top-[22px] left-[calc(50%+28px)] right-[-8px] h-px bg-[#e5e7eb] z-0" />
                  )}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 relative z-10 flex flex-col gap-3 h-full">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: step.bg }}
                      >
                        <Icon size={16} style={{ color: step.color }} strokeWidth={1.75} />
                      </div>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: step.color }}
                      >
                        Step {step.number}
                      </span>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#111827]">{step.label}</p>
                      <p className="text-[12px] text-[#6b7280] mt-1 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── What you need / What you get ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-5">

          {/* Inputs */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
            <h3 className="text-[14px] font-semibold text-[#111827] mb-1">What You Need</h3>
            <p className="text-[12px] text-[#6b7280] mb-4">Files to upload before starting consolidation.</p>
            <div className="space-y-3">
              {INPUTS.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f3f4f6] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-[#6b7280]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#374151]">{label}</p>
                    <p className="text-[12px] text-[#9ca3af] leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
            <h3 className="text-[14px] font-semibold text-[#111827] mb-1">What You Get</h3>
            <p className="text-[12px] text-[#6b7280] mb-4">The consolidated output generated after processing.</p>
            <div className="space-y-2.5">
              {OUTPUTS.map(({ text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-[#16a34a] shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-[13px] text-[#374151]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA strip ────────────────────────────────────────────────── */}
        <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Ready to consolidate?</p>
            <p className="text-[12px] text-[#6b7280] mt-0.5">Upload your files and the system will handle the rest.</p>
          </div>
          <Link
            href="/consolidation/upload"
            className="inline-flex items-center gap-2 bg-[#00488d] hover:bg-[#003a72] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0"
          >
            Get Started
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

      </div>
    </div>
  );
}
