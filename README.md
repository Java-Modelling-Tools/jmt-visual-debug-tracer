# JMT Visual Debug Tracer

A discrete-event visual debugging tracer and state inspector for [Java Modelling Tools (JMT)](https://jmt.sourceforge.net/), built with SvelteKit 5, TypeScript, and Vite.

---

## Features

- **Chunked Trace Ingestion:** Memory-efficient Web Streams decoder for compressed `.ndjson.gz` traces exceeding 3.9 GB without Chromium buffer overflow.
- **Multi-File Chunk Stitching:** Drag and drop all simulation chunk parts (`_run1_part1.ndjson.gz`, `_run1_part2.ndjson.gz`...) all at once into a unified continuous timeline.
- **Topological Simulation Canvas:** Automated layered DAG layout with cycle protection, station occupancy meters, and Bézier connection paths.
- **Visual Packet Navigation:** Packets smoothly glide across station links with speed-paced intervals, directional rotation tangent to the wire curve, and job class color coding.
- **Active Jobs in Model Viewer:** Real-time panoramic tracking of all jobs currently in the model, categorized into `In Flight`, `In Service`, and `In Queue` with residence times and instant inspection.
- **Time-Travel Playback:** VCR controls, scrubbable timeline slider, step forward/backward, and speeds from `0.1x` to `10x`.
- **Conditional Breakpoints:** Pause automatically on buffer overflow (`DROP`), specific `Job ID`, station activity, or queue threshold.
- **Telemetry & Little's Law Analytics:** Live server core utilization, throughput, queue lengths, and bottleneck identification.

---

## User Guide

For detailed step-by-step usage instructions, see [USER_GUIDE.md](./USER_GUIDE.md).

---

## Project Structure

```
src/
├── lib/
│   ├── components/                 # Svelte 5 UI components
│   │   ├── ActiveJobsViewer.svelte # Real-time table of all jobs currently in the model
│   │   ├── BreakpointModal.svelte  # Conditional breakpoint configuration modal
│   │   ├── EventLogTable.svelte    # Tabular discrete event trace log
│   │   ├── Header.svelte           # Top navigation bar & telemetry pills
│   │   ├── JobInspector.svelte     # Slide-over deep-dive inspector for individual jobs
│   │   ├── MetricsDashboard.svelte # KPI analytics & bottleneck detector
│   │   ├── PacketElement.svelte    # Animated packet capsule gliding along Bézier links
│   │   ├── PacketInspector.svelte  # In-flight packet transit inspector
│   │   ├── PlaybackControls.svelte # VCR controls & timeline scrubber
│   │   ├── SimulationCanvas.svelte # SVG canvas with pan, zoom, nodes & Bézier wires
│   │   ├── StationInspector.svelte # Station queue & server core inspector
│   │   ├── StationNode.svelte      # Station node card with queue meter & cores
│   │   └── TraceUploadModal.svelte # Multi-file batch chunk uploader & progress bar
│   ├── services/
│   │   ├── layoutEngine.ts         # Topological DAG layout & Bézier point evaluator
│   │   ├── simulationEngine.svelte.ts # Svelte 5 reactive playback & state machine
│   │   ├── theme.svelte.ts         # Obsidian dark & slate light theme manager
│   │   └── traceParser.ts          # Streaming GZIP NDJSON chunk decoder & stitcher
│   ├── types/
│   │   └── trace.ts                # TypeScript data models (events, nodes, jobs)
│   └── utils/
│       ├── colors.ts               # Workload class palette & phase badge styling
│       └── formatting.ts           # Simulation time, rates, and stack trace formatters
└── routes/
    ├── +layout.svelte              # Global shell with theme CSS variables
    └── +page.svelte                # Main application workspace layout
```

---

## Development & Testing

### Installation
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Run Diagnostic Type Checks
```bash
npm run check
```

### Run Unit and Integration Tests
```bash
npm run test:unit
```
Runs all 46 automated tests across both server (Node.js) and client (Playwright Chromium) environments.

### Production Web Build
```bash
npm run build
npm run preview
```

---

## Desktop Application & Tauri Build

JMT Visual Debug Tracer is packaged as a high-performance, lightweight native desktop application (~15 MB) powered by [Tauri v2](https://v2.tauri.app/) and `@sveltejs/adapter-static`.

### 1. Prerequisites

Before building the desktop application, install the native system toolchains:

* **Rust Toolchain (All Platforms):**
  Install Rust via [rustup.rs](https://rustup.rs) or run:
  * **Windows (PowerShell):**
    ```powershell
    winget install --id Rustlang.Rustup -e
    ```
  * **macOS / Linux:**
    ```bash
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```
  *(Restart your terminal after installation so `cargo` and `rustc` are available on your `PATH`).*

* **Platform C++ & Web Dependencies:**
  * **Windows:** Microsoft Visual Studio C++ Build Tools (MSVC).
  * **macOS:** Xcode Command Line Tools:
    ```bash
    xcode-select --install
    ```
  * **Linux (Debian/Ubuntu):**
    ```bash
    sudo apt update
    sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential curl
    ```

### 2. Desktop Development Mode

Run the desktop application in a native window with live Hot Module Replacement (HMR):
```bash
npm run desktop:dev
```
*(Under the hood, this executes `tauri dev`, which starts Vite on port 1420 and attaches the native WebView window).*

### 3. Building Desktop Installers

To compile the production desktop application and bundle native installers:
```bash
npm run desktop:build
```
This command automatically:
1. Builds the static production SvelteKit single-page app (`build/`).
2. Invokes `cargo build --release` inside `src-tauri/`.
3. Packages platform-specific installers into `src-tauri/target/release/bundle/`.

### 4. Installer Output Locations

* **Windows:**
  * **NSIS Setup Installer:** `src-tauri/target/release/bundle/nsis/JMT Visual Debug Tracer_0.1.0_x64-setup.exe`
  * **MSI Package:** `src-tauri/target/release/bundle/msi/JMT Visual Debug Tracer_0.1.0_x64_en-US.msi`
* **macOS:**
  * **DMG Disk Image:** `src-tauri/target/release/bundle/dmg/JMT Visual Debug Tracer_0.1.0_x64.dmg` (or Apple Silicon `.dmg`)
  * **Application Bundle:** `src-tauri/target/release/bundle/macos/JMT Visual Debug Tracer.app`
* **Linux:**
  * **AppImage:** `src-tauri/target/release/bundle/appimage/jmt-visual-debug-tracer_0.1.0_amd64.AppImage`
  * **Debian Package:** `src-tauri/target/release/bundle/deb/jmt-visual-debug-tracer_0.1.0_amd64.deb`

### 5. Multiplatform CI/CD Pipeline

A GitHub Actions workflow is provided in [`.github/workflows/desktop-release.yml`](./.github/workflows/desktop-release.yml). When a release tag is pushed (`git tag v0.1.0 && git push --tags`), it triggers automated parallel matrix builds across Windows, macOS (Intel & Apple Silicon), and Ubuntu Linux, attaching the compiled installer artifacts directly to the GitHub Release.

---

## License

MIT License. Designed for Java Modelling Tools (JMT) simulation workflows.
