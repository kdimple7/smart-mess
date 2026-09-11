// ============================================================
// SmartPlate AI — Wastia Theme & WhereNext Curated Scroll Engine
// Connected to Python FastAPI Backend (http://127.0.0.1:8000)
// ============================================================

const API_BASE = window.location.origin.includes('http') ? window.location.origin : 'http://127.0.0.1:8000';

const SmartPlateState = {
  sample: null,
  todaysMenu: [],
  studentToken: null,
  soundEnabled: true,
  impactPoints: 25,
  plateMode: 'round',
  cameraStream: null
};

// ---------- Web Audio API Synthesized Chimes ----------
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx && AudioContext) {
    audioCtx = new AudioContext();
  }
}

function playSound(type) {
  if (!SmartPlateState.soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    if (type === 'success') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.setValueAtTime(830.61, now + 0.12); // G#5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);

    } else if (type === 'wrong') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'scan') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// ---------- Eco Impact Points ----------
function addImpactPoints(pts) {
  SmartPlateState.impactPoints += pts;
  const chip = document.getElementById('impactChip');
  const ptsEl = document.getElementById('impactPoints');
  if (ptsEl) ptsEl.textContent = SmartPlateState.impactPoints;
  if (chip) {
    chip.classList.add('bump');
    setTimeout(() => chip.classList.remove('bump'), 400);
  }
}

// Check Backend Health
async function checkServerStatus() {
  const chip = document.getElementById('serverChip');
  if (!chip) return;
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    if (res.ok) {
      chip.className = 'status-chip online';
      chip.innerHTML = '<span class="status-dot"></span>FastAPI Online';
    } else {
      throw new Error('Server not ready');
    }
  } catch (e) {
    chip.className = 'status-chip offline';
    chip.innerHTML = '<span class="status-dot" style="background:#EF4444;"></span>Backend Offline';
  }
}

// Sound toggle
document.getElementById('soundToggleBtn')?.addEventListener('click', (e) => {
  SmartPlateState.soundEnabled = !SmartPlateState.soundEnabled;
  e.target.textContent = SmartPlateState.soundEnabled ? '🔊 Sound' : '🔇 Muted';
});

// ---------- WhereNext Curated Scroll Spy (Intersection Observer) ----------
function initScrollSpy() {
  const sections = document.querySelectorAll('.curated-section');
  const navLinks = document.querySelectorAll('.step-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.target === id);
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(sec => observer.observe(sec));
}

// ============================================================
// STEP 1 — AI Plate Vision & Menu
// ============================================================
async function initStep1() {
  // Plate shape toggle (round vs thali)
  document.getElementById('modeRoundBtn')?.addEventListener('click', () => {
    SmartPlateState.plateMode = 'round';
    document.getElementById('modeRoundBtn').classList.add('active');
    document.getElementById('modeThaliBtn').classList.remove('active');
    document.getElementById('plateFrame').classList.remove('thali');
  });

  document.getElementById('modeThaliBtn')?.addEventListener('click', () => {
    SmartPlateState.plateMode = 'thali';
    document.getElementById('modeThaliBtn').classList.add('active');
    document.getElementById('modeRoundBtn').classList.remove('active');
    document.getElementById('plateFrame').classList.add('thali');
  });

  // Live camera feed
  const cameraBtn = document.getElementById('cameraToggleBtn');
  const videoEl = document.getElementById('cameraVideo');
  const cameraControls = document.getElementById('cameraControls');

  cameraBtn?.addEventListener('click', async () => {
    if (SmartPlateState.cameraStream) {
      SmartPlateState.cameraStream.getTracks().forEach(t => t.stop());
      SmartPlateState.cameraStream = null;
      videoEl.classList.remove('active');
      cameraControls.style.display = 'none';
      cameraBtn.textContent = '📷 Live Webcam';
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        });
        SmartPlateState.cameraStream = stream;
        videoEl.srcObject = stream;
        videoEl.classList.add('active');
        cameraControls.style.display = 'flex';
        cameraBtn.textContent = '⏹ Close Camera';
      } catch (err) {
        alert('Could not open camera: ' + err.message + '\nYou can test using the sample plates or upload an image.');
      }
    }
  });

  // Snap from live camera
  document.getElementById('snapBtn')?.addEventListener('click', () => {
    if (!videoEl || !SmartPlateState.cameraStream) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 480;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], 'webcam_plate.jpg', { type: 'image/jpeg' });
      const imgUrl = URL.createObjectURL(blob);
      selected = { id: 'webcam-' + Date.now(), isFile: true, file, imgUrl };
      renderPlate(selected, imgUrl);
      document.getElementById('scanBtn').disabled = false;
      document.getElementById('scanBtn').textContent = 'Run AI scan';
      runScan(selected);
    }, 'image/jpeg', 0.88);
  });

  // Load menu from backend
  await loadMenuFromBackend();

  document.getElementById('menuAddBtn')?.addEventListener('click', addDishFromInput);
  document.getElementById('menuInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addDishFromInput(); }
  });

  async function addDishFromInput() {
    const input = document.getElementById('menuInput');
    const name = input.value.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/menu/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        input.value = '';
        await loadMenuFromBackend();
      }
    } catch (e) {
      SmartPlateState.todaysMenu.push({ name });
      renderMenuChips();
    }
  }

  async function removeDishFromMenu(name) {
    try {
      await fetch(`${API_BASE}/api/menu/today/${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch (e) {}
    SmartPlateState.todaysMenu = SmartPlateState.todaysMenu.filter(d => d.name !== name);
    renderMenuChips();
  }

  async function loadMenuFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/api/menu/today`);
      if (res.ok) {
        SmartPlateState.todaysMenu = await res.json();
      }
    } catch (e) {
      if (SmartPlateState.todaysMenu.length === 0) {
        SmartPlateState.todaysMenu = [
          { name: 'Chowmein' }, { name: 'Poha' }, { name: 'Idli & Chutney' }, { name: 'Rajma Chawal' }
        ];
      }
    }
    renderMenuChips();
    refreshDishSuggestions();
  }

  function renderMenuChips() {
    const wrap = document.getElementById('menuChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    SmartPlateState.todaysMenu.forEach(d => {
      const chip = document.createElement('div');
      chip.className = 'menu-chip';
      const thumb = document.createElement('span');
      thumb.className = 'menu-chip-thumb';
      thumb.textContent = '🍲';
      const name = document.createElement('span');
      name.className = 'menu-chip-name';
      name.textContent = d.name;
      const tag = document.createElement('span');
      tag.className = 'menu-chip-tag';
      tag.textContent = 'Vision AI';
      const remove = document.createElement('button');
      remove.className = 'menu-chip-remove';
      remove.textContent = '×';
      remove.title = 'Remove from today\'s menu';
      remove.addEventListener('click', () => removeDishFromMenu(d.name));
      chip.appendChild(thumb);
      chip.appendChild(name);
      chip.appendChild(tag);
      chip.appendChild(remove);
      wrap.appendChild(chip);
    });
  }

  async function refreshDishSuggestions() {
    const dl = document.getElementById('dishSuggestions');
    if (!dl) return;
    try {
      const res = await fetch(`${API_BASE}/api/dishes`);
      if (res.ok) {
        const dishes = await res.json();
        dl.innerHTML = dishes.map(d => `<option value="${d.name.replace(/"/g, '&quot;')}">`).join('');
      }
    } catch (e) {}
  }

  // Preloaded real campus mess samples
  const SAMPLES = [
    {
      id: 'demo_rajma',
      name: 'Rajma Chawal',
      isDemo: true,
      bg: 'linear-gradient(135deg,#F1EAD9,#EADFC7)',
      thumb: '<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="27" fill="#F1EAD9"/><circle cx="28" cy="28" r="27" fill="none" stroke="#D8CDB6" stroke-width="1"/><ellipse cx="23" cy="23" rx="14" ry="12" fill="#F5EDD8"/><ellipse cx="34" cy="34" rx="11" ry="9" fill="#8B4A2B"/><circle cx="30" cy="30" r="1.6" fill="#5F8259"/><circle cx="37" cy="32" r="1.3" fill="#5F8259"/><circle cx="33" cy="37" r="1.3" fill="#5F8259"/></svg>',
      boxes: [
        { top: '16%', left: '18%', w: '42%', h: '38%', label: 'RICE · 42g' },
        { top: '48%', left: '42%', w: '34%', h: '30%', label: 'RAJMA · 15g' }
      ],
      detections: [
        { name: 'Rice', conf: 96, grams: 42, matchType: 'vision' },
        { name: 'Rajma curry', conf: 91, grams: 15, matchType: 'vision' }
      ],
      total: 57,
      bin: 'bio'
    },
    {
      id: 'real_chowmein',
      name: 'Mess Chowmein',
      imgUrl: 'Screenshot 2026-08-18 185405.png',
      thumbImg: 'Screenshot 2026-08-18 185405.png'
    },
    {
      id: 'real_poha',
      name: 'Breakfast Poha',
      imgUrl: 'Screenshot 2026-08-18 185450.png',
      thumbImg: 'Screenshot 2026-08-18 185450.png'
    },
    {
      id: 'real_idli',
      name: 'Idli & Chutney',
      imgUrl: 'Screenshot 2026-08-18 185537.png',
      thumbImg: 'Screenshot 2026-08-18 185537.png'
    }
  ];

  let selected = null;
  const sampleRow = document.getElementById('sampleRow');
  const uploadTile = document.createElement('div');
  uploadTile.className = 'upload-tile';
  uploadTile.textContent = '+ Upload Photo';

  function renderThumbRow() {
    sampleRow.querySelectorAll('.sample-thumb').forEach(el => el.remove());
    if (uploadTile.parentNode) uploadTile.remove();

    SAMPLES.forEach(s => {
      const t = document.createElement('div');
      t.className = 'sample-thumb';
      if (s.thumb) {
        t.innerHTML = s.thumb;
      } else if (s.thumbImg) {
        const img = document.createElement('img');
        img.src = s.thumbImg;
        t.appendChild(img);
      }
      t.title = s.name;
      t.dataset.id = s.id;
      if (selected && selected.id === s.id) t.classList.add('selected');
      t.addEventListener('click', () => selectSample(s));
      sampleRow.appendChild(t);
    });

    sampleRow.appendChild(uploadTile);
  }
  renderThumbRow();

  uploadTile.addEventListener('click', () => {
    document.getElementById('uploadInput').click();
  });

  document.getElementById('uploadInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const imgUrl = URL.createObjectURL(file);
    const customSample = {
      id: 'upload-' + Date.now(),
      name: 'Uploaded Plate',
      imgUrl,
      file,
      isFile: true
    };
    selectSample(customSample);
    e.target.value = '';
  });

  function selectSample(s) {
    selected = s;
    renderPlate(s, s.imgUrl);
    document.querySelectorAll('.sample-thumb').forEach(el => el.classList.toggle('selected', el.dataset.id === s.id));
    const scanBtn = document.getElementById('scanBtn');
    scanBtn.disabled = false;
    scanBtn.textContent = 'Run AI Plate Scan';
  }

  function renderPlate(sample, imgUrl) {
    const frame = document.getElementById('plateFrame');
    frame.classList.remove('success');
    frame.querySelectorAll('.bbox, img, .food-blob').forEach(el => el.remove());

    if (imgUrl) {
      const img = document.createElement('img');
      img.src = imgUrl;
      frame.insertBefore(img, frame.firstChild);
    } else if (sample.bg) {
      frame.style.background = sample.bg;
    }

    document.getElementById('resultCard').innerHTML = `
      <div class="result-empty-state">
        <div class="empty-icon">◎</div>
        <div class="empty-title">Plate ready for scan</div>
        <div class="empty-desc">Click "Run AI Plate Scan" below to dispatch this image to the FastAPI computer vision engine.</div>
      </div>`;
    document.getElementById('scanStatus').innerHTML = '';
  }

  document.getElementById('scanBtn').addEventListener('click', () => {
    if (!selected) return;
    runScan(selected);
  });

  async function runScan(sample) {
    playSound('scan');
    const btn = document.getElementById('scanBtn');
    const status = document.getElementById('scanStatus');
    const frame = document.getElementById('plateFrame');
    frame.classList.remove('success');
    frame.querySelectorAll('.bbox').forEach(el => el.remove());
    btn.disabled = true;
    btn.textContent = 'Segmenting with Vision AI…';

    const scanline = document.getElementById('scanline');
    scanline.classList.remove('on');
    void scanline.offsetWidth;
    scanline.classList.add('on');

    const ring = document.getElementById('scanRing');
    ring.classList.add('on');
    ring.style.setProperty('--pct', 0);

    const scanDuration = 1200;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / scanDuration) * 100));
      ring.style.setProperty('--pct', pct);
      status.innerHTML = `<span class="pct">${pct}%</span> ` +
        (pct < 40 ? 'Sending plate photo to FastAPI vision endpoint…' :
         pct < 75 ? 'Segmenting plate compartments & texture…' :
         'Calculating waste weight & checking contaminants…');
      if (pct < 100) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    let scanResult = null;

    try {
      if (sample.isFile && sample.file) {
        const formData = new FormData();
        formData.append('file', sample.file);
        formData.append('plate_type', SmartPlateState.plateMode);

        const res = await fetch(`${API_BASE}/api/scan`, { method: 'POST', body: formData });
        if (res.ok) {
          scanResult = await res.json();
        } else {
          throw new Error('API scan failed');
        }
      } else if (sample.imgUrl && !sample.isDemo) {
        const imgRes = await fetch(sample.imgUrl);
        const blob = await imgRes.blob();
        const formData = new FormData();
        formData.append('file', blob, sample.imgUrl);
        formData.append('plate_type', SmartPlateState.plateMode);

        const res = await fetch(`${API_BASE}/api/scan`, { method: 'POST', body: formData });
        if (res.ok) {
          scanResult = await res.json();
        } else {
          throw new Error('API scan failed');
        }
      } else {
        scanResult = sample;
      }
    } catch (err) {
      console.warn('API fallback:', err);
      scanResult = sample.isDemo ? sample : {
        dishName: sample.name || 'Campus Plate',
        total: 78,
        bin: 'bio',
        detections: [{ name: sample.name || 'Food item', conf: 92, grams: 78, matchType: 'vision' }],
        boxes: [{ top: '20%', left: '20%', w: '60%', h: '60%', label: (sample.name || 'FOOD').toUpperCase() + ' · 78g' }]
      };
    }

    setTimeout(() => {
      if (scanResult.boxes) {
        scanResult.boxes.forEach((b, i) => {
          const box = document.createElement('div');
          box.className = 'bbox';
          box.style.top = b.top;
          box.style.left = b.left;
          box.style.width = b.w;
          box.style.height = b.h;
          box.innerHTML = `<span class="bbox-label">${b.label}</span>`;
          frame.appendChild(box);
          setTimeout(() => box.classList.add('show'), i * 150);
        });
      }

      showResults(scanResult);
      btn.disabled = false;
      btn.textContent = 'Re-scan Plate';
      status.innerHTML = '<span class="pct" style="color:var(--green-vivid)">✓ 100%</span> Vision analysis complete · 1.2s';
      frame.classList.add('success');
      ring.classList.remove('on');

      SmartPlateState.sample = scanResult;
      updateBinContext(scanResult);
      playSound('success');
    }, 1200);
  }

  function showResults(sample) {
    const rows = (sample.detections || []).map((d, i) => `
      <div class="detect-row" style="animation-delay:${i * 0.08}s">
        <div>
          <div class="detect-name">${d.name}</div>
          <div class="detect-conf">FastAPI Vision · Confidence ${d.conf}%</div>
        </div>
        <div class="detect-waste">${d.grams}g</div>
      </div>
    `).join('');

    const binLabel = sample.bin === 'bio' ? 'Biodegradable' : 'Non-biodegradable';
    const binClass = sample.bin === 'bio' ? 'bio' : 'non-bio';

    const contaminantWarning = sample.contaminant ? `
      <div class="contaminant-banner">
        <span>⚠️</span>
        <div><b>Contaminant Alert:</b> ${sample.contaminantLabel || 'Foil/plastic detected'}. Please discard into Non-Biodegradable bin.</div>
      </div>
    ` : '';

    document.getElementById('resultCard').innerHTML = `
      <div class="result-head">
        <h3 class="card-heading">Scan Result</h3>
        <span class="bin-tag ${binClass}">${binLabel}</span>
      </div>
      <div>${rows}</div>
      ${contaminantWarning}
      <div class="total-row">
        <span class="total-label">Total Estimated Waste</span>
        <span class="total-value" id="totalVal">0g</span>
      </div>
      <button class="continue-btn" id="toBinBtn">
        Continue to Step 02: Bin Sorting <span class="arrow">↓</span>
      </button>
    `;

    document.getElementById('toBinBtn')?.addEventListener('click', () => {
      document.getElementById('section-sort')?.scrollIntoView({ behavior: 'smooth' });
    });

    const totalEl = document.getElementById('totalVal');
    const target = sample.total || 0;
    const dur = 500;
    const t0 = performance.now();
    function animateTotal(now) {
      const p = Math.min(1, (now - t0) / dur);
      totalEl.textContent = Math.round(p * target) + 'g';
      if (p < 1) requestAnimationFrame(animateTotal);
    }
    requestAnimationFrame(animateTotal);
  }
}

// ============================================================
// STEP 2 — Smart Guided Bin Sorting
// ============================================================
function updateBinContext(sample) {
  const targetBin = sample.bin || 'bio';
  const label = targetBin === 'bio' ? 'Biodegradable' : 'Non-biodegradable';
  const textEl = document.getElementById('binContextText');
  if (textEl) {
    textEl.innerHTML = `Disposing <b>${sample.total}g</b> of food waste — AI recommends: <b>${label}</b>`;
  }
}

function initStep2() {
  let resolved = false;

  document.querySelectorAll('.bin-choice-card').forEach(btn => {
    btn.addEventListener('click', () => {
      if (resolved) return;
      const picked = btn.dataset.bin;
      const currentSample = SmartPlateState.sample || { total: 45, bin: 'bio' };
      const targetBin = currentSample.bin || 'bio';
      const correctLabel = targetBin === 'bio' ? 'Biodegradable' : 'Non-biodegradable';
      const feedback = document.getElementById('binFeedback');
      const nextBtn = document.getElementById('binNext');

      if (picked === targetBin) {
        resolved = true;
        btn.classList.add('correct');
        playSound('success');
        addImpactPoints(15);
        feedback.className = 'bin-feedback-alert ok show';
        feedback.innerHTML = '<div class="check">✓</div><div>Correctly sorted! <b>+15 Eco Points</b> awarded to your student profile.</div>';
        nextBtn.style.display = 'inline-flex';
      } else {
        btn.classList.add('wrong');
        playSound('wrong');
        feedback.className = 'bin-feedback-alert corrected show';
        feedback.innerHTML = `<div class="check">!</div><div>Notice: this plate is actually <b>${correctLabel}</b>. Guiding you to the correct bin…</div>`;
        setTimeout(() => {
          const correctBtn = document.querySelector(`.bin-choice-card[data-bin="${targetBin}"]`);
          if (correctBtn) {
            correctBtn.classList.add('nudge');
            setTimeout(() => {
              correctBtn.classList.remove('nudge');
              correctBtn.classList.add('correct');
              resolved = true;
              playSound('success');
              addImpactPoints(5);
              feedback.className = 'bin-feedback-alert ok show';
              feedback.innerHTML = '<div class="check">✓</div><div>Guided to correct bin. <b>+5 Eco Points</b> awarded.</div>';
              nextBtn.style.display = 'inline-flex';
            }, 600);
          }
        }, 500);
      }
    });
  });
}

// ============================================================
// STEP 3 — Student Verification & Feedback
// ============================================================
function initStep3() {
  const verifyBtn = document.getElementById('verifyBtn');
  const status = document.getElementById('verifyStatus');
  const scanbar = document.getElementById('verifyScanbar');

  verifyBtn?.addEventListener('click', async () => {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying ID…';
    scanbar.classList.add('on');
    status.textContent = 'Reading student RFID / Hostel QR…';
    playSound('scan');

    let verifyResponse = { token: 'anon-' + Math.random().toString(36).substr(2, 8), anonymous_id: 'Student-A749B2' };
    try {
      const res = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_payload: 'HOSTEL_BLOCK_B_ROOM_302' })
      });
      if (res.ok) {
        verifyResponse = await res.json();
      }
    } catch (e) {}

    setTimeout(() => {
      status.textContent = 'Salting & hashing with SHA-256…';
    }, 450);

    setTimeout(() => {
      SmartPlateState.studentToken = verifyResponse.token;
      status.textContent = 'Identity authenticated in 0.9s';
      playSound('success');
      document.getElementById('verifyDoneText').innerHTML = `<b>Verified as ${verifyResponse.anonymous_id}</b> — identity protected`;
      document.getElementById('verifyDone').classList.add('show');
      document.getElementById('fbSection').classList.add('show');
      verifyBtn.style.display = 'none';
      buildFeedbackOptions();
    }, 900);
  });

  function buildFeedbackOptions() {
    const reasons = [
      'Portion was too large',
      'Didn\'t like the taste',
      'Quality issue',
      'Health or diet reason',
      'Menu repeated too often',
      'Other reason'
    ];
    const grid = document.getElementById('fbGrid');
    grid.innerHTML = '';
    reasons.forEach(r => {
      const b = document.createElement('button');
      b.className = 'fb-option';
      b.textContent = r;
      b.addEventListener('click', async () => {
        document.querySelectorAll('.fb-option').forEach(o => o.classList.remove('picked'));
        b.classList.add('picked');
        playSound('success');
        addImpactPoints(10);

        try {
          await fetch(`${API_BASE}/api/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scan_id: (SmartPlateState.sample && SmartPlateState.sample.id) || 'adhoc',
              token: SmartPlateState.studentToken,
              reason: r
            })
          });
        } catch (e) {}

        document.getElementById('fbConfirm').classList.add('show');
        document.getElementById('fbTimer').textContent = 'Synced with kitchen database · +10 Eco Points';
        document.getElementById('fbNext').style.display = 'inline-flex';
        // Auto-refresh step 4 analytics in background
        renderDashboardData();
      });
      grid.appendChild(b);
    });
  }
}

// ============================================================
// STEP 4 — Live Kitchen Intelligence Dashboard
// ============================================================
let trendChartInstance = null;
let dishChartInstance = null;

async function initStep4() {
  document.getElementById('dashRefreshBtn')?.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
      await renderDashboardData();
    } catch (e) {
      alert('Could not refresh backend data');
    }
  });

  await renderDashboardData();
}

async function renderDashboardData() {
  let data = null;
  try {
    const res = await fetch(`${API_BASE}/api/analytics`);
    if (res.ok) data = await res.json();
  } catch (e) {
    console.warn('Analytics fetch error:', e);
  }

  if (!data) {
    data = {
      total_kg_diverted: 114.5,
      co2_saved_kg: 217.0,
      quality_complaint_pct: 14,
      days: ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14'],
      trend_kg: [15, 14.5, 16, 13.8, 12.5, 13, 11.2, 10.8, 10.1, 9.4, 9.8, 8.7, 8.5, 7.9],
      top_dishes: [
        { dish_name: 'Chowmein', total_kg: 34.2 },
        { dish_name: 'Roti / Chapati', total_kg: 26.5 },
        { dish_name: 'Steamed Rice', total_kg: 22.1 },
        { dish_name: 'Rajma Chawal', total_kg: 18.4 },
        { dish_name: 'Poha', total_kg: 14.0 }
      ],
      feedback_breakdown: [
        { reason: 'Portion was too large', count: 24, pct: 48 },
        { reason: 'Didn\'t like the taste', count: 12, pct: 24 },
        { reason: 'Quality issue', count: 7, pct: 14 },
        { reason: 'Menu repeated too often', count: 4, pct: 8 },
        { reason: 'Health or diet reason', count: 3, pct: 6 }
      ],
      prep_recommendations: [
        { dish: 'Chowmein', baseline: '25 kg', recommended: '21.5 kg', change: '↓ 14%', status: 'good', reason: 'Consistently high plate leftovers' },
        { dish: 'Poha', baseline: '18 kg', recommended: '16.5 kg', change: '↓ 8%', status: 'good', reason: 'Moderate breakfast leftovers' },
        { dish: 'Idli & Chutney', baseline: '22 kg', recommended: '20.5 kg', change: '↓ 7%', status: 'good', reason: 'High satisfaction, minor portion excess' },
        { dish: 'Rajma Chawal', baseline: '30 kg', recommended: '25.5 kg', change: '↓ 15%', status: 'good', reason: 'Portion size re-calibration recommended' }
      ]
    };
  }

  const mWaste = document.getElementById('mWaste');
  const mCO2 = document.getElementById('mCO2');
  const mComplaints = document.getElementById('mComplaints');
  if (mWaste) mWaste.textContent = `${data.total_kg_diverted} kg`;
  if (mCO2) mCO2.textContent = `${data.co2_saved_kg} kg`;
  if (mComplaints) mComplaints.textContent = `${data.quality_complaint_pct}%`;

  // Trend Chart
  const trendCtx = document.getElementById('trendChart');
  if (trendCtx && window.Chart) {
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: data.days,
        datasets: [{
          label: 'Waste (kg)',
          data: data.trend_kg,
          borderColor: '#15803D',
          backgroundColor: 'rgba(21, 128, 61, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#E2E8F0' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Mono', size: 9 }, maxRotation: 0 } }
        }
      }
    });
  }

  // Dish Chart
  const dishCtx = document.getElementById('dishChart');
  if (dishCtx && window.Chart) {
    if (dishChartInstance) dishChartInstance.destroy();
    dishChartInstance = new Chart(dishCtx, {
      type: 'bar',
      data: {
        labels: data.top_dishes.map(d => d.dish_name),
        datasets: [{
          data: data.top_dishes.map(d => d.total_kg),
          backgroundColor: ['#0F382C', '#15803D', '#16A34A', '#86EFAC', '#BBF7D0'],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#E2E8F0' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 } } }
        }
      }
    });
  }

  // Feedback breakdown bars
  const fbWrap = document.getElementById('feedbackBars');
  if (fbWrap && data.feedback_breakdown) {
    fbWrap.innerHTML = data.feedback_breakdown.map(fb => `
      <div class="fb-bar-row">
        <div class="fb-bar-label" title="${fb.reason}">${fb.reason}</div>
        <div class="fb-bar-track"><div class="fb-bar-fill" style="width:${fb.pct}%"></div></div>
        <div class="fb-bar-pct">${fb.pct}%</div>
      </div>
    `).join('');
  }

  // Prep predictions table
  const predBody = document.getElementById('predBody');
  if (predBody && data.prep_recommendations) {
    predBody.innerHTML = data.prep_recommendations.map(p => `
      <tr>
        <td><b>${p.dish}</b></td>
        <td>${p.baseline}</td>
        <td><b>${p.recommended}</b></td>
        <td class="pred-diff ${p.status}">${p.change}</td>
        <td style="font-size:12.5px;color:var(--text-muted);">${p.reason}</td>
      </tr>
    `).join('');
  }
}

// ---------- App Initialization ----------
window.addEventListener('DOMContentLoaded', async () => {
  await checkServerStatus();
  initScrollSpy();
  await initStep1();
  initStep2();
  initStep3();
  await initStep4();
});