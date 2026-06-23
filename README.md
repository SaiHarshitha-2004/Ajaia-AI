# Ajaia Docs — Elegant Collaborative Document Editor

A premium, lightweight, full-stack collaborative document editing application. Built using React, Express, Node.js, and custom HSL CSS.

---

## Core Capabilities

1. **Document Creation & Editing:** Create and delete documents, modify titles in real-time, and edit text using an intuitive Rich-Text editor. Supports:
   - **Bold**, *Italic*, and <u>Underline</u> styles
   - Header Sizes (H1, H2, Normal Text)
   - Bulleted (`<ul>`) and Numbered (`<ol>`) Lists
   - Paragraph alignment options (Left, Center, Right)
2. **Access-Control Sharing:** Document owners can select and manage edit permissions for other seeded workspace users (Alice, Bob, Charlie).
3. **File Importing / Appending:** Import local `.txt` or `.md` files to instantly scaffold new documents, or append file contents directly to an active draft with one click.
4. **Dynamic Dark / Light Themes:** A modern theme selector persisting user preferences.
5. **Robust Local JSON Persistence:** File-system transactions with queued writes to ensure zero-collision database operations.

---

## Technology Stack

- **Frontend:** React, Vite, Lucide React (icons), Custom Vanilla CSS Variables (supporting system/toggle theme matching and transitions).
- **Backend:** Node.js, Express, Multer (file streams), Cors.
- **Persistence:** Atomic JSON-based local database (`server/data/db.json`) utilizing asynchronous write-queues.
- **Testing:** Node.js Native Test Runner (built-in, zero-dependency).

---

## Quick Start Guide

### Prerequisites
- Node.js (version 18 or above recommended)
- npm (installed automatically with Node.js)

### Installation
From the project root directory, run the installation script:
```bash
# This installs dependencies for the root, backend server, and frontend client
npm install
npm install --prefix server
npm install --prefix client
```

### Running the Application Locally
Boot both the backend server and frontend client concurrently:
```bash
npm run dev
```
- **Frontend Client:** Available at [http://localhost:5173](http://localhost:5173)
- **Backend API:** Available at [http://localhost:5000](http://localhost:5000)

### Running Automated Integration Tests
Launch Node's built-in, zero-dependency test runner to verify REST endpoints, authentication rules, and database updates:
```bash
npm test
```

---

## API Documentation

- **Authentication:** Mock authentication is implemented by passing the active user ID through the request headers: `X-User-ID: <username>`.
- **Seeded Workspace Users:**
  - `alice` (Alice Smith)
  - `bob` (Bob Johnson)
  - `charlie` (Charlie Brown)

### Endpoint Summary

| Method | Endpoint | Description | Headers |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Lists all seeded users | None |
| `GET` | `/api/documents` | Lists all documents owned by or shared with current user | `X-User-ID` |
| `GET` | `/api/documents/:id` | Returns details for a specific document | `X-User-ID` |
| `POST` | `/api/documents` | Creates a new document | `X-User-ID` |
| `PUT` | `/api/documents/:id` | Updates title or content body of a document | `X-User-ID` |
| `POST` | `/api/documents/:id/share` | Configures document shared user lists (Owner Only) | `X-User-ID` |
| `DELETE` | `/api/documents/:id` | Dees document (Owner Only) | `X-User-ID` |
| `POST` | `/api/documents/import` | Uploads file. Creates new document or appends to `documentId` | `X-User-ID` |

---

## Architecture Note: Priorities and Rationale

1. **Zero-Dependency Local Persistence:** Rather than relying on SQLite or Postgres (which frequently trigger binary compilation failures during review on differing OS platforms), we implemented a lightweight transactional JSON file wrapper (`server/db.js`). This layer employs a sequential async promise-queue and temporary-file renaming (`fs.rename`), achieving collision-free database writes with 100% platform portability.
2. **Lightweight contentEditable Rich Editor:** Instead of integrating heavy, opinionated libraries (like Quill or Slate), we leveraged standard HTML5 `contentEditable` powered by `document.execCommand` and selection state checks. This ensures instant rendering, low footprint, and robust browser compatibility.
3. **Simulated Multi-User Environment:** The profile switcher dropdown allows instant context swaps in the browser. Switching profiles instantly adjusts the list of visible documents, allowing reviewers to evaluate the sharing controls immediately in a single window.
4. **Vanilla CSS Design System:** Standardizing on modern HSL CSS variables and fluid grids allowed us to create a stunning, responsive UX (including glassmorphism overlays and transition animations) without Tailwind bundle bloat.

---

## AI-Native Workflow Note

### AI Tools Used
- Developed using the Antigravity agentic coding assistant powered by Google DeepMind's Gemini model.

### Material Speedups
- **Boilerplate and Routing:** Generating the initial Express routers and validation middlewares saved substantial setup time.
- **CSS Design System:** Scaffolding HSL variables, transitions, and component-specific style states was fully completed by the AI, ensuring a highly polished look instantly.
- **Integration Tests:** The AI quickly drafted a complete mock sequence testing route security restrictions (e.g., Bob trying to access Alice's unshared documents).

### Code Alterations & Rejections
- **Rejected SQLite Wrapper:** The AI originally planned for a `sqlite3` database but rejected it in favor of a robust JSON write-queue. This eliminates binary compilation and library-binding issues on the reviewer's terminal.
- **Refined Selection State Queries:** To avoid page jumps, the AI adjusted the editor so content edits do not cause React to trigger a full DOM refresh, preserving the cursor position.

### Verification Methods
1. **Automated Tests:** Verified security access rules, document creation, sharing settings, and deletion via `node --test`.
2. **Manual UX Quality Check:** Verified responsiveness, switching active profiles in the sidebar to prove permissions change, uploading complex Markdown structures, and testing toolbar actions (Bold, Headings, Lists).
+
