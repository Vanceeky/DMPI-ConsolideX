@AGENTS.md

# ConsolideX — Excel Consolidation System

## What This System Does
ConsolideX is an internal web application for **Del Monte Philippines, Inc. (DMPI)** used by office staff to automate the consolidation of multiple Excel contribution files into a single standardized output.

## Business Purpose
Consolidates **PRA** (PRA Contribution Register) and **SPP** (SPP Contribution Register) payroll contribution files from multiple locations (BUGO and PLANTATION) into one Excel workbook with two tabs, enriched with employee Birthdate and Hired Date from a reference file.

## File Types

### Transaction Files
| Type | ID Column | Name Column | Contribution Columns | Notes |
|------|-----------|-------------|----------------------|-------|
| PRA  | `CHAPA No.` | `Last Name`, `First Name` | `Regular Contribution`, `Regularization Date` | May have tabs (BUGO, PLNT/PLTN) |
| SPP  | `Perm. Emp. No.` | `Surname`, `First Name` | `SPP EE Cont…`, `SPP ER Cont…` | Has tabs: BUGO, PLNT/PLTN, MNS, HRLS |

### SPP Tab Name Conventions
- `BUGO` → Location = BUGO
- `PLNT` or `PLTN` → Location = PLANTATION
- `MNS` → Employee Status = MONTHLIES
- `HRLS` → Employee Status = HOURLIES
- Supervisor files use BUGO/PLNT tabs; status inferred from metadata

### Reference File
Contains `CHAPA No.`, `Birthdate`, `Hired Date`. Used to enrich both PRA and SPP records. Separate reference files can be uploaded per type (PRA reference, SPP reference).

## Output Excel File
Filename: `PRA_SPP_Contribution_Register_<Month>_<Year>.xlsx`

Two sheets:
1. **PRA Contribution Register** — columns: CHAPA No., Last Name, First Name, Middle Initial, Employee Status, Location, Birthdate, Hired Date, Regularization Date, Regular Contribution
2. **SPP Contribution Register** — columns: Perm. Emp. No., Last Name, First Name, Middle Initial, Employee Status, Location, Birthdate, Hired Date, SPP EE Contribution, SPP ER Contribution

Each sheet includes:
- Metadata header rows (title, company, period) in bold
- Column header row (bold, top+bottom thin border)
- Data rows
- Total row (bold, medium top+bottom border)
- Summary tables grouped by Location (BUGO / PLANTATION) → Job Level (Hourlies / Monthlies / Supervisor)

## 4-Step Workflow
1. **Upload** — Upload PRA files, SPP files, and optional reference files per type
2. **Validate** — Auto-scan files: detect headers, check required columns, show per-sheet tab breakdown
3. **Process** — Parse all sheets, merge records, enrich from reference, generate output workbook
4. **Download** — Download the consolidated Excel with month/year selector

## Key Parsing Rules
- Header row is auto-detected by scanning for `CHAPA No.` or `Perm. Emp. No.` column
- Data reading stops at any row starting with `Total:` or `Grand Total`
- **Tab name always overrides the Location column value** (e.g., PLNT tab → PLANTATION, regardless of "CAMP PHILLIPS (COMPOUND)" in the column)
- Location codes `1` → BUGO, `2` → PLANTATION (for SPP files using location code column)
- For summary tables, all locations are normalized to BUGO or PLANTATION only

## Tech Stack
- Next.js 16 (App Router), TypeScript, React 19
- Tailwind CSS v4, shadcn/ui (base-nova style), Lucide React icons
- `xlsx-js-style` for Excel generation with cell styling
- React Context (`ConsolidationProvider`) for cross-page state

## Project Structure
- `app/(main)/consolidation/` — the 4 workflow pages (upload, validate, process, download)
- `lib/consolidation/` — parser, generator, context, types
- `components/` — sidebar, app-header, step-indicator, ui/button
