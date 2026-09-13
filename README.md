# B.R.I.D.G.E. — Academic Document Management SaaS Platform

B.R.I.D.G.E. is a modern, trustworthy academic document-management SaaS platform designed for university administrators, document managers, and faculty members (teachers).

---

## 🌟 Key Features

### 🏢 Document Manager Portal
- **Dashboard Overview**: Real-time KPI metrics for total documents, active teachers, total downloads, and monthly analytics volume.
- **Document Management**: Search, category/file-type filtering, versioning history, and document archive/deletion.
- **Teacher Directory**: User list, department filters, account activation/deactivation, and teacher invitation modal.
- **System Analytics**: Interactive download and view trends charts with date-range filters (`7d`, `30d`, `90d`, `1y`).
- **Audit Activity Log**: Comprehensive system event logging tracking logins, uploads, version updates, downloads, and user status changes.

### 🎓 Teacher Portal
- **Faculty Dashboard**: Welcome area, prominent document search, interactive category chips, and favorite quick access grid.
- **Document Library**: Filterable academic library sorted by newest, most viewed, or most downloaded resources.
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
