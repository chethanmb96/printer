# HP Smart Tank 589 Status & Telemetry Monitor

[![Deploy to GitHub Pages](https://github.com/chethanmb96/hp-smarttank-monitor/actions/workflows/deploy.yml/badge.svg)](https://github.com/chethanmb96/hp-smarttank-monitor/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-00AEEF?style=flat&logo=github)](https://chethanmb96.github.io/hp-smarttank-monitor/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Standard%20Library-10B981?style=flat)](https://www.python.org/)

A dedicated, lightweight web dashboard and telemetry companion for the **HP Smart Tank 589 (All-in-One)** printer.

It connects directly over your local Wi-Fi to the printer using HP's **Common Device Model (CDM) REST API** and **IPP 2.0 (Internet Printing Protocol)** to retrieve accurate ink levels, hardware health, page impressions, and paper tray status in real-time.

🌐 **Live Demo on GitHub Pages**: [https://chethanmb96.github.io/hp-smarttank-monitor/](https://chethanmb96.github.io/hp-smarttank-monitor/)

---

## Key Features

1. **Smart Tank Ink Visualizer**:
   - 4 Individual liquid reservoirs matching the physical front tanks of the HP Smart Tank 589:
     - **GT53 / GT53XL Black (135 ml)**
     - **GT52 Cyan (70 ml)**
     - **GT52 Magenta (70 ml)**
     - **GT52 Yellow (70 ml)**
   - Displays real-time fill level percentages, animated fluid levels, min/max fill markers, and replacement bottle codes.

2. **Dual Printhead Health**:
   - Status tracking for Black Printhead (`HP X4E75A / 3YP61A`) and Tri-Color Printhead (`HP M0H50A`).

3. **Impression Counters & Usage**:
   - Total lifetime pages printed and copied.
   - Breakdown of Monochrome vs. Color impressions with visual distribution bar.
   - Flatbed copy counters.
   - Windows Spooler queue monitoring.

4. **Hardware, Media & Scanner Telemetry**:
   - Rear input tray media size (A4 / 210 x 297 mm), paper type (plain paper/stationery), and output bin status.
   - Flatbed CIS scanner engine state via eSCL protocol (Idle / Ready).

5. **Wireless & Connectivity**:
   - Wi-Fi SSID (`JioFiber-2.4GHz`), 2.4 GHz self-healing band, IPv4 (`192.168.29.86`), IPv6, and hardware MAC address (`74:DA:78:BC:BE:8E`).
   - Network transmission statistics (Packets sent, bytes received, error counters).

6. **Quick Actions & Hardware Diagnostics**:
   - One-click trigger for diagnostic print reports:
     - Printer Status Report (`configurationReport`)
     - Print Quality Diagnostic Report (`printQualityTestReport`)
     - Network Configuration Report (`networkConfigurationReport`)
     - Printhead Alignment Page (`alignmentPage`)
     - Wireless Network Test Report (`wirelessNetworkPage`)
   - Direct shortcut to open the printer's **Embedded Web Server (EWS)** in browser.
   - Direct button to open the native **Windows Print Spooler Queue**.
   - Direct button to print a Windows Test Page.
   - Configurable auto-refresh rates (5s, 10s, 30s, Manual).
   - Built-in Simulation / Demo Mode for testing when offline or browsing via GitHub Pages.

---

## GitHub Pages Deployment

This repository is ready for automatic deployment to GitHub Pages!

### Automatic Deployment via GitHub Actions (Recommended)
1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish your dashboard to:
   `https://<your-username>.github.io/hp-smarttank-monitor/`

### Alternative: Deploy from Branch
- Under **Settings** > **Pages** > **Source**, select **Deploy from a branch**.
- Choose branch `main` and folder `/docs`.

---

## How to Run Locally (Sync with Physical Printer)

### Method 1: One-Click Launcher (Windows)
Double-click `start_monitor.bat` in the project folder. It will launch the background server and open the web dashboard in your browser at `http://localhost:8089`.

### Method 2: Command Line
```powershell
python server.py
```
Then navigate to: [http://localhost:8089](http://localhost:8089)

---

## Technologies Used
- **Backend**: Python 3 standard library (`http.server`, `urllib.request`, `ssl`, `json`, `subprocess`). **Zero external dependencies required.**
- **Frontend**: Vanilla HTML5, CSS3 with responsive glassmorphism and liquid reservoir animations, Vanilla JavaScript ES6+.
- **Deployment**: GitHub Pages & GitHub Actions CI/CD.
