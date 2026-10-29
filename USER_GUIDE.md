# Java Modelling Tools (JMT) Visual Debug Tracer — User Guide

A discrete-event simulation tracer and state debugger for [Java Modelling Tools (JMT)](https://jmt.sourceforge.net/). This tool visualizes queueing network topologies, streams multi-gigabyte compressed simulation traces (`.ndjson.gz`), animates packets navigating across station links in real time, tracks all concurrent jobs in the model, and provides time-travel debugging with conditional breakpoints.

---

## 1. Quick Start

### Starting the Application
```powershell
# In the project directory:
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### Loading a Simulation Trace
1. Click **Upload Trace** in the top header or the center canvas card.
2. Select or drag-and-drop your JMT simulation trace files:
   - Supports compressed `.ndjson.gz` and uncompressed `.ndjson` files.
   - Example location: `C:\Users\calog\Documents\JMT Workspace\jmt\traces\`.
3. Choose an **Event Ingestion Ceiling** (default: `100,000 events` for optimal browser performance).
4. Click **Parse & Load Trace**.

---

## 2. Ingesting Multi-Chunk Traces

Large JMT simulations often generate split chunk files to prevent individual file sizes from growing too large:
```
JSIM_simulation___JModelSimulation1559749829381431458.xml_run1_part1.ndjson.gz
JSIM_simulation___JModelSimulation1559749829381431458.xml_run1_part2.ndjson.gz
...
```

### Multi-File Batch Ingestion
You can select and upload **all chunk parts simultaneously**:
* **Chunk Detection:** The parser extracts the simulation model prefix, Run ID (`run1`), and Part index (`part1`, `part2`).
* **Chronological Sorting:** Parts are automatically sorted in ascending numerical order.
* **Continuous Stitching:** The parser stiches individual chunk segments into a single unified event sequence, removing overlapping boundary records and linking the initial model topology with the final summary footer.
* **Stream Decompression:** Uses Web Streams API (`DecompressionStream('gzip')`) to decode multi-gigabyte traces chunk-by-chunk without loading entire multi-gigabyte uncompressed files into memory.

---

## 3. Simulation Canvas & Topology Navigation

The central canvas visualizes your queueing network as an interactive topological graph.

### Station Node Elements
Each station card displays:
* **Node Type & Title:** E.g., `Queue`, `Server`, `Delay`, `Source`, `Sink`, `Router`.
* **Queue Meter:** Visual occupancy bar and ratio (`Current Queue / Max Capacity`). If capacity is infinite, displays `∞`.
* **Server Cores:** Colored indicator dots representing individual server units (`green` = idle, `cyan` = busy serving a job).
* **Drop Counter:** A red badge indicating dropped packets due to finite buffer overflow.
* **Completed Counter:** For Sink stations, displays total absorbed jobs.

### Animated Packet Navigation
* Packets glide smoothly along cubic Bézier curves connecting the output port of the sending station to the input port of the receiving station.
* Each packet capsule displays its unique `Job ID` and is color-coded by its customer `Job Class`.
* A directional chevron aligns with the tangent angle of the wire curve as the packet traverses the link (~650ms flight duration).
* Active links glow with dynamic highlight pulses when transmitting packets.

### Canvas Controls
* **Pan:** Click and drag any empty area of the canvas.
* **Zoom:** Use the mouse scroll wheel or click the `+` / `−` zoom buttons in the bottom-left controls.
* **Reposition Stations:** Click and drag any station node to rearrange your network topology. Custom positions are preserved during playback.
* **Reset View:** Click the target icon `⊙` in the bottom-left toolbar to reset zoom and pan to default coordinates.

---

## 4. VCR Playback & Time-Travel Debugging

The bottom playback bar provides full state control over the discrete-event simulation:

| Control | Action | Keyboard Shortcut |
| :--- | :--- | :--- |
| **Play / Pause** | Toggle continuous simulation playback | `Space` |
| **Step Forward** | Execute the next discrete event | `Right Arrow` |
| **Step Backward** | Rewind one discrete event | `Left Arrow` |
| **Reset** | Rewind state to before event 0 ($t = 0$) | `Home` |
| **Speed Multipliers** | `0.1x`, `0.25x`, `0.5x`, `1x`, `2x`, `5x`, `10x` | UI Selector |
| **Timeline Scrubber** | Drag slider to jump immediately to any sequence index or simulation time | Mouse Drag |

---

## 5. Active Jobs in Model Viewer

The **Active Jobs in Model** tool provides a live, panoramic view of every single customer request or job currently residing inside the network at the current simulation step.

### Accessing the Active Jobs Viewer
1. Click the **Active Jobs in Model** tab in the collapsible bottom panel; or
2. Click the **Active Jobs** button in the canvas floating toolbar (top-right).

### Job States Monitored
* **`In Flight` (Cyan):** The job has completed service and departed its source station, and is currently traveling across the network connection wire towards the destination station. Displays exact link progress ($0\% - 100\%$).
* **`In Service` (Emerald):** The job has arrived at a station and is actively being processed by a specific server core (e.g., `Core #1`).
* **`In Queue` (Amber):** All servers are currently busy; the job is waiting in the station's input buffer. Displays its exact position in line (`Pos #1`, `Pos #2`...).

### Filtering & Searching Jobs
* **Search Input:** Filter by numeric Job ID, class name, or station name.
* **Status Pills:** Click `All`, `In Flight`, `In Service`, or `In Queue` to isolate jobs by activity.
* **Station Filter:** View only jobs present at a selected station.
* **Class Filter:** View only jobs belonging to a specific customer class.

### Inspecting a Job
Click any row in the table or the **Inspect** button to open the **Job Inspector** drawer.

---

## 6. Deep Dive Inspectors

Clicking an entity on the canvas or in the tables slides open a technical inspector drawer on the right side.

### Station Inspector
Click any station node card on the canvas:
* **Server Core Matrix:** Real-time state of each server core (idle, busy, job ID assigned, service start time).
* **Station Queue:** Ordered list of jobs currently waiting in the input queue.
* **Traffic Statistics:** Current queue size, total jobs in node, drop count, completed count.
* **Recent Station Events:** Rolling log of the last 10 discrete events involving this station.

### Job Inspector
Click any job in the Active Jobs table:
* **Current Status Banner:** Visual representation of whether the job is flying across a link, being served, or queued.
* **Timing Telemetry:** Exact simulation timestamp when the job entered its current state, and residence duration so far.
* **Priority & Class Type:** Customer class name, priority integer, and closed/open workload model.
* **Complete Event Trajectory:** Reverse-chronological history of every discrete event (`SEND`, `DISPATCH`, `DROP`) that has affected this job from $t=0$ to the current sequence.
* **Jump to Event:** Click any event in the history to seek the simulation directly to that instant.

### Packet Inspector
Click any animated packet gliding across a connection wire:
* Shows origin station output section, destination station input section, traversal percentage, and delivery ETA.

---

## 7. Simulation Event Log

The **Simulation Event Log** tab in the bottom panel displays every raw event record emitted by JMT:
* **Sequence (`#`):** Monotonically increasing event sequence counter.
* **Timestamp (`t`):** Simulation clock time in seconds (`0.0000s`).
* **Phase:**
  * `SEND`: Job dispatched from station output section.
  * `DISPATCH`: Job received at destination station.
  * `DROP`: Buffer overflow drop event.
* **Routing:** `Source Station [Section:Class] ➔ Destination Station [Section:Class]`.
* **Caller:** Java class and line number in JMT simulation engine (e.g., `QueueNet.NetNode.send(NetNode.java:782)`).
* **Click to Seek:** Clicking any event row seeks simulation playback to that exact event.

---

## 8. KPI & Telemetry Analytics

Click **Analytics** in the top-right canvas toolbar to open the performance dashboard:
* **Overall Metrics:** Total processed events, simulation clock duration, total buffer drops.
* **Station Utilization:** Real-time server utilization percentage for each queueing center.
* **Average Queue Length:** Average queue occupancy across stations.
* **Bottleneck Detection:** Automatically flags stations operating near capacity.
* **Little's Law Sanity Check:** Compares mean number in system ($L$) with arrival rate ($\lambda$) and system time ($W$).

---

## 9. Conditional Breakpoints

Set breakpoints to automatically pause simulation playback when critical conditions occur. Click **Breakpoints** in the top navigation bar:

1. **Pause on Job Drop (Buffer Full):** Automatically pauses playback the instant any finite queue drops a job (`DROP` phase). Enabled by default.
2. **Pause on Specific Job ID:** Pause when an event involves a particular customer request (e.g., `jobId = 42`).
3. **Pause on Station Event:** Pause whenever a selected station receives or dispatches a job.
4. **Pause on Queue Capacity Threshold:** Pause when a station's queue occupancy reaches or exceeds a specified percentage (e.g., $\ge 80\%$).

When a breakpoint is triggered, playback pauses immediately and the matching event is highlighted in the bottom log.

---

## 10. Keyboard Shortcuts Reference

| Key | Context | Action |
| :--- | :--- | :--- |
| `Space` | Global | Play / Pause simulation |
| `Right Arrow` | Global | Step forward 1 event |
| `Left Arrow` | Global | Step backward 1 event |
| `Home` | Global | Reset simulation to start ($t = 0$) |
| `Esc` | Global | Close any active inspector drawer or modal |

*(Keyboard shortcuts are automatically suppressed while typing in search or input fields).*

---

## 11. Troubleshooting & FAQ

#### Q: Can I load an entire simulation split across multiple chunk files?
Yes. Drag-and-drop all `.ndjson.gz` files at once. The engine will detect common Run IDs, sort by part numbers, stitch the chronological sequences, and eliminate boundary overlap.

#### Q: How can I improve rendering performance on 500,000+ event traces?
In the **Upload Modal**, select an ingestion cap of `50,000` or `100,000` events. This captures the active transient and steady-state behavior of the model while keeping browser frame rates locked at 60 fps.

---

## 12. Desktop Application & Multiplatform Installers (Tauri v2)

JMT Visual Debug Tracer is packaged as a lightweight, cross-platform native desktop application powered by **Tauri v2** and `@sveltejs/adapter-static`.

### Prerequisites for Building Native Desktop Installers

1. **Rust Toolchain:**
   - Install Rust via [rustup.rs](https://rustup.rs) or run in PowerShell:
     ```powershell
     winget install --id Rustlang.Rustup -e
     ```
2. **C++ Build Tools:**
   - **Windows:** Microsoft Visual Studio C++ Build Tools (already installed on standard developer setups).
   - **macOS:** Xcode Command Line Tools (`xcode-select --install`).
   - **Linux:** WebKitGTK and build essentials (`sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`).

### Desktop Development & Build Commands

| Command | Action | Output / Behavior |
| :--- | :--- | :--- |
| `npm run desktop:dev` | Launches native desktop window with live HMR | Runs Tauri debug app connected to `http://localhost:1420` |
| `npm run desktop:build` | Compiles production native installer bundle | Generates lightweight (~12-15 MB) installer and standalone executable |

### Output Artifacts

* **Windows:**
  * NSIS Installer: `src-tauri/target/release/bundle/nsis/JMT Visual Debug Tracer_0.1.0_x64-setup.exe`
  * MSI Installer: `src-tauri/target/release/bundle/msi/JMT Visual Debug Tracer_0.1.0_x64_en-US.msi`
* **macOS:**
  * DMG Image: `src-tauri/target/release/bundle/dmg/JMT Visual Debug Tracer_0.1.0_x64.dmg` (or Apple Silicon `.dmg`)
  * Application Bundle: `JMT Visual Debug Tracer.app`
* **Linux:**
  * AppImage: `src-tauri/target/release/bundle/appimage/jmt-visual-debug-tracer_0.1.0_amd64.AppImage`
  * Debian Package: `src-tauri/target/release/bundle/deb/jmt-visual-debug-tracer_0.1.0_amd64.deb`

### Automated Multiplatform CI/CD

A GitHub Actions workflow is provided at `.github/workflows/desktop-release.yml`. When a Git tag is pushed (e.g., `git tag v0.1.0 && git push --tags`), the workflow automatically builds native binaries for Windows, macOS (Apple Silicon and Intel), and Linux, publishing the installers directly as GitHub Releases.
