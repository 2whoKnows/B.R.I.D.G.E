# B.R.I.D.G.E. — Academic Document Management SaaS Platform

B.R.I.D.G.E. is a modern, trustworthy academic document-management SaaS platform designed for university administrators, document managers, and faculty members (teachers).

---

## 🌟 Key Features

### 🏢 Document Manager Portal
- **Dashboard Overview**: Real-time KPI metrics for total documents, active teachers, total downloads, and monthly analytics volume.
- **Embedded File Management**: The full Google-Drive-style browser on the dashboard itself — bulk file upload, folder upload, folder navigation, multi-select and drag-to-folder moves.
- **My Drive**: Nested folder tree with a side tree, breadcrumbs, search, category/file-type filters, and grid/list layouts.
- **Multi-Select Actions**: Checkboxes are hidden by default. A **Select** button reveals them along with **Select all**, and **Cancel** / **Done** exit selection mode. Supports Ctrl/Cmd-click and Shift-click ranges for moving, downloading, renaming or deleting together.
- **Drag-and-Drop**: Drag OS files/folders onto the page to upload into the current folder, or drag existing rows onto a folder to move them.
- **Teacher Directory**: User list, department filters, account activation/deactivation, and teacher invitation modal.
- **System Analytics**: Interactive download and view trends charts with date-range filters (`7d`, `30d`, `90d`, `1y`).
- **Audit Activity Log**: Comprehensive system event logging tracking logins, uploads, version updates, downloads, and user status changes.

### 🎓 Teacher Portal
- **Faculty Dashboard**: Welcome area, prominent document search, interactive category chips, and favorite quick access grid.
- **Documents (shared structure)**: Teachers see every document and folder the managers created and organised — the identical nested tree, breadcrumbs and side tree — rendered read-only with preview, download, multi-select and favourites, but no create/rename/move/delete controls. Labelled "Documents" rather than "My Drive", since it is a shared read-only view rather than a personal drive.
- **Distraction-Free Preview**: Document preview frame with version metadata, signed URL opening, and quick download.
- **Favorites & Recently Viewed**: Pinned document management and recent reading history.

### 📱 Responsive Mobile & Tablet Design
- Adaptive touch-friendly layout supporting smartphones (`320px` to `480px`), tablets (`768px` to `1024px`), and desktop monitors (`>1024px`).
- Bottom mobile navigation bar, slide-out drawer menu, and mobile-friendly table cards.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, React Router v7, Vite 8
- **Icons**: Lucide React
- **Backend & Storage**: Supabase (Authentication, PostgreSQL Database, Storage Buckets)
- **Styling**: Modern CSS Design System (Custom CSS Variables, Flexbox, CSS Grid)

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Set your Supabase credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-anon-key
```

### 4. Running Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## 🔒 License & Academic Security
This project is configured for authorized institutional and academic personnel access.
