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
Runs all 43 automated tests across both server (Node.js) and client (Playwright Chromium) environments.

### Production Build
```bash
npm run build
npm run preview
```

---

## License

MIT License. Designed for Java Modelling Tools (JMT) simulation workflows.
