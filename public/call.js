// Voice / video calling (WebRTC) for MetaChat.
// Depends on the global `socket` from socket_conn.js and on `roomID` /
// `escapeHtml` from chat_v0505.js. Loaded after both.
(function () {
    'use strict';

    if (typeof socket === 'undefined') {
        console.error('call.js requires socket_conn.js to be loaded first');
        return;
    }

    // ICE servers come from the server (public STUN by default, or your own
    // self-hosted coturn if STUN_URL/TURN_URL/TURN_SECRET are configured —
    // see call:ice-servers in app.js). Refreshed before each call so TURN
    // credentials (which expire) stay valid.
    let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]; // fallback until the server responds

    function refreshIceServers() {
        return new Promise((resolve) => {
            socket.emit('call:ice-servers', {}, (res) => {
                if (res?.iceServers?.length) iceServers = res.iceServers;
                resolve(iceServers);
            });
        });
    }

    let currentCall = null;
    // currentCall = { callId, callType, roomID, isInitiator, localStream,
    //                 peers: Map<socketId, RTCPeerConnection>,
    //                 participants: Map<socketId, participantInfo> }
    let incomingCall = null; // { callId, callType, roomID, caller }

    function safeText(str) {
        return typeof escapeHtml === 'function' ? escapeHtml(String(str ?? '')) : String(str ?? '');
    }

    function avatarUrl(username) {
        return `/portal/profile/img/${username}`;
    }

    function videoConstraints(callType) {
        // Prefer the front/selfie camera by default, matching typical call UX.
        return callType === 'video' ? { width: 640, height: 480, facingMode: { ideal: 'user' } } : false;
    }

    async function resetVideoZoom(stream) {
        const track = stream.getVideoTracks()[0];
        if (!track || typeof track.getCapabilities !== 'function') return;
        try {
            const caps = track.getCapabilities();
            if (caps.zoom) {
                await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min ?? 1 }] });
            }
        } catch (e) { /* zoom control not supported on this device/browser */ }
    }

    function showToast(message) {
        if (typeof refToast === 'function') {
            refToast({ title: 'تماس', message });
        } else {
            console.log('[call]', message);
        }
    }

    // ---------------- Ringtone (synthesized, no audio asset needed) ----------------
    let audioCtx = null;
    let ringInterval = null;

    function ensureAudioCtx() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function beep(freq, duration, delay) {
        const ctx = ensureAudioCtx();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.type = 'sine';
            const t0 = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.linearRampToValueAtTime(0.15, t0 + 0.03);
            gain.gain.linearRampToValueAtTime(0.0001, t0 + duration);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + duration + 0.05);
        } catch (e) { /* audio not critical */ }
    }

    function startRingtone(kind) {
        stopRingtone();
        const play = () => {
            if (kind === 'incoming') {
                beep(660, 0.22, 0);
                beep(880, 0.22, 0.28);
            } else {
                beep(440, 0.4, 0);
            }
        };
        play();
        ringInterval = setInterval(play, 1600);
    }

    function stopRingtone() {
        if (ringInterval) {
            clearInterval(ringInterval);
            ringInterval = null;
        }
    }

    // ---------------- DOM scaffolding (built once) ----------------
    function buildOverlayDom() {
        if (document.getElementById('callOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'callOverlay';
        overlay.className = 'call-overlay d-none';
        overlay.innerHTML = `
            <div class="call-overlay-header">
                <span id="callOverlayTitle"></span>
                <span id="callOverlayTimer" class="call-timer d-none">00:00</span>
            </div>
            <div id="callStage" class="call-stage">
                <div id="callRemoteGrid" class="call-tiles-grid"></div>
            </div>
            <div class="call-controls">
                <button type="button" id="callMuteBtn" class="call-btn" title="قطع/وصل میکروفون">
                    <i class="bi bi-mic-fill"></i>
                </button>
                <button type="button" id="callCameraBtn" class="call-btn d-none" title="قطع/وصل دوربین">
                    <i class="bi bi-camera-video-fill"></i>
                </button>
                <button type="button" id="callHangupBtn" class="call-btn call-btn-danger" title="پایان تماس">
                    <i class="bi bi-telephone-x-fill"></i>
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        const incoming = document.createElement('div');
        incoming.id = 'incomingCallToast';
        incoming.className = 'incoming-call-toast d-none';
        incoming.innerHTML = `
            <div class="incoming-call-avatar"><img id="incomingCallAvatar" src="" alt=""></div>
            <div class="incoming-call-info">
                <div id="incomingCallName" class="incoming-call-name"></div>
                <div id="incomingCallType" class="incoming-call-type"></div>
            </div>
            <div class="incoming-call-actions">
                <button type="button" id="incomingCallDeclineBtn" class="call-btn call-btn-danger" title="رد تماس">
                    <i class="bi bi-telephone-x-fill"></i>
                </button>
                <button type="button" id="incomingCallAcceptBtn" class="call-btn call-btn-success" title="پاسخ">
                    <i class="bi bi-telephone-fill"></i>
                </button>
            </div>
        `;
        document.body.appendChild(incoming);

        document.getElementById('callMuteBtn').addEventListener('click', toggleMute);
        document.getElementById('callCameraBtn').addEventListener('click', toggleCamera);
        document.getElementById('callHangupBtn').addEventListener('click', hangUp);
        document.getElementById('incomingCallAcceptBtn').addEventListener('click', acceptIncomingCall);
        document.getElementById('incomingCallDeclineBtn').addEventListener('click', declineIncomingCall);
    }

    // ---------------- Call trigger buttons in the room header ----------------
    function injectCallTriggers() {
        const roomInfo = document.getElementById('roomInfo');
        if (!roomInfo) return;
        roomInfo.querySelectorAll('.call-trigger-group').forEach(el => el.remove());

        const group = document.createElement('div');
        group.className = 'call-trigger-group col-auto d-flex gap-2 my-auto';
        group.innerHTML = `
            <button type="button" class="btn btn-outline-light rounded-circle backdrop-blur-chat-bg call-trigger-btn" id="startVoiceCallBtn" title="تماس صوتی">
                <i class="bi bi-telephone-fill"></i>
            </button>
            <button type="button" class="btn btn-outline-light rounded-circle backdrop-blur-chat-bg call-trigger-btn" id="startVideoCallBtn" title="تماس تصویری">
                <i class="bi bi-camera-video-fill"></i>
            </button>
        `;
        roomInfo.appendChild(group);

        document.getElementById('startVoiceCallBtn').addEventListener('click', () => startOutgoingCall('audio'));
        document.getElementById('startVideoCallBtn').addEventListener('click', () => startOutgoingCall('video'));
    }

    // ---------------- Tiles ----------------
    function buildTileElement(socketId, name, username, callType) {
        const isLocal = socketId === 'local';
        const tile = document.createElement('div');
        tile.className = 'call-tile' + (callType !== 'video' ? ' audio-only' : '') + (isLocal ? ' call-local-pip' : '');
        tile.dataset.socketId = socketId;
        tile.innerHTML = `
            <video autoplay playsinline${isLocal ? ' muted' : ''}></video>
            <div class="call-tile-avatar"><img src="${avatarUrl(username)}" alt=""></div>
            <div class="call-tile-name">${safeText(name)}</div>
            <div class="call-tile-status">${isLocal ? '' : 'در حال اتصال...'}</div>
            ${isLocal
                ? `<div class="call-pip-resize-handle" title="تغییر اندازه"></div>`
                : `<button type="button" class="call-tile-mute-btn" title="بی‌صدا کردن (فقط برای شما)"><i class="bi bi-volume-up-fill"></i></button>`
            }
        `;
        return tile;
    }

    function setLocalTile(stream, callType) {
        const stage = document.getElementById('callStage');
        let tile = stage.querySelector('[data-socket-id="local"]');
        if (!tile) {
            tile = buildTileElement('local', 'شما', (typeof currentUser !== 'undefined' && currentUser?.username) || '', callType);
            stage.appendChild(tile);
            makePipDraggable(tile);
            makePipResizable(tile);
        }
        const video = tile.querySelector('video');
        video.srcObject = stream;
        video.muted = true;
        tile.classList.toggle('audio-only', callType !== 'video');
        applyLocalMirror(tile, stream);
    }

    function applyLocalMirror(tile, stream) {
        const videoTrack = stream.getVideoTracks()[0];
        const facingMode = videoTrack?.getSettings?.().facingMode;
        // Mirror the front/user-facing camera (the common case), not the back camera.
        tile.classList.toggle('mirrored', facingMode !== 'environment');
    }

    function renderRemoteTile(participant) {
        const grid = document.getElementById('callRemoteGrid');
        let tile = grid.querySelector(`[data-socket-id="${participant.socketId}"]`);
        if (!tile) {
            tile = buildTileElement(participant.socketId, participant.fullName, participant.username, currentCall.callType);
            grid.appendChild(tile);
            const muteBtn = tile.querySelector('.call-tile-mute-btn');
            if (muteBtn) muteBtn.addEventListener('click', () => toggleRemoteMute(participant.socketId));
        }
    }

    function toggleRemoteMute(socketId) {
        const tile = document.querySelector(`#callRemoteGrid [data-socket-id="${socketId}"]`);
        if (!tile) return;
        const video = tile.querySelector('video');
        video.muted = !video.muted;
        const btn = tile.querySelector('.call-tile-mute-btn');
        btn.classList.toggle('active', video.muted);
        btn.querySelector('i').className = video.muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
    }

    function setRemoteTileStream(socketId, stream) {
        const tile = document.querySelector(`#callRemoteGrid [data-socket-id="${socketId}"]`);
        if (!tile) return;
        const video = tile.querySelector('video');
        video.srcObject = stream;
        const status = tile.querySelector('.call-tile-status');
        if (status) status.textContent = '';
    }

    function setTileConnectionState(socketId, state) {
        const tile = document.querySelector(`#callRemoteGrid [data-socket-id="${socketId}"]`);
        if (!tile) return;
        const status = tile.querySelector('.call-tile-status');
        if (!status) return;
        if (state === 'connected') status.textContent = '';
        else if (state === 'connecting' || state === 'new') status.textContent = 'در حال اتصال...';
        else if (state === 'disconnected') status.textContent = 'اتصال ضعیف...';
        else if (state === 'failed' || state === 'closed') status.textContent = 'قطع شد';
    }

    function removeTile(socketId) {
        const tile = document.querySelector(`#callRemoteGrid [data-socket-id="${socketId}"]`);
        if (tile) tile.remove();
    }

    // ---------------- Local PiP: draggable + resizable ----------------
    function makePipDraggable(tile) {
        let dragging = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        tile.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.call-pip-resize-handle')) return;
            const stage = document.getElementById('callStage');
            const stageRect = stage.getBoundingClientRect();
            const tileRect = tile.getBoundingClientRect();
            dragging = true;
            tile.setPointerCapture(e.pointerId);
            startX = e.clientX;
            startY = e.clientY;
            startLeft = tileRect.left - stageRect.left;
            startTop = tileRect.top - stageRect.top;
            tile.classList.add('dragging');
        });

        tile.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const stage = document.getElementById('callStage');
            const stageRect = stage.getBoundingClientRect();
            const tileRect = tile.getBoundingClientRect();
            let left = startLeft + (e.clientX - startX);
            let top = startTop + (e.clientY - startY);
            left = Math.max(0, Math.min(left, stageRect.width - tileRect.width));
            top = Math.max(0, Math.min(top, stageRect.height - tileRect.height));
            tile.style.left = `${left}px`;
            tile.style.top = `${top}px`;
            tile.style.right = 'auto';
            tile.style.bottom = 'auto';
        });

        const endDrag = (e) => {
            if (!dragging) return;
            dragging = false;
            tile.classList.remove('dragging');
            try { tile.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        };
        tile.addEventListener('pointerup', endDrag);
        tile.addEventListener('pointercancel', endDrag);
    }

    function makePipResizable(tile) {
        const handle = tile.querySelector('.call-pip-resize-handle');
        if (!handle) return;
        let resizing = false;
        let startX = 0, startWidth = 0;
        const MIN_WIDTH = 90, MAX_WIDTH = 260;

        handle.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            resizing = true;
            handle.setPointerCapture(e.pointerId);
            startX = e.clientX;
            startWidth = tile.getBoundingClientRect().width;
        });

        handle.addEventListener('pointermove', (e) => {
            if (!resizing) return;
            e.stopPropagation();
            const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (e.clientX - startX)));
            tile.style.width = `${width}px`;
        });

        const endResize = (e) => {
            if (!resizing) return;
            resizing = false;
            try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        };
        handle.addEventListener('pointerup', endResize);
        handle.addEventListener('pointercancel', endResize);
    }

    // ---------------- Overlay open/close ----------------
    function openCallOverlay() {
        buildOverlayDom();
        const overlay = document.getElementById('callOverlay');
        document.getElementById('callRemoteGrid').innerHTML = '';
        overlay.classList.remove('d-none');
        document.getElementById('callCameraBtn').classList.toggle('d-none', currentCall.callType !== 'video');
        updateMuteBtn(false);
        updateCameraBtn(false);
        setOverlayTitle(currentCall.callType === 'video' ? 'تماس تصویری' : 'تماس صوتی');
    }

    function closeCallOverlay() {
        const overlay = document.getElementById('callOverlay');
        if (!overlay) return;
        overlay.classList.add('d-none');
        document.getElementById('callRemoteGrid').innerHTML = '';
        const stage = document.getElementById('callStage');
        stage.querySelectorAll('.call-local-pip').forEach(el => el.remove());
    }

    function setOverlayTitle(text) {
        const el = document.getElementById('callOverlayTitle');
        if (el) el.textContent = text;
    }

    let callTimerInterval = null;
    function startCallTimer() {
        const el = document.getElementById('callOverlayTimer');
        if (!el) return;
        el.classList.remove('d-none');
        const start = Date.now();
        stopCallTimer();
        callTimerInterval = setInterval(() => {
            const secs = Math.floor((Date.now() - start) / 1000);
            const m = String(Math.floor(secs / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            el.textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopCallTimer() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        const el = document.getElementById('callOverlayTimer');
        if (el) {
            el.classList.add('d-none');
            el.textContent = '00:00';
        }
    }

    function updateMuteBtn(muted) {
        const btn = document.getElementById('callMuteBtn');
        if (!btn) return;
        btn.classList.toggle('active', muted);
        btn.querySelector('i').className = muted ? 'bi bi-mic-mute-fill' : 'bi bi-mic-fill';
    }

    function updateCameraBtn(off) {
        const btn = document.getElementById('callCameraBtn');
        if (!btn) return;
        btn.classList.toggle('active', off);
        btn.querySelector('i').className = off ? 'bi bi-camera-video-off-fill' : 'bi bi-camera-video-fill';
    }

    // ---------------- WebRTC peer management ----------------
    function createPeerConnection(remoteSocketId) {
        const pc = new RTCPeerConnection({ iceServers });
        currentCall.peers.set(remoteSocketId, pc);
        currentCall.localStream.getTracks().forEach(track => pc.addTrack(track, currentCall.localStream));

        pc.onicecandidate = (e) => {
            if (e.candidate && currentCall) {
                socket.emit('call:signal', {
                    callId: currentCall.callId, to: remoteSocketId, type: 'ice-candidate', payload: e.candidate,
                });
            }
        };
        pc.ontrack = (e) => setRemoteTileStream(remoteSocketId, e.streams[0]);
        pc.onconnectionstatechange = () => setTileConnectionState(remoteSocketId, pc.connectionState);

        return pc;
    }

    async function initiateOfferTo(remoteSocketId) {
        const pc = createPeerConnection(remoteSocketId);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('call:signal', { callId: currentCall.callId, to: remoteSocketId, type: 'offer', payload: offer });
        } catch (e) {
            console.error('Failed to create call offer:', e);
        }
    }

    socket.on('call:signal', async ({ callId, from, fromUser, type, payload }) => {
        if (!currentCall || currentCall.callId !== callId) return;
        let pc = currentCall.peers.get(from);
        try {
            if (type === 'offer') {
                if (!pc) pc = createPeerConnection(from);
                currentCall.participants.set(from, fromUser);
                renderRemoteTile(fromUser);
                await pc.setRemoteDescription(new RTCSessionDescription(payload));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('call:signal', { callId, to: from, type: 'answer', payload: answer });
            } else if (type === 'answer') {
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload));
            } else if (type === 'ice-candidate') {
                if (pc) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(payload)); }
                    catch (e) { console.warn('Failed to add ICE candidate:', e); }
                }
            }
        } catch (e) {
            console.error('call:signal handling error:', e);
        }
    });

    // ---------------- Outgoing call ----------------
    async function startOutgoingCall(callType) {
        if (currentCall) { showToast('در حال حاضر در یک تماس هستید'); return; }
        if (incomingCall) { showToast('یک تماس ورودی در انتظار پاسخ است'); return; }
        if (typeof roomID === 'undefined' || !roomID) { showToast('ابتدا وارد یک گفتگو شوید'); return; }

        const iceServersReady = refreshIceServers();
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints(callType) });
        } catch (e) {
            showToast('دسترسی به میکروفون/دوربین امکان‌پذیر نیست');
            return;
        }
        await resetVideoZoom(stream);
        await iceServersReady;

        currentCall = {
            callId: null,
            callType,
            roomID,
            isInitiator: true,
            localStream: stream,
            peers: new Map(),
            participants: new Map(),
        };

        openCallOverlay();
        setLocalTile(stream, callType);
        startRingtone('outgoing');

        socket.emit('call:invite', { callType }, (res) => {
            if (!res || !res.success) {
                if (currentCall) {
                    showToast(res?.message || 'برقراری تماس ممکن نشد');
                    teardownCall();
                }
                return;
            }
            if (!currentCall) {
                // Hung up locally before the server responded — tell it to leave.
                socket.emit('call:leave', { callId: res.callId });
                return;
            }
            currentCall.callId = res.callId;
            if (res.participants && res.participants.length) {
                // Room already had an active call — we joined it directly.
                stopRingtone();
                startCallTimer();
                setOverlayTitle('');
                res.participants.forEach(p => {
                    currentCall.participants.set(p.socketId, p);
                    renderRemoteTile(p);
                });
            }
        });
    }

    // ---------------- Incoming call ----------------
    socket.on('call:incoming', ({ callId, callType, roomID: callRoomID, caller }) => {
        if (currentCall || incomingCall) {
            socket.emit('call:decline', { callId }); // busy
            return;
        }
        incomingCall = { callId, callType, roomID: callRoomID, caller };
        showIncomingCallUI(incomingCall);
        startRingtone('incoming');
    });

    function showIncomingCallUI(data) {
        buildOverlayDom();
        document.getElementById('incomingCallAvatar').src = avatarUrl(data.caller.username);
        document.getElementById('incomingCallName').textContent = data.caller.fullName || data.caller.username;
        document.getElementById('incomingCallType').textContent =
            data.callType === 'video' ? 'تماس تصویری ورودی' : 'تماس صوتی ورودی';
        document.getElementById('incomingCallToast').classList.remove('d-none');
    }

    function hideIncomingCallUI() {
        const el = document.getElementById('incomingCallToast');
        if (el) el.classList.add('d-none');
    }

    async function acceptIncomingCall() {
        if (!incomingCall) return;
        const { callId, callType } = incomingCall;
        stopRingtone();
        hideIncomingCallUI();

        const iceServersReady = refreshIceServers();
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints(callType) });
        } catch (e) {
            showToast('دسترسی به میکروفون/دوربین امکان‌پذیر نیست');
            socket.emit('call:decline', { callId });
            incomingCall = null;
            return;
        }
        await resetVideoZoom(stream);
        await iceServersReady;

        currentCall = {
            callId, callType, roomID: incomingCall.roomID,
            isInitiator: false, localStream: stream, peers: new Map(), participants: new Map(),
        };
        incomingCall = null;

        openCallOverlay();
        setLocalTile(stream, callType);
        startCallTimer();

        socket.emit('call:accept', { callId }, (res) => {
            if (!currentCall) return;
            if (!res || !res.success) {
                showToast(res?.message || 'تماس دیگر در دسترس نیست');
                teardownCall();
                return;
            }
            (res.participants || []).forEach(p => {
                currentCall.participants.set(p.socketId, p);
                renderRemoteTile(p);
            });
        });
    }

    function declineIncomingCall() {
        if (!incomingCall) return;
        socket.emit('call:decline', { callId: incomingCall.callId });
        stopRingtone();
        hideIncomingCallUI();
        incomingCall = null;
    }

    // ---------------- Events from other participants ----------------
    socket.on('call:participant-joined', ({ callId, participant }) => {
        if (!currentCall || currentCall.callId !== callId) return;
        stopRingtone();
        startCallTimer();
        setOverlayTitle('');
        currentCall.participants.set(participant.socketId, participant);
        renderRemoteTile(participant);
        initiateOfferTo(participant.socketId);
    });

    socket.on('call:participant-left', ({ callId, socketId }) => {
        if (!currentCall || currentCall.callId !== callId) return;
        const pc = currentCall.peers.get(socketId);
        if (pc) { try { pc.close(); } catch (e) { /* noop */ } }
        currentCall.peers.delete(socketId);
        currentCall.participants.delete(socketId);
        removeTile(socketId);
    });

    socket.on('call:declined', ({ callId, by }) => {
        if (currentCall && currentCall.callId === callId) {
            showToast(`${by.fullName} تماس را رد کرد`);
        }
    });

    function callEndMessage(reason) {
        switch (reason) {
            case 'declined': return 'تماس رد شد';
            case 'no-answer': return 'پاسخی داده نشد';
            case 'disconnected': return 'تماس قطع شد';
            default: return 'تماس پایان یافت';
        }
    }

    socket.on('call:ended', ({ callId, reason }) => {
        if (currentCall && currentCall.callId === callId) {
            showToast(callEndMessage(reason));
            teardownCall();
        } else if (incomingCall && incomingCall.callId === callId) {
            stopRingtone();
            hideIncomingCallUI();
            incomingCall = null;
            if (reason !== 'declined') showToast('تماس از دست رفته');
        }
    });

    // ---------------- Local controls ----------------
    function toggleMute() {
        if (!currentCall) return;
        const track = currentCall.localStream.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        updateMuteBtn(!track.enabled);
    }

    function toggleCamera() {
        if (!currentCall) return;
        const track = currentCall.localStream.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        updateCameraBtn(!track.enabled);
    }

    function hangUp() {
        if (incomingCall) { declineIncomingCall(); return; }
        if (!currentCall) return;
        if (currentCall.callId) socket.emit('call:leave', { callId: currentCall.callId });
        teardownCall();
    }

    function teardownCall() {
        stopRingtone();
        stopCallTimer();
        if (currentCall) {
            currentCall.peers.forEach(pc => { try { pc.close(); } catch (e) { /* noop */ } });
            currentCall.localStream?.getTracks().forEach(t => t.stop());
        }
        currentCall = null;
        closeCallOverlay();
    }

    // ---------------- Wiring into room lifecycle ----------------
    socket.on('joined', injectCallTriggers);
    socket.on('leftRoom', () => {
        document.querySelectorAll('.call-trigger-group').forEach(el => el.remove());
    });
    socket.on('connect', refreshIceServers);
    refreshIceServers(); // warm up immediately in case connect already fired

    buildOverlayDom();
})();
