// Telegram-style round video messages: record + upload.
// Depends on globals from chat_v0505.js (`socket`, `currentUser`, `message`,
// `clearInputFields`, `sendMessage`) and jQuery. Recording is started/
// stopped by recorder.js's press-and-hold gesture controller, not by a
// click handler here. Loaded after chat_v0505.js.
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

    function updateTimer() {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        if (typeof window.onRecordTimerTick === 'function') window.onRecordTimerTick(`${mm}:${ss}`);
    }

    // Started when the record button is held down in video mode.
    window.startVideoRecording = async function () {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
            });
        } catch (e) {
            if (typeof showAlert === 'function') showAlert('دسترسی به دوربین/میکروفون امکان‌پذیر نیست', 'danger');
            return false;
        }

        $('#chat_windowFooter #editable-message-text').fadeOut();
        $('#chat_windowFooter .message_btn').addClass('d-none');

        const preview = document.getElementById('videoPreviewBubble');
        if (preview) {
            preview.srcObject = stream;
            preview.classList.remove('d-none');
        }

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
        return true;
    };

    function releaseVideoStream() {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        const preview = document.getElementById('videoPreviewBubble');
        if (preview) {
            preview.classList.add('d-none');
            preview.srcObject = null;
        }

        if (typeof checkShowSendBtn === 'function') checkShowSendBtn();
        $('#chat_windowFooter #editable-message-text').fadeIn();
        $('#chat_windowFooter .message_btn')
            .removeClass('d-none animate__fadeOut')
            .addClass('animate__animated animate__fadeIn')
            .show();

        socket.emit('typing', {
            name: (typeof name !== 'undefined' && name?.textContent?.trim()) || '',
            username: typeof typeUsername !== 'undefined' ? typeUsername : undefined,
            status: 'video_record',
            isTyping: false,
        });
    }

    // send=false means discard (cancel) instead of uploading.
    window.stopVideoRecording = function (send) {
        return new Promise((resolve) => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                releaseVideoStream();
                resolve();
                return;
            }
            const recorder = mediaRecorder;
            mediaRecorder = null;

            recorder.onstop = () => {
                const recordedChunks = chunks;
                chunks = [];
                releaseVideoStream();
                if (send && recordedChunks.length) {
                    videoNote_upload(new Blob(recordedChunks, { type: 'video/webm' }));
                }
                resolve();
            };
            recorder.stop();
        });
    };

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
})();
