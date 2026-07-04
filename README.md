# ConsolideX — DMPI Excel Consolidation System

An internal web application for **Del Monte Philippines, Inc. (DMPI)** that automates the consolidation of multiple Excel contribution files (PRA and SPP) into a single standardized output workbook.

---

## Overview

Office staff can upload PRA and SPP contribution register files from multiple locations (BUGO and PLANTATION), optionally provide an employee reference file for data enrichment, and download a consolidated Excel report — all through a clean 4-step workflow.

### Key Features

- **Auto header detection** — finds the data header row automatically, skipping metadata rows at the top
- **Multi-sheet support** — reads all tabs in a workbook; tab names determine location and employee status
- **Smart location resolution** — tab name always overrides the location column (e.g. `PLNT`/`PLTN` → PLANTATION)
- **Reference enrichment** — adds Birthdate and Hired Date to all records via CHAPA No. lookup
- **Formatted Excel output** — bold headers, bordered totals, and per-location summary tables at the bottom of each sheet
- **Real-time validation** — per-file integrity check showing row counts, detected columns, and tab breakdown before processing

---

## Workflow

| Step | Page | What happens |
|------|------|-------------|
| 1 | **Upload** | Upload PRA files, SPP files, and reference files (one per type) |
| 2 | **Validate** | Files are scanned and checked for required columns |
| 3 | **Process** | Records are merged, enriched from reference, and the output workbook is generated |
| 4 | **Download** | Download the consolidated Excel with a custom month/year period selector |

---

## File Structures

### PRA Contribution Register
| Column | Notes |
|--------|-------|
| `CHAPA No.` | Employee ID (lookup key) |
| `Last Name`, `First Name`, `Middle Initial` | Name fields |
| `Employee Status` | Hourlies / Monthlies / Supervisor |
| `Location` | Overridden by tab name if tab is `BUGO` or `PLNT`/`PLTN` |
| `Regularization Date` | |
| `Regular Contribution` | |

### SPP Contribution Register
| Column | Notes |
|--------|-------|
| `Perm. Emp. No.` | Same as CHAPA No. — different label |
| `Surname`, `First Name`, `Middle Initial` | Name fields |
| `Employee Status` | Inferred from tab name if not present (`MNS` → Monthlies, `HRLS` → Hourlies) |
| `Location` | From `Location Code` column (1=BUGO, 2=PLANTATION) or tab name |
| `SPP EE Cont for the Month of…` | Employee contribution |
| `SPP ER Cont for the Month of…` | Employer contribution |

### Employee Reference File
Any Excel file containing at minimum:
- `CHAPA No.` or `Perm. Emp. No.`
- `Birthdate`
- `Hired Date`

Extra columns are ignored.

---

## Output Format

**Filename:** `PRA_SPP_Contribution_Register_<Month>_<Year>.xlsx`

**Two sheets:**

1. **PRA Contribution Register** — CHAPA No., Last Name, First Name, Middle Initial, Employee Status, Location, Birthdate, Hired Date, Regularization Date, Regular Contribution
2. **SPP Contribution Register** — Perm. Emp. No., Last Name, First Name, Middle Initial, Employee Status, Location, Birthdate, Hired Date, SPP EE Contribution, SPP ER Contribution

**Each sheet includes:**
- Metadata rows (title, company, period) — bold
- Column header row — bold with top and bottom border
- Data rows
- Total row — bold with medium top and bottom border
- Summary tables grouped by Location → Job Level (Hourlies / Monthlies / Supervisor) with Grand Totals

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Icons | Lucide React |
| Excel | `xlsx-js-style` (parse + generate with cell styling) |
| State | React Context (`ConsolidationProvider`) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

```bash
# Production build
npm run build
npm run start
```

---

## Project Structure

```
app/
  (main)/
    consolidation/
      upload/       # Step 1 — file upload zones
      validate/     # Step 2 — integrity check
      process/      # Step 3 — consolidation engine
      download/     # Step 4 — output download
lib/
  consolidation/
    parser.ts       # Excel parsing, header detection, tab inference
    generate.ts     # Output workbook generation with styling
    context.tsx     # Shared state across the 4-step flow
    types.ts        # TypeScript types
components/
  sidebar.tsx       # Navigation
  app-header.tsx    # Breadcrumb, DMPI button, avatar
  step-indicator.tsx
```

---

## Deployment

Deployed on **Vercel**. Push to `master` to trigger a new deployment.
