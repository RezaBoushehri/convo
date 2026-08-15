// Telegram-style round video messages: record + upload.
// Depends on globals from chat_v0505.js (`socket`, `currentUser`, `roomID`,
// `message`, `clearInputFields`, `sendMessage`) and jQuery. Loaded after
// chat_v0505.js.
(function () {
    'use strict';

    if (typeof socket === 'undefined') {
        console.error('videoNote.js requires socket_conn.js to be loaded first');
        return;
    }

    let stream = null;
    let mediaRecorder = null;
    let chunks = [];
    let startTime = 0;
    let timerInterval = null;

    function buildOverlayDom() {
        if (document.getElementById('videoNoteRecorder')) return;

        const overlay = document.createElement('div');
        overlay.id = 'videoNoteRecorder';
        overlay.className = 'video-note-overlay d-none';
        overlay.innerHTML = `
            <div class="video-note-circle-wrap">
                <video id="videoNotePreview" autoplay muted playsinline class="video-note-preview"></video>
                <svg class="video-note-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48"></circle>
                </svg>
            </div>
            <div class="video-note-timer" id="videoNoteTimer">00:00</div>
            <div class="video-note-controls">
                <button type="button" id="videoNoteCancelBtn" class="call-btn call-btn-danger" title="لغو">
                    <i class="bi bi-x-lg"></i>
                </button>
                <button type="button" id="videoNoteStopBtn" class="call-btn call-btn-success" title="ارسال">
                    <i class="bi bi-check-lg"></i>
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('videoNoteCancelBtn').addEventListener('click', () => stopRecording(false));
        document.getElementById('videoNoteStopBtn').addEventListener('click', () => stopRecording(true));
    }

    function updateTimer() {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        const el = document.getElementById('videoNoteTimer');
        if (el) el.textContent = `${mm}:${ss}`;
    }

    async function startRecording() {
        if (mediaRecorder) return; // already recording

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
            });
        } catch (e) {
            if (typeof showAlert === 'function') showAlert('دسترسی به دوربین/میکروفون امکان‌پذیر نیست', 'danger');
            return;
        }

        buildOverlayDom();
        const overlay = document.getElementById('videoNoteRecorder');
        const preview = document.getElementById('videoNotePreview');
        preview.srcObject = stream;
        overlay.classList.remove('d-none');

        $('#chat_windowFooter #recordBtn').prop('disabled', true);

        chunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.start();

        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 200);
        updateTimer();

        socket.emit('typing', {
            name: (typeof name !== 'undefined' && name?.textContent?.trim()) || '',
            username: typeof typeUsername !== 'undefined' ? typeUsername : undefined,
            status: 'video_record',
            isTyping: true,
        });
    }

    function releaseStream() {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        $('#chat_windowFooter #recordBtn').prop('disabled', false);
        const overlay = document.getElementById('videoNoteRecorder');
        if (overlay) overlay.classList.add('d-none');
        const preview = document.getElementById('videoNotePreview');
        if (preview) preview.srcObject = null;

        socket.emit('typing', {
            name: (typeof name !== 'undefined' && name?.textContent?.trim()) || '',
            username: typeof typeUsername !== 'undefined' ? typeUsername : undefined,
            status: 'video_record',
            isTyping: false,
        });
    }

    function stopRecording(send) {
        if (!mediaRecorder) { releaseStream(); return; }
        const recorder = mediaRecorder;
        mediaRecorder = null;

        recorder.onstop = () => {
            releaseStream();
            if (send && chunks.length) {
                const blob = new Blob(chunks, { type: 'video/webm' });
                chunks = [];
                videoNote_upload(blob);
            }
            chunks = [];
        };
        if (recorder.state !== 'inactive') recorder.stop();
    }

    function videoNote_upload(blob) {
        if (!blob) return;

        const replyBox = document.getElementById('replyBox');
        const quote = replyBox ? replyBox.getAttribute('reply-id') : null;

        // Same convention as voice messages: whatever caption text is
        // still in the composer goes along with the recording. Must send
        // a string (even empty), never null/undefined — the server
        // doesn't guard against that.
        let text = (typeof message !== 'undefined' && message?.innerHTML) ? message.innerHTML.trim() : '';
        if (typeof DOMPurify !== 'undefined') {
            text = DOMPurify.sanitize(text, {
                ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'br'],
                ALLOWED_ATTR: ['style', 'data-excel-formula', 'data-excel-value', 'data-excel-type'],
            });
        }

        if (typeof clearInputFields === 'function') clearInputFields();

        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('POST', 'https://mc.farahoosh.ir/metachat/upload', true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        const formData = new FormData();
        formData.append('files', blob, `${currentUser.room}_${currentUser._id}_videonote.webm`);

        xhr.upload.onprogress = (e) => {
            const percent = (e.loaded / e.total) * 100;
            socket.emit('uploadProgress', { progress: percent });
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    const fileData = response.fileData || response;
                    sendMessage(text, fileData, quote);
                } catch (err) {
                    console.error('Bad JSON from upload server', err);
                    if (typeof showAlert === 'function') showAlert('پیام ویدیویی آپلود شد اما پاسخ سرور نامعتبر بود', 'warning');
                }
            } else {
                console.error('Upload failed', xhr.status, xhr.responseText);
                if (typeof showAlert === 'function') showAlert(`آپلود پیام ویدیویی ناموفق بود (${xhr.status})`, 'danger');
            }
        };

        xhr.onerror = () => {
            if (typeof showAlert === 'function') showAlert('خطای شبکه هنگام آپلود پیام ویدیویی', 'danger');
        };

        xhr.send(formData);
    }

    document.getElementById('recordVideoBtn')?.addEventListener('click', () => {
        if (mediaRecorder) {
            stopRecording(true);
        } else {
            startRecording();
        }
    });

    buildOverlayDom();
})();
