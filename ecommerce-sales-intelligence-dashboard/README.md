# Ecommerce Sales Intelligence Dashboard

> **Turn Your Ecommerce Data Into Actionable Business Decisions.**

A responsive, browser-powered **Ecommerce Analytics & Business Intelligence Platform** built for Shopify and WooCommerce store owners, e-commerce managers, and executives. Upload raw CSV or Excel (`.xlsx`) sales exports to automatically clean records, track revenue and profitability KPIs, segment customers with RFM analysis, inspect rule-based insights and forecasts, and export multi-sheet Excel or print-ready reports.

---

## Core Capabilities

### 1. Data Upload, Auto-Detection & Cleaning
- **CSV & Excel (`.xlsx` / `.xls`) Ingestion**: Drag-and-drop spreadsheet parsing powered directly in the browser via **PapaParse** and **SheetJS (`xlsx`)**.
- **Automatic Column Detection**: Fuzzy-matches common Shopify, WooCommerce, and custom e-commerce headers (`order_id`, `order_date`, `customer_id`, `product_name`, `category`, `quantity`, `unit_price`, `discount`, `refund_amount`, `order_status`, `payment_method`, `product_cost`, `stock_quantity`) with interactive column review prior to activation.
- **Automated Data Hygiene**: Detects and removes duplicate rows, converts negative return quantities cleanly, fills missing optional attributes, logs row-level validation audits, and tracks upload history locally.
- **Built-In Demo Datasets & Templates**: Includes downloadable `.csv` and `.xlsx` starter templates plus two instant demo modes (with and without `product_cost` & inventory data).

### 2. Executive KPI Dashboard
- Tracks **Total Revenue**, **Total Orders**, **Average Order Value (AOV)**, **Total Customers**, **Total Products Sold**, and **Total Refunds** with period-over-period percentage comparisons.
- **Conditional Profitability Integrity**: **Gross Profit** and **Profit Margin** appear **only** when reliable `product_cost` data is verified across the uploaded dataset—preventing misleading margin figures.
- Global **Date Range**, **Category**, and **Product / Order Search** filters recalculate all views instantaneously.

### 3. Sales Analytics
- Interactive **Daily**, **Weekly**, **Monthly**, and **Yearly** revenue & order cadence charts.
- **Peak Sales Days** leaderboard and **Day-of-Week** revenue distribution.
- **Revenue by Category** and **Revenue by Payment Method** share breakdowns with period-over-period growth percentages.

### 4. Product Performance Analytics
- **Top 10 Selling Products** (toggleable between Net Revenue and Units Sold) and **Lowest-Performing Products**.
- Full product catalog metrics including revenue share %, unit velocity, average unit price, refunds, and conditional profit margin.
- **Low-Stock Inventory Alerts** (activated automatically when `stock_quantity` data is present, configurable threshold in Settings).

### 5. Customer Analytics & RFM Segmentation
- **Unique Customers**, **New vs. Returning Customers**, **Repeat Purchase Rate**, **Purchase Frequency**, and **Average Customer Order Value**.
- Automated quintile-based **RFM Segmentation** (*Champions*, *Loyal*, *Potential*, *Promising*, *At Risk*, *Hibernating*) with interactive segment filtering and a **Top Customers by Revenue** ledger.

### 6. Deterministic Business Intelligence & Forecasting
- **Rule-Based Insights Engine (Zero Hallucinations)**: Generates insights strictly from verified transaction calculations (top revenue product, period momentum, returning buyer revenue share, highest-AOV category, declining SKU alerts, and At-Risk retention opportunities).
- **3-Month Sales Forecast**: Projects near-term revenue using blended ordinary least-squares (OLS) linear regression and a trailing 3-month weighted moving average with a `±1σ` residual confidence band.

### 7. Multi-Format Reports & Print Layout
- One-click **CSV** exports (Monthly Sales, Product Performance, Customer RFM).
- **Multi-Sheet Excel (`.xlsx`) Workbook** export containing *Executive Summary*, *Sales Trend*, *Product Performance*, *Customer RFM*, and *Transactions*.
- Clean **Print / Save as PDF** executive layout with dedicated `@media print` styling.

---

## Application Pages

| Page | Purpose |
| :--- | :--- |
| **Dashboard** | Executive KPIs, revenue & orders trends, category share, and top takeaways |
| **Sales Analytics** | Daily/weekly/monthly/yearly cadence, peak days, weekdays, and payment mix |
| **Product Analytics** | Top 10, lowest-performing SKUs, category metrics, and low-stock watchlist |
| **Customer RFM** | Repeat rate, new vs. returning split, RFM segments, and top buyer table |
| **Business Insights** | Data-grounded insights, declining SKU alerts, and 3-month sales forecast |
| **Data Management** | CSV/Excel upload, column mapper, cleaning audit, demo presets, and history |
| **Reports & Export** | CSV downloads, multi-sheet `.xlsx` workbook, and A4 print-friendly layout |
| **Settings** | Currency (`USD`, `GBP`, `EUR`, `PKR`, `INR`), date format, low-stock threshold, reset |

---

## Supported Dataset Columns

| Column | Required | Example | Notes |
| :--- | :---: | :--- | :--- |
| `order_id` | Yes | `ORD-1001` | Distinct order identifier |
| `order_date` | Yes | `2026-10-15` | Supports ISO, slash dates, and Excel serial dates |
| `product_name` | Yes | `Running Shoes` | Product or SKU title |
| `quantity` | Yes | `2` | Units ordered (negative values handled as returns) |
| `unit_price` | Yes | `50` | Price per unit |
| `customer_id` | Optional | `CUST-101` | Used for RFM & repeat buyer analysis |
| `category` | Optional | `Footwear` | Defaults to `Uncategorized` if omitted |
| `discount` | Optional | `5` | Subtracted from gross line total |
| `refund_amount` | Optional | `0` | Subtracted from net revenue & tracked in Refunds KPI |
| `order_status` | Optional | `Completed` | Inferred automatically if missing |
| `payment_method` | Optional | `Card` | Used in Payment Method analytics |
| `product_cost` | Optional | `25` | Enables Gross Profit & Margin % when ≥ 80% complete |
| `stock_quantity` | Optional | `40` | Enables Low-Stock inventory watchlist |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4 (`Plus Jakarta Sans` + `JetBrains Mono` tabular numerals)
- **Visualizations**: Recharts 3 & Lucide React Icons
- **Data Processing & Export**: PapaParse (CSV) + SheetJS `xlsx` (Excel import & multi-sheet export)
- **Telemetry**: `@vercel/analytics`

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/AnasKhan2310/Ecommerce-Sales-Intelligence-Dashboard.git
cd Ecommerce-Sales-Intelligence-Dashboard

# 2. Install dependencies
npm install

# 3. Start development server on http://localhost:3000
npm run dev

# 4. Type-check & build for production
npm run lint
npm run build
```

---

## Deploying to Vercel

This repository is pre-configured for zero-friction static deployment on **Vercel**:

- `vercel.json` sets `installCommand: "npm install --legacy-peer-deps"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`, and SPA rewrites.
- `.npmrc` includes `legacy-peer-deps=true` for clean peer resolution across Vite 8 and React 19.
- `@vercel/analytics` is mounted in `src/main.tsx`.

**Deploy Steps:**
1. Push your repository to GitHub (`main` branch).
2. Import the repository in [Vercel](https://vercel.com/new).
3. Keep the default **Vite** framework preset (Build Command: `npm run build`, Output Directory: `dist`) and click **Deploy**.
