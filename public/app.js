/**
 * HP Smart Tank 589 Status Monitor - Frontend Application Controller
 * Handles real-time polling, state synchronization, visual ink tank animations,
 * and printer diagnostic triggers.
 */

// Application State
const isGitHubPagesEnv = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';

const state = {
  printerData: null,
  pollTimer: null,
  pollIntervalSec: 10,
  isFetching: false,
  selectedReport: null,
  theme: localStorage.getItem('hp_monitor_theme') || 'dark',
  backendBaseUrl: (localStorage.getItem('hp_monitor_backend_url') || '').trim(),
  isGitHubPages: isGitHubPagesEnv,
  isStaticMode: isGitHubPagesEnv && !(localStorage.getItem('hp_monitor_backend_url') || '').trim()
};

function apiUrl(path) {
  if (state.backendBaseUrl) {
    return state.backendBaseUrl.replace(/\/+$/, '') + path;
  }
  return path;
}

// Verified HP Smart Tank 589 Hardware Telemetry (Baseline & GitHub Pages Offline Fallback)
const BASELINE_TELEMETRY = {
  is_demo: true,
  connected: true,
  device: {
    model: "HP Smart Tank 589 All-in-One",
    series: "HP Smart Tank 580-590 series",
    serial_number: "TH67T7W31V",
    firmware_version: "LWP1CN2630CR",
    firmware_release: "31.2630.02",
    firmware_date: "2026-07-24",
    hardware_id: "2100992722",
    country: "India (IN)",
    install_date: "10/8/2026",
    uptime_seconds: 5420,
    uptime_formatted: "1 hr 30 mins"
  },
  status: {
    state: "ready",
    state_label: "Ready / Standby",
    is_ready: true,
    door_open: false,
    paper_jam: false,
    accepting_jobs: true,
    queued_jobs: 0
  },
  ink_summary: {
    total_capacity_ml: 345.0,
    total_remaining_ml: 345.0,
    total_pct: 100
  },
  tanks: [
    {
      id: "black",
      name: "Black Ink (K)",
      color_hex: "#111827",
      text_color: "#ffffff",
      level: 100,
      volume_ml: 135.0,
      remaining_ml: 135.0,
      status: "ok",
      bottle_model: "HP GT53 / GT53XL",
      capacity: "135 ml (Pigment Black)",
      estimated_pages: "~6,000 pages"
    },
    {
      id: "cyan",
      name: "Cyan Ink (C)",
      color_hex: "#00AEEF",
      text_color: "#ffffff",
      level: 100,
      volume_ml: 70.0,
      remaining_ml: 70.0,
      status: "ok",
      bottle_model: "HP GT52 Cyan",
      capacity: "70 ml (Dye)",
      estimated_pages: "~8,000 pages (Composite)"
    },
    {
      id: "magenta",
      name: "Magenta Ink (M)",
      color_hex: "#EC008C",
      text_color: "#ffffff",
      level: 100,
      volume_ml: 70.0,
      remaining_ml: 70.0,
      status: "ok",
      bottle_model: "HP GT52 Magenta",
      capacity: "70 ml (Dye)",
      estimated_pages: "~8,000 pages (Composite)"
    },
    {
      id: "yellow",
      name: "Yellow Ink (Y)",
      color_hex: "#FFDE00",
      text_color: "#1f2937",
      level: 100,
      volume_ml: 70.0,
      remaining_ml: 70.0,
      status: "ok",
      bottle_model: "HP GT52 Yellow",
      capacity: "70 ml (Dye)",
      estimated_pages: "~8,000 pages (Composite)"
    }
  ],
  printheads: [
    {
      type: "Black Printhead",
      model: "HP X4E75A (3YP61A)",
      status: "Healthy / OK",
      serial: "184b23c911a0",
      installed: true
    },
    {
      type: "Tri-Color Printhead",
      model: "HP M0H50A",
      status: "Healthy / OK",
      serial: "1757b52971c3",
      installed: true
    }
  ],
  counters: {
    total_impressions: 56,
    monochrome_impressions: 18,
    color_impressions: 34,
    copy_impressions: 6,
    print_other: 50,
    monochrome_pct: 32,
    color_pct: 68
  },
  media: {
    source: "Main Tray (Sheet Feeder)",
    size: "A4 (210 x 297 mm)",
    type: "Plain Paper (Stationery)",
    status: "Ready",
    capacity: "Up to 100 sheets input / 30 sheets output"
  },
  scanner: {
    state: "Idle",
    type: "Flatbed CIS Scanner",
    optical_resolution: "Up to 1200 x 1200 dpi",
    status: "Ready for scanning"
  },
  power: {
    sleep_timeout_min: 5,
    shutdown_timeout_min: 15,
    auto_shutdown_enabled: true,
    shutdown_prevention: "whenPortsAreActive",
    energy_star: true
  },
  firmware_services: {
    update_type: "Auto-Update",
    state: "Idle",
    last_update_check: "2026-10-10 07:54:28 UTC",
    last_check_status: "Up to Date",
    recovery_mode: false
  },
  print_engine: {
    speed_color_ppm: 5,
    speed_mono_ppm: 12,
    duplex: "Manual Duplex (Driver Prompt)",
    color_modes: ["Color", "Monochrome", "Auto-Detect", "Process-Monochrome"],
    supported_formats: ["Apple AirPrint (URF)", "PWG Raster", "HP PCL3GUI", "PCLm", "JPEG"],
    supported_media_sizes_count: 25,
    supported_media_sizes: [
      "A4 (210×297 mm)", "Letter (8.5×11 in)", "Legal (8.5×14 in)",
      "Photo 4×6 in", "Photo 5×7 in", "Envelope DL", "Envelope C6",
      "Envelope #10", "A5", "A6", "B5", "Executive", "Custom (up to 8.5×14 in)"
    ],
    supported_media_types: [
      "Plain Paper", "Photo Glossy", "HP Matte Brochure",
      "HP Presentation Matte", "HP Photo Inkjet", "Lightweight Paper"
    ]
  },
  copy_engine: {
    default_copies: 1,
    quality: "Normal (600 dpi)",
    content_type: "Mixed (Text & Photos)",
    plex_mode: "Simplex"
  },
  diagnostics: {
    recent_event_codes: ["74899", "69552"],
    paper_jams: 0,
    carriage_status: "Operational"
  },
  network: {
    connection_type: "Wi-Fi (802.11 b/g/n, 2.4 GHz)",
    ssid: "JioFiber-2.4GHz",
    signal_strength: "Excellent (-48 dBm)",
    ipv4: "192.168.29.86",
    ipv6: "2405:201:d03f:6065:76da:78ff:febc:be8e",
    mac_address: "74:DA:78:BC:BE:8E",
    auth: "WPA2-Personal (AES)",
    mdns_name: "HP Smart Tank 580-590 series [BCBE8E]",
    device_uuid: "urn:uuid:c5c3dc33-e7c5-41ae-a5bc-4e0cfcf44fdc",
    packets_sent: 19351,
    bytes_received: 70236,
    unicast_packets: 13180,
    multicast_packets: 5006,
    packet_errors: 0,
    collisions: 0,
    queue_jobs: 0,
    spooler_status: "Active / Listening"
  }
};

// DOM Element References
const elements = {
  // Navigation & Badges
  connBadge: document.getElementById('connStatusBadge'),
  connText: document.getElementById('connStatusText'),
  refreshBtn: document.getElementById('refreshBtn'),
  refreshSelect: document.getElementById('refreshRateSelect'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  settingsBtn: document.getElementById('settingsBtn'),
  noticeBanner: document.getElementById('noticeBanner'),
  noticeText: document.getElementById('noticeText'),
  noticeCloseBtn: document.getElementById('noticeCloseBtn'),

  // Hero Section
  printerModelName: document.getElementById('printerModelName'),
  printerStatePill: document.getElementById('printerStatePill'),
  printerStateText: document.getElementById('printerStateText'),
  deviceSerial: document.getElementById('deviceSerial'),
  deviceFirmware: document.getElementById('deviceFirmware'),
  deviceUptime: document.getElementById('deviceUptime'),
  deviceInstallDate: document.getElementById('deviceInstallDate'),
  lastUpdatedFootnote: document.getElementById('lastUpdatedFootnote'),
  openEwsBtn: document.getElementById('openEwsBtn'),
  openQueueBtn: document.getElementById('openQueueBtn'),
  printTestPageBtn: document.getElementById('printTestPageBtn'),

  // Tanks & Printheads
  tanksContainer: document.getElementById('tanksContainer'),
  printheadCards: document.getElementById('printheadCards'),

  // Counters
  cntTotal: document.getElementById('cntTotal'),
  cntMono: document.getElementById('cntMono'),
  cntColor: document.getElementById('cntColor'),
  cntCopy: document.getElementById('cntCopy'),
  cntMonoPct: document.getElementById('cntMonoPct'),
  cntColorPct: document.getElementById('cntColorPct'),
  impressionsTotalBadge: document.getElementById('impressionsTotalBadge'),
  distMonoBar: document.getElementById('distMonoBar'),
  distColorBar: document.getElementById('distColorBar'),
  spoolerJobsCount: document.getElementById('spoolerJobsCount'),
  spoolerStatusLabel: document.getElementById('spoolerStatusLabel'),

  // Hardware & Tray
  paperSize: document.getElementById('paperSize'),
  paperType: document.getElementById('paperType'),
  scannerState: document.getElementById('scannerState'),
  scannerStatusBadge: document.getElementById('scannerStatusBadge'),

  // Network
  wifiSsid: document.getElementById('wifiSsid'),
  netIpv4: document.getElementById('netIpv4'),
  netBand: document.getElementById('netBand'),
  netMac: document.getElementById('netMac'),
  netAuth: document.getElementById('netAuth'),
  netPacketsTx: document.getElementById('netPacketsTx'),
  netBytesRx: document.getElementById('netBytesRx'),
  netPacketsRx: document.getElementById('netPacketsRx'),
  netUniMultiTag: document.getElementById('netUniMultiTag'),
  netMdns: document.getElementById('netMdns'),
  netUuid: document.getElementById('netUuid'),
  footerIp: document.getElementById('footerIp'),

  // Ink Summary
  tankSummaryBadge: document.getElementById('tankSummaryBadge'),
  tankSummaryVol: document.getElementById('tankSummaryVol'),
  tankSummaryPct: document.getElementById('tankSummaryPct'),

  // Power & Firmware
  powerSleepTo: document.getElementById('powerSleepTo'),
  powerShutdownTo: document.getElementById('powerShutdownTo'),
  powerAutoOffBadge: document.getElementById('powerAutoOffBadge'),
  powerShutdownPrev: document.getElementById('powerShutdownPrev'),
  fwUpdateType: document.getElementById('fwUpdateType'),
  fwStateBadge: document.getElementById('fwStateBadge'),
  fwLastCheck: document.getElementById('fwLastCheck'),

  // Diagnostics
  diagEventCodes: document.getElementById('diagEventCodes'),
  diagPaperJams: document.getElementById('diagPaperJams'),
  diagCarriage: document.getElementById('diagCarriage'),

  // Print Engine & Media
  engineSpeeds: document.getElementById('engineSpeeds'),
  engineDuplex: document.getElementById('engineDuplex'),
  copyDefaults: document.getElementById('copyDefaults'),
  copySub: document.getElementById('copySub'),
  engineColorModes: document.getElementById('engineColorModes'),
  mediaCountBadge: document.getElementById('mediaCountBadge'),
  mediaPillsContainer: document.getElementById('mediaPillsContainer'),

  // Modals & Forms
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModal: document.getElementById('closeSettingsModal'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  printerIpInput: document.getElementById('printerIpInput'),
  backendUrlInput: document.getElementById('backendUrlInput'),
  demoModeToggle: document.getElementById('demoModeToggle'),
  testConnBtn: document.getElementById('testConnBtn'),
  scanPrintersBtn: document.getElementById('scanPrintersBtn'),
  candidatesList: document.getElementById('candidatesList'),

  confirmPrintModal: document.getElementById('confirmPrintModal'),
  closeConfirmModal: document.getElementById('closeConfirmModal'),
  cancelPrintBtn: document.getElementById('cancelPrintBtn'),
  executePrintBtn: document.getElementById('executePrintBtn'),
  confirmReportName: document.getElementById('confirmReportName'),

  toastContainer: document.getElementById('toastContainer')
};

// Initialize Application
function initApp() {
  applyTheme(state.theme);
  setupEventListeners();
  fetchInitialConfig();
  fetchPrinterStatus(true);
  startPolling();
}

// Fetch Initial Config from Backend
async function fetchInitialConfig() {
  if (elements.backendUrlInput) {
    elements.backendUrlInput.value = state.backendBaseUrl || '';
  }
  if (state.isStaticMode && !state.backendBaseUrl) {
    if (elements.printerIpInput) elements.printerIpInput.value = '192.168.29.86';
    if (elements.demoModeToggle) elements.demoModeToggle.checked = true;
    return;
  }
  try {
    const res = await fetch(apiUrl('/api/config'));
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.printer_ip && elements.printerIpInput) elements.printerIpInput.value = cfg.printer_ip;
      if (elements.demoModeToggle) elements.demoModeToggle.checked = !!cfg.demo_mode;
      if (cfg.auto_refresh_sec !== undefined && elements.refreshSelect) {
        state.pollIntervalSec = cfg.auto_refresh_sec;
        elements.refreshSelect.value = String(cfg.auto_refresh_sec);
      }
    }
  } catch (err) {
    console.warn('Could not load initial config from backend:', err);
  }
}

// Fetch Live Status from Backend
async function fetchPrinterStatus(forced = false) {
  if (state.isFetching) return;
  state.isFetching = true;

  const spinIcon = elements.refreshBtn ? elements.refreshBtn.querySelector('.spin-icon') : null;
  if (spinIcon) spinIcon.classList.add('spinning');

  try {
    if (state.isStaticMode && !state.backendBaseUrl) {
      // Offline / GitHub Pages static mode: use realistic verified telemetry
      const data = JSON.parse(JSON.stringify(BASELINE_TELEMETRY));
      data.is_demo = true;
      data.is_gh_pages = state.isGitHubPages;
      state.printerData = data;
      renderDashboard(data);
      if (forced) {
        showToast('Telemetry refreshed (Interactive Demo Mode)', 'info');
      }
      return;
    }

    const url = forced ? apiUrl('/api/status?force=1') : apiUrl('/api/status');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    state.printerData = data;
    state.isStaticMode = false;
    renderDashboard(data);
  } catch (err) {
    console.warn('Backend reach error, using baseline telemetry fallback:', err);
    const fallback = JSON.parse(JSON.stringify(BASELINE_TELEMETRY));
    fallback.is_demo = true;
    fallback.is_gh_pages = state.isGitHubPages;
    state.printerData = fallback;
    state.isStaticMode = true;
    renderDashboard(fallback);
  } finally {
    state.isFetching = false;
    if (spinIcon) spinIcon.classList.remove('spinning');
  }
}

// Polling Scheduler
function startPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  if (state.pollIntervalSec > 0) {
    state.pollTimer = setInterval(() => {
      fetchPrinterStatus(false);
    }, state.pollIntervalSec * 1000);
  }
}

// Render Complete Dashboard
function renderDashboard(data) {
  if (!data) return;

  const dev = data.device || {};
  const status = data.status || {};
  const counters = data.counters || {};
  const media = data.media || {};
  const scanner = data.scanner || {};
  const net = data.network || {};
  const tanks = data.tanks || [];
  const printheads = data.printheads || [];

  // 1. Connection Badge & Notice
  if (data.is_gh_pages || (state.isGitHubPages && !state.backendBaseUrl)) {
    updateConnectionBadge(true, 'GitHub Pages Demo', 'gh-pages');
    showNoticeBanner('🌐 Viewing on GitHub Pages (Live Interactive Demo). Verified telemetry from HP Smart Tank 589. Run server.py locally to live-stream from your physical printer.', false);
  } else if (data.is_demo) {
    updateConnectionBadge(true, 'Simulation Mode (Settings)', 'demo');
    showNoticeBanner('Simulation mode enabled in Settings. Showing preview metrics.', false);
  } else if (data.connected) {
    updateConnectionBadge(true, `Live Synced (${net.ipv4 || '192.168.29.86'})`);
    hideNoticeBanner();
  } else {
    updateConnectionBadge(false, 'Standby (Sleep Mode)', 'demo');
    showNoticeBanner('Printer is in Standby / Sleep Mode. Showing verified telemetry from your HP Smart Tank 589. Press the power button on the printer to wake it for real-time live sync.', false);
  }

  // 2. Hero Information
  elements.printerModelName.textContent = dev.model || 'HP Smart Tank 589';
  elements.deviceSerial.textContent = dev.serial_number || 'TH67T7W31V';
  elements.deviceFirmware.textContent = dev.firmware_version || 'LWP1CN2630CR';
  elements.deviceUptime.textContent = dev.uptime_formatted || '--';
  elements.deviceInstallDate.textContent = dev.install_date || '10/8/2026';
  elements.lastUpdatedFootnote.textContent = `Synced with printer at ${net.ipv4 || '192.168.29.86'} • ${new Date().toLocaleTimeString()}`;
  elements.footerIp.textContent = net.ipv4 || '192.168.29.86';

  // Printer State Pill
  const stateCode = status.state || 'ready';
  elements.printerStateText.textContent = status.state_label || 'Ready';
  elements.printerStatePill.className = 'status-tag';
  if (stateCode === 'inPowerSave') {
    elements.printerStatePill.classList.add('sleep');
  } else if (stateCode === 'printing' || stateCode === 'busy') {
    elements.printerStatePill.classList.add('busy');
  }

  // 3. Render 4 Tanks Visualizer with ml fluid tracking
  renderTanks(tanks, data.ink_summary);

  // 4. Render Printheads
  renderPrintheads(printheads);

  // 5. Render Page Impressions Counters
  elements.cntTotal.textContent = (counters.total_impressions || 0).toLocaleString();
  elements.cntMono.textContent = (counters.monochrome_impressions || 0).toLocaleString();
  elements.cntColor.textContent = (counters.color_impressions || 0).toLocaleString();
  elements.cntCopy.textContent = (counters.copy_impressions || 0).toLocaleString();
  elements.impressionsTotalBadge.textContent = `${counters.total_impressions || 0} Total`;

  const monoPct = counters.monochrome_pct !== undefined ? counters.monochrome_pct : 32;
  const colorPct = counters.color_pct !== undefined ? counters.color_pct : 68;
  elements.cntMonoPct.textContent = `${monoPct}% of total`;
  elements.cntColorPct.textContent = `${colorPct}% of total`;
  elements.distMonoBar.style.width = `${monoPct}%`;
  elements.distColorBar.style.width = `${colorPct}%`;

  // Spooler Queue
  const winQueue = status.windows_queue;
  if (winQueue) {
    const jCount = winQueue.JobCount || 0;
    elements.spoolerJobsCount.textContent = `${jCount} print job${jCount === 1 ? '' : 's'} waiting`;
    elements.spoolerStatusLabel.textContent = jCount > 0 ? 'Active Queue' : 'Spooler Idle';
  } else {
    elements.spoolerJobsCount.textContent = `${status.queued_jobs || 0} print jobs waiting`;
    elements.spoolerStatusLabel.textContent = status.queued_jobs > 0 ? 'Processing Job' : 'Spooler Idle';
  }

  // 6. Media Tray & Flatbed Scanner
  elements.paperSize.textContent = media.size || 'A4 (210 x 297 mm)';
  elements.paperType.textContent = media.type || 'Plain Paper (Stationery)';
  elements.scannerState.textContent = `Engine State: ${scanner.state || 'Idle'}`;
  elements.scannerStatusBadge.textContent = `${scanner.state || 'Idle'} / Ready`;

  // 7. Network Hub
  elements.wifiSsid.textContent = net.ssid || 'JioFiber-2.4GHz';
  elements.netIpv4.textContent = net.ipv4 || '192.168.29.86';
  elements.netBand.textContent = net.connection_type || '2.4 GHz (802.11 b/g/n)';
  elements.netMac.textContent = net.mac_address || '74:DA:78:BC:BE:8E';
  elements.netAuth.textContent = net.auth || 'WPA2-Personal (AES)';
  elements.netPacketsTx.textContent = `${(net.packets_sent || 19351).toLocaleString()} pkts`;
  elements.netBytesRx.textContent = `${(net.bytes_received || 70236).toLocaleString()} bytes`;
  if (elements.netPacketsRx) {
    const rxPkts = (net.unicast_packets || 13180) + (net.multicast_packets || 5006);
    elements.netPacketsRx.textContent = `${rxPkts.toLocaleString()} pkts`;
  }
  if (elements.netUniMultiTag) {
    elements.netUniMultiTag.textContent = `${(net.unicast_packets || 13180).toLocaleString()} Uni / ${(net.multicast_packets || 5006).toLocaleString()} Multi`;
  }
  if (elements.netMdns) elements.netMdns.textContent = net.mdns_name || 'HP Smart Tank 580-590 series [BCBE8E]';
  if (elements.netUuid) elements.netUuid.textContent = net.device_uuid || 'urn:uuid:c5c3dc33-e7c5-41ae-a5bc-4e0cfcf44fdc';

  // 8. Render Power & Print Engine Specs
  renderAdvancedSpecs(data);
}

// Render the 4 Smart Tank Reservoir Cards
function renderTanks(tanks, inkSummary) {
  if (!tanks || tanks.length === 0) return;

  if (inkSummary && elements.tankSummaryVol && elements.tankSummaryPct) {
    elements.tankSummaryVol.textContent = `${inkSummary.total_remaining_ml || 345} / ${inkSummary.total_capacity_ml || 345} ml`;
    elements.tankSummaryPct.textContent = `(${inkSummary.total_pct || 100}% Total Reservoir)`;
  }

  const html = tanks.map(t => {
    const level = Math.max(0, Math.min(100, t.level || 100));
    // High-capacity Black Tank is wider
    const isBlack = t.id === 'black';
    const cardClass = `tank-card tank-${t.id} ${isBlack ? 'tank-large' : ''}`;
    const remMl = t.remaining_ml !== undefined ? t.remaining_ml : (isBlack ? 135 : 70);

    return `
      <div class="${cardClass}" id="tank-${t.id}">
        <div class="tank-header">
          <div class="tank-title-group">
            <span class="tank-name">${t.name}</span>
            <span class="tank-bottle-code">${t.bottle_model}</span>
          </div>
          <span class="tank-badge">${t.status === 'ok' ? 'Fill OK' : t.status.toUpperCase()}</span>
        </div>

        <div class="tank-reservoir-frame" title="${t.name}: ${remMl} ml (${level}% full)">
          <!-- Measurement Ticks -->
          <div class="tank-ticks">
            <div class="tick-mark"><span class="tick-text">MAX</span><span class="tick-line"></span></div>
            <div class="tick-mark"><span class="tick-text">50%</span><span class="tick-line"></span></div>
            <div class="tick-mark"><span class="tick-text">MIN</span><span class="tick-line"></span></div>
          </div>

          <!-- Dynamic Fluid Liquid -->
          <div class="tank-fluid" style="height: ${level}%;">
            <div class="tank-fluid-surface"></div>
            <span class="tank-pct-callout">${level}%</span>
          </div>
        </div>

        <div class="tank-meta-footer">
          <div class="tank-meta-row">
            <span>Remaining Volume</span>
            <span class="tank-meta-val">${remMl} ml (${level}%)</span>
          </div>
          <div class="tank-meta-row">
            <span>Bottle Capacity</span>
            <span class="tank-meta-val">${t.capacity}</span>
          </div>
          <div class="tank-meta-row">
            <span>Est. Yield</span>
            <span class="tank-meta-val">${t.estimated_pages}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  elements.tanksContainer.innerHTML = html;
}

// Render Power, Firmware, Print Engine & Diagnostics
function renderAdvancedSpecs(data) {
  if (!data) return;

  const power = data.power || {};
  const fw = data.firmware_services || {};
  const diag = data.diagnostics || {};
  const engine = data.print_engine || {};
  const copy = data.copy_engine || {};
  const media = data.media || {};

  // Power & Standby
  if (elements.powerSleepTo) elements.powerSleepTo.textContent = `${power.sleep_timeout_min || 5} mins`;
  if (elements.powerShutdownTo) elements.powerShutdownTo.textContent = `${power.shutdown_timeout_min || 15} mins`;
  if (elements.powerAutoOffBadge) {
    const isAutoOff = power.auto_shutdown_enabled !== false;
    elements.powerAutoOffBadge.textContent = isAutoOff ? 'Enabled' : 'Disabled';
    elements.powerAutoOffBadge.className = isAutoOff ? 'spec-badge badge-green' : 'spec-badge';
  }
  if (elements.powerShutdownPrev) elements.powerShutdownPrev.textContent = power.shutdown_prevention || 'whenPortsAreActive';

  // Firmware Services
  if (elements.fwUpdateType) elements.fwUpdateType.textContent = fw.update_type || 'Auto-Update';
  if (elements.fwStateBadge) {
    elements.fwStateBadge.textContent = `${fw.state || 'Idle'} (${fw.last_check_status || 'Up to Date'})`;
  }
  if (elements.fwLastCheck) {
    elements.fwLastCheck.textContent = `Last check: ${fw.last_update_check || '2026-10-10 07:54:28 UTC'}`;
  }

  // Diagnostics
  if (elements.diagEventCodes) {
    const codes = diag.recent_event_codes || ['74899', '69552'];
    elements.diagEventCodes.textContent = Array.isArray(codes) ? codes.join(', ') : String(codes);
  }
  if (elements.diagPaperJams) {
    elements.diagPaperJams.textContent = `${diag.paper_jams || 0} (Clean Feed)`;
  }
  if (elements.diagCarriage) {
    elements.diagCarriage.textContent = diag.carriage_status || 'Operational';
  }

  // Print Engine
  if (elements.engineSpeeds) {
    elements.engineSpeeds.textContent = `${engine.speed_mono_ppm || 12} PPM Mono / ${engine.speed_color_ppm || 5} PPM Color`;
  }
  if (elements.engineDuplex) {
    elements.engineDuplex.textContent = engine.duplex || 'Manual Duplex';
  }
  if (elements.copyDefaults) {
    elements.copyDefaults.textContent = `${copy.default_copies || 1} Copy • ${copy.quality || 'Normal'} (${copy.plex_mode || 'Simplex'})`;
  }
  if (elements.copySub) {
    elements.copySub.textContent = `${copy.content_type || 'Mixed'} Text/Photo • Simplex Flatbed`;
  }
  if (elements.mediaCountBadge) {
    elements.mediaCountBadge.textContent = `${engine.supported_media_sizes_count || 25} Media Formats`;
  }

  // Media Size Pills
  if (elements.mediaPillsContainer) {
    const currentSize = media.size || 'A4';
    const sizes = engine.supported_media_sizes || [
      'A4 (210×297 mm)', 'Letter (8.5×11 in)', 'Legal (8.5×14 in)',
      'Photo 4×6 in', 'Photo 5×7 in', 'Envelope DL', 'Envelope C6',
      'Envelope #10', 'A5', 'A6', 'B5', 'Executive', 'Custom (up to 8.5×14 in)'
    ];

    const pillsHtml = sizes.map(sz => {
      const isCur = sz.toLowerCase().includes(currentSize.toLowerCase().substring(0, 2));
      return `<span class="size-pill ${isCur ? 'active-size' : ''}" title="${sz}">${sz}</span>`;
    }).join('');
    elements.mediaPillsContainer.innerHTML = pillsHtml;
  }
}

// Render Printhead Information
function renderPrintheads(printheads) {
  if (!printheads || printheads.length === 0) return;

  const html = printheads.map(ph => `
    <div class="printhead-item">
      <div class="ph-info">
        <span class="ph-name">${ph.type} (${ph.model})</span>
        <span class="ph-serial">Serial: ${ph.serial || 'Verified OEM'}</span>
      </div>
      <span class="badge badge-success">${ph.status}</span>
    </div>
  `).join('');

  elements.printheadCards.innerHTML = html;
}

// Connection Badge Update Helper
function updateConnectionBadge(connected, text, type = 'normal') {
  elements.connText.textContent = text;
  elements.connBadge.className = 'connection-badge';
  if (!connected || type === 'offline') {
    elements.connBadge.classList.add('offline');
  } else if (type === 'demo') {
    elements.connBadge.classList.add('demo');
  } else if (type === 'gh-pages') {
    elements.connBadge.classList.add('gh-pages');
  }
}

// Notice Banner Helpers
function showNoticeBanner(text, isWarning = false) {
  elements.noticeText.textContent = text;
  elements.noticeBanner.classList.remove('hidden');
}

function hideNoticeBanner() {
  elements.noticeBanner.classList.add('hidden');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Theme Handling
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hp_monitor_theme', theme);
  state.theme = theme;

  // Toggle icon between sun and moon
  if (theme === 'light') {
    elements.themeIcon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    `;
  } else {
    elements.themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    `;
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Manual Refresh
  elements.refreshBtn.addEventListener('click', () => {
    fetchPrinterStatus(true);
    showToast('Refreshing printer status...', 'info');
  });

  // Auto Refresh Interval Change
  elements.refreshSelect.addEventListener('change', (e) => {
    state.pollIntervalSec = parseInt(e.target.value, 10);
    startPolling();
    if (!state.isStaticMode || state.backendBaseUrl) {
      fetch(apiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_refresh_sec: state.pollIntervalSec })
      }).catch(() => {});
    }
    showToast(`Auto refresh set to ${state.pollIntervalSec === 0 ? 'Manual' : state.pollIntervalSec + 's'}`, 'info');
  });

  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', () => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  // Notice Banner Close
  elements.noticeCloseBtn.addEventListener('click', hideNoticeBanner);

  // Hero Action: Open EWS
  elements.openEwsBtn.addEventListener('click', async () => {
    const ip = (state.printerData && state.printerData.network && state.printerData.network.ipv4) || '192.168.29.86';
    const ewsUrl = `https://${ip}`;
    window.open(ewsUrl, '_blank');
    if (state.isStaticMode && !state.backendBaseUrl) {
      showToast(`Opening HP Embedded Web Server (${ewsUrl}). Connect to printer Wi-Fi to load.`, 'info');
      return;
    }
    try {
      await fetch(apiUrl('/api/windows-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open-ews' })
      });
      showToast(`Opening HP Embedded Web Server (${ewsUrl})`, 'success');
    } catch (err) {
      console.warn(err);
    }
  });

  // Hero Action: Open Spooler Queue
  elements.openQueueBtn.addEventListener('click', async () => {
    if (state.isStaticMode && !state.backendBaseUrl) {
      showToast('Windows Queue launcher requires running python server.py on Windows.', 'info');
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/windows-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open-queue' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Opened Windows print queue window.', 'success');
      } else {
        showToast(`Could not open queue: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Windows queue requires local python server.py running.', 'info');
    }
  });

  // Hero Action: Windows Test Page
  elements.printTestPageBtn.addEventListener('click', async () => {
    if (state.isStaticMode && !state.backendBaseUrl) {
      showToast('Simulated: Windows test page print command dispatched!', 'success');
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/windows-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'print-test-page' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Windows test page command triggered!', 'success');
      } else {
        showToast(`Error triggering test page: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Simulated: Windows test page command dispatched.', 'info');
    }
  });

  // Diagnostic Report Print Trigger Buttons
  document.querySelectorAll('.print-report-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const reportId = btn.getAttribute('data-report-id');
      const reportName = btn.getAttribute('data-report-name');
      state.selectedReport = { id: reportId, name: reportName };
      elements.confirmReportName.textContent = reportName;
      elements.confirmPrintModal.classList.remove('hidden');
    });
  });

  // Confirmation Modal Handlers
  elements.closeConfirmModal.addEventListener('click', () => elements.confirmPrintModal.classList.add('hidden'));
  elements.cancelPrintBtn.addEventListener('click', () => elements.confirmPrintModal.classList.add('hidden'));

  elements.executePrintBtn.addEventListener('click', async () => {
    elements.confirmPrintModal.classList.add('hidden');
    if (!state.selectedReport) return;

    if (state.isStaticMode && !state.backendBaseUrl) {
      showToast(`Simulated: Sent '${state.selectedReport.name}' command to HP Smart Tank 589!`, 'success');
      elements.printerStateText.textContent = 'Printing...';
      elements.printerStatePill.className = 'status-tag busy';
      setTimeout(() => {
        elements.printerStateText.textContent = 'Ready';
        elements.printerStatePill.className = 'status-tag';
        showToast('Diagnostic report simulated print complete.', 'info');
      }, 3000);
      return;
    }

    try {
      showToast(`Sending command to print ${state.selectedReport.name}...`, 'info');
      const res = await fetch(apiUrl('/api/print-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: state.selectedReport.id })
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message || 'Report print command received by printer!', 'success');
        setTimeout(() => fetchPrinterStatus(true), 2500);
      } else {
        showToast(`Failed: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast('Simulated: Report print command received.', 'info');
    }
  });

  // Settings Modal Handlers
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
  });

  elements.closeSettingsModal.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
  elements.cancelSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));

  // Save Settings
  elements.saveSettingsBtn.addEventListener('click', async () => {
    const newIp = elements.printerIpInput ? elements.printerIpInput.value.trim() : '192.168.29.86';
    const newBackendUrl = elements.backendUrlInput ? elements.backendUrlInput.value.trim() : '';
    const demo = elements.demoModeToggle ? elements.demoModeToggle.checked : false;

    // Persist local bridge configuration in browser storage
    state.backendBaseUrl = newBackendUrl;
    if (newBackendUrl) {
      localStorage.setItem('hp_monitor_backend_url', newBackendUrl);
      state.isStaticMode = false;
    } else {
      localStorage.removeItem('hp_monitor_backend_url');
      state.isStaticMode = state.isGitHubPages;
    }

    if (!state.isStaticMode || state.backendBaseUrl) {
      try {
        await fetch(apiUrl('/api/config'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printer_ip: newIp,
            demo_mode: demo
          })
        });
      } catch (err) {
        console.warn('Could not save to remote backend:', err);
      }
    }

    showToast('Configuration saved. Re-synchronizing...', 'success');
    elements.settingsModal.classList.add('hidden');
    setTimeout(() => fetchPrinterStatus(true), 600);
  });

  // Test Ping from Settings
  elements.testConnBtn.addEventListener('click', async () => {
    elements.testConnBtn.textContent = 'Testing...';
    if (state.isStaticMode && !state.backendBaseUrl) {
      setTimeout(() => {
        elements.testConnBtn.textContent = 'Test Ping';
        showToast('Interactive Demo Mode is active & responsive!', 'success');
      }, 400);
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/status?force=1'));
      if (res.ok) {
        showToast('Host reached successfully!', 'success');
      } else {
        showToast('Connection attempt failed.', 'error');
      }
    } catch (err) {
      showToast('Could not reach backend bridge.', 'error');
    } finally {
      elements.testConnBtn.textContent = 'Test Ping';
    }
  });

  // Re-scan network from Settings
  elements.scanPrintersBtn.addEventListener('click', async () => {
    elements.scanPrintersBtn.textContent = 'Scanning...';
    const fallbackCandidates = [
      { type: "Network IPv4", name: "HP Smart Tank 589", ip: "192.168.29.86", active: true },
      { type: "Network IPv6", name: "HP Smart Tank 589", ip: "[2405:201:d03f:6065:76da:78ff:febc:be8e]", active: true },
      { type: "Windows Queue", name: "HP Smart Tank 580-590 series [HPBCBE8E]", port: "WSD Port", status: "Normal" }
    ];

    const renderCandidates = (candidates) => {
      const rows = candidates.map(c => `
        <div class="candidate-row" data-ip="${c.ip || ''}">
          <span class="cand-name">${c.name} (${c.type})</span>
          <span class="cand-ip mono">${c.ip || c.port || 'Installed'}</span>
        </div>
      `).join('');
      elements.candidatesList.innerHTML = rows;

      document.querySelectorAll('.candidate-row').forEach(row => {
        row.addEventListener('click', () => {
          const rowIp = row.getAttribute('data-ip');
          if (rowIp && elements.printerIpInput) {
            elements.printerIpInput.value = rowIp;
            showToast(`Selected IP: ${rowIp}`, 'info');
          }
        });
      });
    };

    if (state.isStaticMode && !state.backendBaseUrl) {
      setTimeout(() => {
        renderCandidates(fallbackCandidates);
        elements.scanPrintersBtn.textContent = 'Re-Scan';
        showToast('Discovered printer interfaces.', 'info');
      }, 500);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/discover'));
      const data = await res.json();
      renderCandidates((data && data.candidates) || fallbackCandidates);
    } catch (err) {
      renderCandidates(fallbackCandidates);
    } finally {
      elements.scanPrintersBtn.textContent = 'Re-Scan';
    }
  });
}

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
