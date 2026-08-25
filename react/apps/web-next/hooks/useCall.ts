'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { startRingtone, stopRingtone } from '@/lib/ringtone';
import type {
  CallDeclinedPayload,
  CallEndedPayload,
  CallInviteAck,
  CallParticipant,
  CallParticipantJoinedPayload,
  CallParticipantLeftPayload,
  CallSignalPayload,
  CallType,
  CurrentUser,
  IncomingCallPayload,
} from '@/lib/types';

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'active';

let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]; // fallback until the server responds

function refreshIceServers(): Promise<RTCIceServer[]> {
  return new Promise((resolve) => {
    getSocket().emit('call:ice-servers', {}, (res: { iceServers?: RTCIceServer[] }) => {
      if (res?.iceServers?.length) iceServers = res.iceServers;
      resolve(iceServers);
    });
  });
}

function videoConstraints(callType: CallType): boolean | MediaTrackConstraints {
  return callType === 'video' ? { width: 640, height: 480, facingMode: { ideal: 'user' } } : false;
}

export function useCall(currentUser: CurrentUser | null) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const callIdRef = useRef<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  const incomingCallRef = useRef<IncomingCallPayload | null>(null);
  const timerStartRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  phaseRef.current = phase;
  incomingCallRef.current = incomingCall;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((t) => (t === message ? null : t)), 4000);
  }, []);

  const startTimer = useCallback(() => {
    timerStartRef.current = Date.now();
    setElapsedMs(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => setElapsedMs(Date.now() - timerStartRef.current), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setElapsedMs(0);
  }, []);

  const teardown = useCallback(() => {
    stopRingtone();
    stopTimer();
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        /* noop */
      }
    });
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    callIdRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setConnectionStates(new Map());
    setParticipants([]);
    setPhase('idle');
    setCallType(null);
    setMuted(false);
    setCameraOff(false);
  }, [stopTimer]);

  const createPeerConnection = useCallback((remoteSocketId: string) => {
    const pc = new RTCPeerConnection({ iceServers });
    peersRef.current.set(remoteSocketId, pc);
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate && callIdRef.current) {
        getSocket().emit('call:signal', { callId: callIdRef.current, to: remoteSocketId, type: 'ice-candidate', payload: e.candidate });
      }
    };
    pc.ontrack = (e) => setRemoteStreams((prev) => new Map(prev).set(remoteSocketId, e.streams[0]));
    pc.onconnectionstatechange = () => setConnectionStates((prev) => new Map(prev).set(remoteSocketId, pc.connectionState));

    return pc;
  }, []);

  const initiateOfferTo = useCallback(
    async (remoteSocketId: string) => {
      const pc = createPeerConnection(remoteSocketId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket().emit('call:signal', { callId: callIdRef.current, to: remoteSocketId, type: 'offer', payload: offer });
      } catch (err) {
        console.error('Failed to create call offer:', err);
      }
    },
    [createPeerConnection]
  );

  async function confirmDeviceSwitch(): Promise<boolean> {
    return window.confirm("You're already in this call on another device. Switch the call to this device?");
  }

  const handleCallAck = useCallback(
    async (ack: CallInviteAck | undefined, retry: (forceSwitch: boolean) => void) => {
      if (!ack || !ack.success) {
        if (ack?.code === 'already-in-call' && (await confirmDeviceSwitch())) {
          if (phaseRef.current === 'idle') return; // hung up locally while waiting
          retry(true);
          return;
        }
        if (phaseRef.current !== 'idle') {
          showToast(ack?.message || 'Could not connect the call');
          teardown();
        }
        return;
      }
      if (phaseRef.current === 'idle') {
        // Hung up locally before the server responded — tell it to leave.
        if (ack.callId) getSocket().emit('call:leave', { callId: ack.callId });
        return;
      }
      callIdRef.current = ack.callId || null;
      // Only a call that already had people in it (an existing room call
      // we're joining) is 'active' immediately. A brand-new outgoing call
      // has no participants yet — it stays 'outgoing' (still ringing) until
      // call:participant-joined actually fires; forcing 'active' here would
      // show the in-call UI before anyone has answered. acceptIncoming
      // already sets 'active' itself before this ack even returns.
      if (ack.participants && ack.participants.length) {
        stopRingtone();
        startTimer();
        setParticipants(ack.participants);
        setPhase('active');
      }
    },
    [showToast, teardown, startTimer]
  );

  const startCall = useCallback(
    async (type: CallType) => {
      if (phaseRef.current !== 'idle') {
        showToast("You're already in a call");
        return;
      }
      const iceServersReady = refreshIceServers();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints(type) });
      } catch {
        showToast('Camera/microphone access is not available');
        return;
      }
      await iceServersReady;

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallType(type);
      setPhase('outgoing');
      startRingtone('outgoing');

      const send = (forceSwitch: boolean) => {
        getSocket().emit('call:invite', { callType: type, forceSwitch }, (ack: CallInviteAck) => handleCallAck(ack, send));
      };
      send(false);
    },
    [showToast, handleCallAck]
  );

  const acceptIncoming = useCallback(async () => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    stopRingtone();
    setIncomingCall(null);

    const iceServersReady = refreshIceServers();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints(incoming.callType) });
    } catch {
      showToast('Camera/microphone access is not available');
      getSocket().emit('call:decline', { callId: incoming.callId });
      return;
    }
    await iceServersReady;

    localStreamRef.current = stream;
    callIdRef.current = incoming.callId;
    setLocalStream(stream);
    setCallType(incoming.callType);
    setPhase('active');
    startTimer();

    const send = (forceSwitch: boolean) => {
      getSocket().emit('call:accept', { callId: incoming.callId, forceSwitch }, (ack: CallInviteAck) => handleCallAck(ack, send));
    };
    send(false);
  }, [showToast, startTimer, handleCallAck]);

  const declineIncoming = useCallback(() => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    getSocket().emit('call:decline', { callId: incoming.callId });
    stopRingtone();
    setIncomingCall(null);
    setPhase('idle');
  }, []);

  const hangUp = useCallback(() => {
    if (incomingCallRef.current) {
      declineIncoming();
      return;
    }
    if (callIdRef.current) getSocket().emit('call:leave', { callId: callIdRef.current });
    teardown();
  }, [declineIncoming, teardown]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  }, []);

  // ---- socket wiring (registered once the socket/user is ready) ----
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();

    function onIncoming(payload: IncomingCallPayload) {
      if (phaseRef.current !== 'idle' || incomingCallRef.current) {
        socket.emit('call:decline', { callId: payload.callId }); // busy
        return;
      }
      setIncomingCall(payload);
      setPhase('incoming');
      startRingtone('incoming');
    }

    async function onSignal({ callId, from, fromUser, type, payload }: CallSignalPayload) {
      if (callIdRef.current !== callId) return;
      let pc = peersRef.current.get(from);
      try {
        if (type === 'offer') {
          if (!pc) pc = createPeerConnection(from);
          setParticipants((prev) => (prev.some((p) => p.socketId === from) ? prev : [...prev, fromUser]));
          await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal', { callId, to: from, type: 'answer', payload: answer });
        } else if (type === 'answer') {
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
        } else if (type === 'ice-candidate') {
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
            } catch (err) {
              console.warn('Failed to add ICE candidate:', err);
            }
          }
        }
      } catch (err) {
        console.error('call:signal handling error:', err);
      }
    }

    function onParticipantJoined({ callId, participant }: CallParticipantJoinedPayload) {
      if (callIdRef.current !== callId) return;
      stopRingtone();
      startTimer();
      setPhase('active');
      setParticipants((prev) => (prev.some((p) => p.socketId === participant.socketId) ? prev : [...prev, participant]));
      initiateOfferTo(participant.socketId);
    }

    function onParticipantLeft({ callId, socketId }: CallParticipantLeftPayload) {
      if (callIdRef.current !== callId) return;
      const pc = peersRef.current.get(socketId);
      if (pc) {
        try {
          pc.close();
        } catch {
          /* noop */
        }
      }
      peersRef.current.delete(socketId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setConnectionStates((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    }

    function onDeclined({ callId, by }: CallDeclinedPayload) {
      if (callIdRef.current === callId) showToast(`${by.fullName} declined the call`);
    }

    function onDeviceSwitched({ callId }: { callId: string }) {
      if (callIdRef.current === callId) {
        showToast('This call moved to another device');
        teardown();
      }
    }

    function callEndMessage(reason: string) {
      switch (reason) {
        case 'declined':
          return 'Call declined';
        case 'no-answer':
          return 'No answer';
        case 'disconnected':
          return 'Call disconnected';
        case 'answered-elsewhere':
          return 'Answered on another device';
        default:
          return 'Call ended';
      }
    }

    function onEnded({ callId, reason }: CallEndedPayload) {
      if (callIdRef.current === callId) {
        showToast(callEndMessage(reason));
        teardown();
      } else if (incomingCallRef.current?.callId === callId) {
        stopRingtone();
        setIncomingCall(null);
        setPhase('idle');
        if (reason !== 'declined') showToast('Missed call');
      }
    }

    function onConnect() {
      refreshIceServers();
    }

    socket.on('call:incoming', onIncoming);
    socket.on('call:signal', onSignal);
    socket.on('call:participant-joined', onParticipantJoined);
    socket.on('call:participant-left', onParticipantLeft);
    socket.on('call:declined', onDeclined);
    socket.on('call:device-switched', onDeviceSwitched);
    socket.on('call:ended', onEnded);
    socket.on('connect', onConnect);
    refreshIceServers(); // warm up immediately in case connect already fired

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:signal', onSignal);
      socket.off('call:participant-joined', onParticipantJoined);
      socket.off('call:participant-left', onParticipantLeft);
      socket.off('call:declined', onDeclined);
      socket.off('call:device-switched', onDeviceSwitched);
      socket.off('call:ended', onEnded);
      socket.off('connect', onConnect);
    };
  }, [currentUser, createPeerConnection, initiateOfferTo, showToast, teardown, startTimer]);

  return {
    phase,
    callType,
    incomingCall,
    participants,
    localStream,
    remoteStreams,
    connectionStates,
    muted,
    cameraOff,
    elapsedMs,
    toast,
    startCall,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
  };
}
