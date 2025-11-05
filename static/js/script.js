/* script.js - clean, single-file logic for calibration, sound, simple webgazer + face-api initialization.
   Save as script.js and make sure index.html references it with defer.
*/

(() => {
  // ====== State ======
  let calibrationIndex = 0;
  let lookingAwayCounter = 0;
  let notOnQuestionCounter = 0;
  let calibrated = false;
  let prevX = null, prevY = null;
  let multiplePersonAlertCount = 0;
  let isMuted = false;

  // ====== DOM refs ======
  const statusBar = document.getElementById('status-bar');
  const alertMsg = document.getElementById('alert-msg');
  const questionArea = document.getElementById('question-area');
  const calibBtn = document.getElementById('calib-btn');
  const muteBtn = document.getElementById('mute-btn');
  const systemStatus = document.getElementById('system-status');

  const warningSound = document.getElementById('warning-sound');
  const violationSound = document.getElementById('violation-sound');
  const criticalSound = document.getElementById('critical-sound');

  const faceStatus = document.getElementById('face-status');
  const eyeStatus = document.getElementById('eye-status');
  const calibStatus = document.getElementById('calib-status');
  const soundStatus = document.getElementById('sound-status');

  // calibration points
  const points = [
    {x:0.1,y:0.1}, {x:0.5,y:0.1}, {x:0.9,y:0.1},
    {x:0.1,y:0.5}, {x:0.5,y:0.5}, {x:0.9,y:0.5},
    {x:0.1,y:0.9}, {x:0.5,y:0.9}, {x:0.9,y:0.9}
  ];

  // ====== Utility sound functions ======
  function safePlay(audioEl, vol = 0.3) {
    if (!audioEl || isMuted) return;
    try {
      audioEl.currentTime = 0;
      audioEl.volume = vol;
      audioEl.play().catch(e => {/* autoplay restrictions may block playback */});
    } catch (e) { console.warn('Audio play error', e); }
  }
  function playWarningSound(){ safePlay(warningSound, 0.25); }
  function playViolationSound(){ safePlay(violationSound, 0.5); }
  function playCriticalSound(){ safePlay(criticalSound, 0.7); }

  // ====== Alert UI ======
  let alertTimeout = null;
  function showAlert(msg, type='warning') {
    alertMsg.textContent = msg;
    alertMsg.classList.remove('hidden');
    // background color by type
    if (type === 'critical') { alertMsg.style.background = 'rgba(220,38,38,0.95)'; playCriticalSound(); }
    else if (type === 'violation') { alertMsg.style.background = 'rgba(239,68,68,0.95)'; playViolationSound(); }
    else { alertMsg.style.background = 'rgba(245,158,11,0.95)'; playWarningSound(); }

    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
      alertMsg.classList.add('hidden');
    }, 3500);
  }

  // ====== Calibration UI ======
  function startCalibration() {
    calibrationIndex = 0;
    statusBar.textContent = 'Click each red dot for calibration.';
    calibBtn.disabled = true;
    removeDots();
    showNextDot();
  }

  function showNextDot(){
    removeDots();
    if (calibrationIndex >= points.length) {
      calibrated = true;
      statusBar.textContent = '✅ Calibration complete! Starting advanced tracking...';
      calibStatus.textContent = '✅';
      eyeStatus.textContent = '✅';
      // play small success sound
      if (!isMuted) playWarningSound();
      // re-enable button after a short delay
      setTimeout(() => { calibBtn.disabled = false; }, 800);
      // start webgazer tracking (if available)
      if (typeof webgazer !== 'undefined') startGazeTracking();
      return;
    }

    const w = window.innerWidth, h = window.innerHeight;
    const p = points[calibrationIndex];
    const dot = document.createElement('div');
    dot.className = 'calib-dot';
    dot.style.left = (p.x * w - 14) + 'px';
    dot.style.top  = (p.y * h - 14) + 'px';
    dot.onclick = () => {
      // play small click
      if (!isMuted) safePlay(warningSound, 0.18);
      dot.style.backgroundColor = '#22c55e';
      calibrationIndex++;
      setTimeout(showNextDot, 250);
    };
    document.body.appendChild(dot);
  }

  function removeDots(){
    document.querySelectorAll('.calib-dot').forEach(d => d.remove());
  }
// call this after calibration is done
function startServerAssistedTracking() {
  const video = document.getElementById('webgazerVideoFeed') || document.querySelector('video');
  if (!video) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const sendInterval = 600; // ms, tune between 300-800
  canvas.width = 320; canvas.height = Math.round(video.videoHeight * (320 / video.videoWidth));

  setInterval(async () => {
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.6);
      const res = await fetch('/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, session_id: 'candidate-123' })
      });
      const data = await res.json();
      // handle backend response: show alerts, update UI
      if (data.alert === 'multiple_persons') {
        showAlert('🚫 Multiple persons detected!', 'critical');
      } else if (data.faces && data.faces[0]) {
        const s = data.faces[0].status;
        if (s !== 'on_screen') showAlert('👀 Please focus on the screen!', 'warning');
      }
    } catch (e) {
      console.warn('server tracking error', e);
    }
  }, sendInterval);
}

  // ====== Violation logging (currently console only) ======
  function logViolation(type) {
    const map = {
      'screen_away':'Looking away from screen',
      'question_away':'Not focused on question',
      'multiple_persons':'Multiple persons detected',
      'excessive_movement':'Excessive body movement'
    };
    const entry = { type, description: map[type] || 'Unknown', timestamp: new Date().toISOString() };
    console.log('VIOLATION', entry);
  }

  function getViolationSeverity(type) {
    const severe = ['multiple_persons'];
    const medium = ['screen_away','excessive_movement'];
    if (severe.includes(type)) return 'high';
    if (medium.includes(type)) return 'medium';
    return 'low';
  }

  // ====== Gaze Tracking (webgazer integration) ======
  function startGazeTracking() {
    // webgazer must be loaded
    if (typeof webgazer === 'undefined') {
      statusBar.textContent = 'Webgazer not loaded — basic tracking unavailable.';
      return;
    }

    try {
      statusBar.textContent = 'Initializing advanced gaze tracker...';
      webgazer.setRegression('ridge').setTracker('clmtrackr').begin()
             .showPredictionPoints(false).showFaceOverlay(true).showFaceFeedbackBox(true);
    } catch (e) {
      console.warn('webgazer begin error', e);
    }

    setTimeout(() => {
      statusBar.textContent = '🎯 Advanced tracking active!';
      // attach periodic tasks
      setInterval(detectMultiplePersons, 3000);
    }, 1500);

    // gaze listener
    webgazer.setGazeListener((data, elapsedTime) => {
      if (!data || !calibrated) return;
      const x = data.x, y = data.y;
      const w = window.innerWidth, h = window.innerHeight;
      const smoothX = prevX ? (x * 0.7 + prevX * 0.3) : x;
      const smoothY = prevY ? (y * 0.7 + prevY * 0.3) : y;
      prevX = smoothX; prevY = smoothY;

      // edges -> looking away
      const edge = 50;
      if (smoothX < edge || smoothX > w - edge || smoothY < edge || smoothY > h - edge) {
        lookingAwayCounter++;
        if (lookingAwayCounter > 12) {
          showAlert('⚠️ Looking away from screen!', 'violation');
          logViolation('screen_away');
          lookingAwayCounter = 0;
        } else if (lookingAwayCounter > 8) {
          statusBar.textContent = '👀 Please focus on screen';
          if (!isMuted) playWarningSound();
        }
      } else {
        lookingAwayCounter = 0;
      }

      // question area focus
      const qRect = questionArea.getBoundingClientRect();
      const expanded = { left: qRect.left - 50, right: qRect.right + 50, top: qRect.top - 30, bottom: qRect.bottom + 30 };
      if (smoothX < expanded.left || smoothX > expanded.right || smoothY < expanded.top || smoothY > expanded.bottom) {
        notOnQuestionCounter++;
        if (notOnQuestionCounter > 60) {
          showAlert('👀 Focus on the question area!', 'violation');
          logViolation('question_away');
          notOnQuestionCounter = 0;
        } else if (notOnQuestionCounter > 40) {
          statusBar.textContent = '📝 Please look at question';
          if (!isMuted) playWarningSound();
        }
      } else {
        notOnQuestionCounter = 0;
        statusBar.textContent = '✅ Good focus!';
      }
    });
  }

  // ====== Face detection helpers (face-api usage) ======
  async function initializeFaceApi() {
    try {
      // try loading models from CDN fallback (not ideal for prod)
      const base = 'https://justadudewhohacks.github.io/face-api.js/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(base);
      await faceapi.nets.faceLandmark68Net.loadFromUri(base);
      await faceapi.nets.faceRecognitionNet.loadFromUri(base);
      await faceapi.nets.faceExpressionNet.loadFromUri(base);
      faceStatus.textContent = '✅';
      systemStatus.classList.remove('hidden');
      statusBar.textContent = 'AI models loaded successfully!';
    } catch (e) {
      console.warn('face-api load error', e);
      faceStatus.textContent = '❌';
      statusBar.textContent = 'Basic tracking only - AI models failed to load';
    }
  }

  // Multiple persons detector (uses face-api if available)
  async function detectMultiplePersons() {
    const video = document.getElementById('webgazerVideoFeed') || document.querySelector('video');
    if (!video) return;
    if (typeof faceapi === 'undefined' || !faceapi.nets.tinyFaceDetector.params) return;

    try {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
      if (detections && detections.length > 1) {
        multiplePersonAlertCount++;
        if (multiplePersonAlertCount > 8) {
          showAlert('🚫 Multiple persons detected!', 'critical');
          logViolation('multiple_persons');
          multiplePersonAlertCount = 0;
        }
      } else {
        multiplePersonAlertCount = Math.max(0, multiplePersonAlertCount - 1);
      }
    } catch (e) {
      // silent
    }
  }

  // ====== UI wiring ======
  calibBtn.addEventListener('click', () => {
    // If button disabled, ignore
    if (calibBtn.disabled) return;
    startCalibration();
  });

  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.classList.toggle('muted', isMuted);
    muteBtn.textContent = isMuted ? '🔇 Unmute Alerts' : '🔈 Mute Alerts';
    if (soundStatus) soundStatus.textContent = isMuted ? '🔇' : '🔊';
    if (!isMuted) safePlay(warningSound, 0.18);
    showAlert(isMuted ? 'Alerts muted' : 'Alerts unmuted', 'warning');
  });

  // ====== Boot sequence on window load ======
  window.addEventListener('load', async () => {
    statusBar.textContent = 'Loading AI proctoring system...';

    // show system panel
    systemStatus.classList.add('hidden'); // will be unhidden by face-api if loaded
    // initialize face-api in background
    if (typeof faceapi !== 'undefined') {
      initializeFaceApi().catch(e => console.warn(e));
    } else {
      // face-api not yet available — give a little time then try to init later
      setTimeout(() => {
        if (typeof faceapi !== 'undefined') initializeFaceApi().catch(()=>{});
      }, 1200);
    }

    // Setup default statuses
    document.getElementById('eye-status').textContent = '❌';
    document.getElementById('calib-status').textContent = '❌';
    document.getElementById('body-status').textContent = '❌';
    document.getElementById('multi-person-status').textContent = '❌';
    document.getElementById('sound-status').textContent = '🔊';

    statusBar.textContent = 'Calibration required. Click "Calibrate" to begin!';
  });
})();
