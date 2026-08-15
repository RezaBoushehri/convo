// Telegram-style press-and-hold recorder: tap the button to switch between
// voice/video mode (remembered in localStorage), hold to record, swipe up
// to lock (keep recording after releasing), swipe left to cancel.
// Depends on window.startVoiceRecording/stopVoiceRecording (chat_v0505.js)
// and window.startVideoRecording/stopVideoRecording (videoNote.js).
(function () {
    'use strict';

    const btn = document.getElementById('recordBtn');
    const wrap = document.getElementById('recordWrap');
    if (!btn || !wrap) return;

    const cancelHint = document.getElementById('slideToCancelHint');
    const lockHint = document.getElementById('recordLockHint');
    const timerBadge = document.getElementById('recordTimerBadge');
    const timerText = document.getElementById('recordTimerText');
    const lockedControls = document.getElementById('recordLockedControls');
    const cancelBtn = document.getElementById('recordCancelBtn');
    const sendBtn = document.getElementById('recordSendBtn');

    const TAP_MOVE_PX = 10;       // movement under this during 'pending' still counts as a tap
    const HOLD_START_MS = 180;    // how long you must hold before it counts as "recording", not a tap
    const CANCEL_THRESHOLD_PX = 90;
    const LOCK_THRESHOLD_PX = 60;

    const STORAGE_KEY = 'recordMode';
    let mode = localStorage.getItem(STORAGE_KEY) === 'video' ? 'video' : 'audio';
    applyModeIcon();

    // 'idle' | 'pending' | 'recording' | 'locked'
    let state = 'idle';
    let startX = 0, startY = 0;
    let holdTimer = null;
    let activePointerId = null;

    function applyModeIcon() {
        btn.dataset.mode = mode;
        const icon = btn.querySelector('i');
        icon.className = mode === 'video' ? 'bi bi-camera-video-fill m-auto' : 'bi bi-mic-fill m-auto';
    }

    function toggleMode() {
        mode = mode === 'audio' ? 'video' : 'audio';
        localStorage.setItem(STORAGE_KEY, mode);
        btn.classList.add('record-mode-flip');
        applyModeIcon();
        setTimeout(() => btn.classList.remove('record-mode-flip'), 200);
    }

    window.onRecordTimerTick = function (text) {
        if (timerText) timerText.textContent = text;
    };

    function showRecordingUI() {
        wrap.classList.add('is-recording');
        timerBadge.classList.remove('d-none');
        cancelHint.classList.remove('d-none');
        lockHint.classList.remove('d-none');
        cancelHint.style.transform = '';
        cancelHint.style.opacity = '';
        lockHint.style.transform = '';
        btn.classList.add('record-active');
    }

    function hideRecordingUI() {
        wrap.classList.remove('is-recording', 'is-locked', 'is-canceling');
        timerBadge.classList.add('d-none');
        cancelHint.classList.add('d-none');
        lockHint.classList.add('d-none');
        lockedControls.classList.add('d-none');
        btn.classList.remove('record-active', 'record-locking');
        if (timerText) timerText.textContent = '00:00';
    }

    // Tracks the in-flight start so stop/cancel can wait for it — without
    // this, releasing the button the instant a hold starts could call
    // stop before getUserMedia/MediaRecorder even finished setting up,
    // leaving an orphaned mic/camera stream running.
    let recordingStartPromise = null;

    function beginRecording() {
        state = 'recording';
        showRecordingUI();
        recordingStartPromise = mode === 'video' ? window.startVideoRecording() : window.startVoiceRecording();
        recordingStartPromise.then((started) => {
            if (!started && state === 'recording') {
                state = 'idle';
                hideRecordingUI();
            }
        });
    }

    async function cancelRecording() {
        if (state !== 'recording' && state !== 'locked') return;
        state = 'idle';
        wrap.classList.add('is-canceling');
        btn.classList.add('record-canceling');
        if (recordingStartPromise) await recordingStartPromise;
        await (mode === 'video' ? window.stopVideoRecording(false) : window.stopVoiceRecording(false));
        hideRecordingUI();
        setTimeout(() => btn.classList.remove('record-canceling'), 200);
    }

    function lockRecording() {
        if (state !== 'recording') return;
        state = 'locked';
        wrap.classList.add('is-locked');
        btn.classList.add('record-locking');
        cancelHint.classList.add('d-none');
        lockHint.classList.add('d-none');
        lockedControls.classList.remove('d-none');
        if (activePointerId !== null) {
            try { btn.releasePointerCapture(activePointerId); } catch (e) { /* noop */ }
        }
    }

    async function finishRecording(send) {
        if (state !== 'recording' && state !== 'locked') return;
        state = 'idle';
        if (recordingStartPromise) await recordingStartPromise;
        await (mode === 'video' ? window.stopVideoRecording(send) : window.stopVoiceRecording(send));
        hideRecordingUI();
    }

    btn.addEventListener('pointerdown', (e) => {
        if (state !== 'idle') return;
        e.preventDefault();
        activePointerId = e.pointerId;
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        startX = e.clientX;
        startY = e.clientY;
        state = 'pending';
        holdTimer = setTimeout(() => {
            holdTimer = null;
            beginRecording();
        }, HOLD_START_MS);
    });

    btn.addEventListener('pointermove', (e) => {
        if (state === 'pending') {
            const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
            if (moved > TAP_MOVE_PX && holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
                beginRecording();
            }
            return;
        }
        if (state !== 'recording') return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Slide-to-cancel: hint follows the drag, fades/cancels past threshold.
        const cancelProgress = Math.min(1, Math.max(0, -dx / CANCEL_THRESHOLD_PX));
        cancelHint.style.transform = `translateY(-50%) translateX(${Math.max(dx, -CANCEL_THRESHOLD_PX)}px)`;
        cancelHint.style.opacity = String(1 - cancelProgress * 0.6);

        // Lock hint: chevron/lock rises toward the button as you drag up.
        const lockProgress = Math.min(1, Math.max(0, -dy / LOCK_THRESHOLD_PX));
        lockHint.style.transform = `translateX(-50%) translateY(${-lockProgress * 16}px)`;

        if (-dx >= CANCEL_THRESHOLD_PX) {
            cancelRecording();
        } else if (-dy >= LOCK_THRESHOLD_PX) {
            lockRecording();
        }
    });

    function onPointerEnd(e) {
        if (activePointerId !== null && e.pointerId !== activePointerId) return;

        if (state === 'pending') {
            if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
            state = 'idle';
            toggleMode();
            activePointerId = null;
            return;
        }
        if (state === 'recording') {
            finishRecording(true);
        }
        // state === 'locked': releasing the finger does nothing, wait for
        // the explicit cancel/send buttons.
        activePointerId = null;
    }

    btn.addEventListener('pointerup', onPointerEnd);
    btn.addEventListener('pointercancel', onPointerEnd);

    cancelBtn.addEventListener('click', () => cancelRecording());
    sendBtn.addEventListener('click', () => finishRecording(true));
})();
