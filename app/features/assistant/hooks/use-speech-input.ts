import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const BAR_COUNT = 5;
const FFT_SIZE = 128;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechInput(editor: Editor | null) {
  const [isSupported] = useState(() => !!getSpeechRecognitionCtor());
  const [isListening, setIsListening] = useState(false);
  const [frequencyData, setFrequencyData] = useState<number[]>(() => Array(BAR_COUNT).fill(0));

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const pollFrequency = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const raw = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(raw);

    // Voice sits in the lower ~40% of bins; split that range across all bars
    const voiceBins = Math.ceil(raw.length * 0.4);
    const step = Math.max(1, Math.floor(voiceBins / BAR_COUNT));
    const bars: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < raw.length && raw[idx] > max) max = raw[idx];
      }
      const normalized = max / 255;
      // Power curve to boost quieter levels
      bars.push(Math.pow(normalized, 0.5));
    }
    setFrequencyData(bars);
    rafRef.current = requestAnimationFrame(pollFrequency);
  }, []);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioCtxRef.current?.state !== 'closed') {
      void audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;
    setFrequencyData(Array(BAR_COUNT).fill(0));
  }, []);

  const startListening = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !editor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          editor.commands.insertContent(transcript);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      stopAudio();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudio();
    };

    recognitionRef.current = recognition;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.minDecibels = -80;
      analyser.maxDecibels = -20;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      analyserRef.current = analyser;

      recognition.start();
      setIsListening(true);
      rafRef.current = requestAnimationFrame(pollFrequency);
    } catch {
      stopAudio();
    }
  }, [editor, pollFrequency, stopAudio]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    stopAudio();
  }, [stopAudio]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopAudio();
    };
  }, [stopAudio]);

  return { isSupported, isListening, frequencyData, startListening, stopListening };
}
