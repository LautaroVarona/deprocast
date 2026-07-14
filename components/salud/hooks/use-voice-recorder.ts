"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = {
  isRecording: boolean;
  audioBlob: Blob | null;
  durationSec: number;
  error: string | null;
};

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDurationSec(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob.size > 0 ? blob : null);
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);
    } catch {
      setError("No se pudo acceder al micrófono.");
      stopTracks();
    }
  }, [stopTracks]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    await startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const clearRecording = useCallback(() => {
    if (isRecording) stopRecording();
    setAudioBlob(null);
    setDurationSec(0);
    setError(null);
  }, [isRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      recorderRef.current?.stop();
      stopTracks();
    };
  }, [stopTracks]);

  return {
    isRecording,
    audioBlob,
    durationSec,
    error,
    toggleRecording,
    clearRecording,
  };
}
