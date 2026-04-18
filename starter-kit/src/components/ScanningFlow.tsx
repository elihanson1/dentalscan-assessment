"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
type StabilityTier = "low" | "medium" | "high";

const STABILITY_COLORS: Record<StabilityTier, string> = {
  low: "#ef4444",
  medium: "#f59e0b",
  high: "#22c55e",
};

function useStabilityScore(videoRef: React.RefObject<HTMLVideoElement>, active: boolean) {
  const [tier, setTier] = useState<StabilityTier>("low");
  const rafRef = useRef<number>(0);
  const prevPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const stableFramesRef = useRef(0);
  const unstableFramesRef = useRef(0);
  const currentTierRef = useRef<StabilityTier>("low");
  const samplerCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!samplerCanvas.current) {
      samplerCanvas.current = document.createElement("canvas");
      samplerCanvas.current.width = 32;
      samplerCanvas.current.height = 32;
    }
    const canvas = samplerCanvas.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function sample() {
      const video = videoRef.current;
      if (!video || !ctx || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(sample);
        return;
      }
      ctx.drawImage(video, 0, 0, 32, 32);
      const { data } = ctx.getImageData(0, 0, 32, 32);
      const prev = prevPixelsRef.current;

      if (prev !== null) {
        let sad = 0;
        for (let i = 0; i < data.length; i += 4) {
          sad += Math.abs(data[i] - prev[i]) + Math.abs(data[i + 1] - prev[i + 1]) + Math.abs(data[i + 2] - prev[i + 2]);
        }
        const isStable = sad / (32 * 32) < 18;

        if (isStable) { stableFramesRef.current += 1; unstableFramesRef.current = 0; }
        else { unstableFramesRef.current += 1; stableFramesRef.current = 0; }

        const cur = currentTierRef.current;
        let next = cur;
        if (cur === "low" && stableFramesRef.current >= 20) next = "medium";
        else if (cur === "medium" && stableFramesRef.current >= 35) next = "high";
        else if (cur === "high" && unstableFramesRef.current >= 5) next = "medium";
        else if (cur === "medium" && unstableFramesRef.current >= 5) next = "low";

        if (next !== cur) { currentTierRef.current = next; setTier(next); }
      }

      prevPixelsRef.current = new Uint8ClampedArray(data);
      rafRef.current = requestAnimationFrame(sample);
    }

    rafRef.current = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, videoRef]);

  const reset = useCallback(() => {
    stableFramesRef.current = 0;
    unstableFramesRef.current = 0;
    currentTierRef.current = "low";
    prevPixelsRef.current = null;
    setTier("low");
  }, []);

  return { tier, reset };
}

const VIEWS = [
  { label: "Front View", instruction: "Smile with your teeth and look straight at the camera." },
  { label: "Left View", instruction: "Keep smiling and turn your head to the left." },
  { label: "Right View", instruction: "Keep smiling and turn your head to the right." },
  { label: "Upper Teeth", instruction: "Tilt your head back and open wide." },
  { label: "Lower Teeth", instruction: "Tilt your head down and open wide." },
];

function FaceIllustration({ step }: { step: number }) {
  const containerTransforms: Record<number, string> = {
    0: "perspective(400px) rotateY(0deg)",
    1: "perspective(400px) rotateY(35deg)",
    2: "perspective(400px) rotateY(-35deg)",
    3: "perspective(400px) rotateX(30deg)",
    4: "perspective(400px) rotateX(-25deg)",
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{ transform: containerTransforms[step], transition: "transform 0.4s ease" }}
    >
      <svg viewBox="0 0 200 250" className="w-40 h-auto" style={{ filter: "drop-shadow(0 0 10px #14b8a688)" }}>
        {/* Head */}
        <path
          d="M100,12 C150,12 178,50 178,95 C178,148 158,190 132,204 C122,212 100,216 100,216 C100,216 78,212 68,204 C42,190 22,148 22,95 C22,50 50,12 100,12 Z"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="3"
          strokeDasharray="6 4"
        />
        {/* Chin */}
        <path
          d="M68,204 C78,228 122,228 132,204"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        {/* Eyes */}
        <ellipse cx="72" cy="100" rx="10" ry="7" fill="none" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6" />
        <ellipse cx="128" cy="100" rx="10" ry="7" fill="none" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6" />
        {/* Mouth */}
        <path
          d="M78,155 C88,164 112,164 122,155"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Step-specific arrow */}
        {step === 1 && (
          <g>
            <line x1="175" y1="110" x2="140" y2="110" stroke="#14b8a6" strokeWidth="2.5" />
            <polyline points="148,102 140,110 148,118" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        )}
        {step === 2 && (
          <g>
            <line x1="25" y1="110" x2="60" y2="110" stroke="#14b8a6" strokeWidth="2.5" />
            <polyline points="52,102 60,110 52,118" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        )}
        {step === 3 && (
          <g>
            <line x1="100" y1="20" x2="100" y2="50" stroke="#14b8a6" strokeWidth="2.5" />
            <polyline points="92,28 100,20 108,28" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        )}
        {step === 4 && (
          <g>
            <line x1="100" y1="230" x2="100" y2="200" stroke="#14b8a6" strokeWidth="2.5" />
            <polyline points="92,222 100,230 108,222" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </div>
  );
}

const TUTORIAL_SLIDES = [
  {
    title: "Front View",
    description: "Face the camera straight on with a relaxed smile with your teeth showing. Keep your chin level.",
  },
  {
    title: "Left Side",
    description: "Keep smiling - Turn your head to the left so the camera sees your right cheek.",
  },
  {
    title: "Right Side",
    description: "Keep smiling - Turn your head to the right so the camera sees your left cheek.",
  },
  {
    title: "Upper Teeth",
    description: "Tilt your head back and open your mouth wide to show your upper teeth.",
  },
  {
    title: "Lower Teeth",
    description: "Tilt your head down and open your mouth wide to show your lower teeth.",
  },
];

function Tutorial({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const dragStartX = useRef(0);

  const goNext = () => setSlide((s) => Math.min(s + 1, TUTORIAL_SLIDES.length - 1));
  const goPrev = () => setSlide((s) => Math.max(s - 1, 0));

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white">
      <div className="p-4 w-full bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
        <h1 className="font-bold text-teal-400">DentalScan AI</h1>
        <span className="text-xs text-zinc-500">How it works</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 gap-8">
        {/* Illustration */}
        <div
          className="w-full flex items-center justify-center py-8"
          onPointerDown={(e) => { dragStartX.current = e.clientX; }}
          onPointerUp={(e) => {
            const delta = e.clientX - dragStartX.current;
            if (delta < -40) goNext();
            else if (delta > 40) goPrev();
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-6"
            >
              <FaceIllustration step={slide} />
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-2">{TUTORIAL_SLIDES[slide].title}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">{TUTORIAL_SLIDES[slide].description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-2">
          {TUTORIAL_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === slide ? "bg-teal-400" : "bg-zinc-600"}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex w-full items-center justify-between gap-4">
          <button
            onClick={goPrev}
            disabled={slide === 0}
            className="p-2 rounded-full border border-zinc-700 disabled:opacity-20 text-zinc-400"
          >
            <ChevronLeft size={20} />
          </button>

          {slide === TUTORIAL_SLIDES.length - 1 ? (
            <button
              onClick={onDone}
              className="flex-1 py-3 rounded-full bg-teal-500 text-black font-bold text-sm tracking-wide active:scale-95 transition-transform"
            >
              Got it — Start Scan
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex-1 py-3 rounded-full border border-zinc-700 text-white text-sm active:scale-95 transition-transform"
            >
              Next
            </button>
          )}

          <button
            onClick={goNext}
            disabled={slide === TUTORIAL_SLIDES.length - 1}
            className="p-2 rounded-full border border-zinc-700 disabled:opacity-20 text-zinc-400"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button onClick={onDone} className="text-xs text-zinc-600 underline">
          Skip
        </button>
      </div>
    </div>
  );
}

export default function ScanningFlow() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const scanActive = camReady && currentStep < 5;
  const { tier, reset } = useStabilityScore(videoRef, scanActive);
  const overlayColor = STABILITY_COLORS[tier];

  useEffect(() => {
    if (showTutorial) return;
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCamReady(true);
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setCamError("Camera access required for scan — refresh and try again.");
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [showTutorial]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");

    setCapturedImages((prev) => {
      const next = [...prev, dataUrl];
      // All 5 angles captured — submit to upload endpoint
      if (next.length === VIEWS.length) {
        void fetch("/api/scans/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: next }),
        }).catch((err) => console.error("Upload failed:", err));
      }
      return next;
    });

    setCurrentStep((prev) => prev + 1);
    reset();
  }, [reset]);

  if (showTutorial) {
    return <Tutorial onDone={() => setShowTutorial(false)} />;
  }

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white">
      {/* Header */}
      <div className="p-4 w-full bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
        <h1 className="font-bold text-teal-400">DentalScan AI</h1>
        <span className="text-xs text-zinc-500">
          {currentStep < 5 ? `${VIEWS[currentStep].label} · Step ${currentStep + 1}/5` : "Complete"}
        </span>
      </div>

      {camError && (
        <div className="w-full max-w-md px-4 py-3 mt-2 bg-red-900/60 border border-red-700 rounded text-sm text-red-200 text-center">
          {camError}
        </div>
      )}

      {/* Main Viewport */}
      <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-950 overflow-hidden flex items-center justify-center mt-1">
        {currentStep < 5 ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Head outline overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg
                viewBox="0 0 200 250"
                className="w-[72%]"
                style={{ filter: `drop-shadow(0 0 8px ${overlayColor}66)` }}
              >
                <motion.path
                  d="M100,12 C150,12 178,50 178,95 C178,148 158,190 132,204 C122,212 100,216 100,216 C100,216 78,212 68,204 C42,190 22,148 22,95 C22,50 50,12 100,12 Z"
                  fill="none"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  animate={{ stroke: overlayColor }}
                  transition={{ duration: 0.4 }}
                />
                <motion.path
                  d="M68,204 C78,228 122,228 132,204"
                  fill="none"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  animate={{ stroke: overlayColor, opacity: 0.45 }}
                  transition={{ duration: 0.4 }}
                />
              </svg>
            </div>

            {/* Instruction */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent" />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-[11px] text-zinc-300 uppercase tracking-widest px-4 text-center"
                >
                  {VIEWS[currentStep].instruction}
                </motion.p>
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="text-center p-10">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Scan Complete</h2>
            <p className="text-zinc-400 mt-2">Uploading results…</p>
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="p-10 w-full flex justify-center">
        {currentStep < 5 && (
          <button
            onClick={handleCapture}
            disabled={!camReady}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Camera className="text-black" />
            </div>
          </button>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 p-4 overflow-x-auto w-full">
        {VIEWS.map((v, i) => (
          <div
            key={i}
            className={`w-16 h-20 rounded border-2 shrink-0 ${
              i === currentStep ? "border-teal-500 bg-teal-500/10" : "border-zinc-800"
            }`}
          >
            {capturedImages[i] ? (
              <img src={capturedImages[i]} alt={v.label} className="w-full h-full object-cover rounded" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-zinc-600">{i + 1}</span>
                <span className="text-[8px] text-zinc-700 text-center leading-tight px-1">{v.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
