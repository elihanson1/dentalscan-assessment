"use client";

/**
 * CHALLENGE: SCAN ENHANCEMENT
 *
 * 1. Visual Guidance Overlay — SVG ellipse + inner tooth-row silhouette centered on the video feed.
 * 2. Real-time stability feedback — pixel-variance sampler with hysteresis so color doesn't oscillate.
 * 3. Capture button locked (grey) until stability reaches "high" (green), then unlocks.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type StabilityTier = "low" | "medium" | "high";

const STABILITY_COLORS: Record<StabilityTier, string> = {
  low: "#ef4444",
  medium: "#f59e0b",
  high: "#22c55e",
};

const STABILITY_LABELS: Record<StabilityTier, string> = {
  low: "Hold steady…",
  medium: "Almost there…",
  high: "Ready — tap to capture",
};

function useStabilityScore(videoRef: React.RefObject<HTMLVideoElement>, active: boolean) {
  const [tier, setTier] = useState<StabilityTier>("low");
  const rafRef = useRef<number>(0);
  const prevPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const stableFramesRef = useRef(0);
  const unstableFramesRef = useRef(0);
  const currentTierRef = useRef<StabilityTier>("low");
  const samplerCanvas = useRef<HTMLCanvasElement | null>(null);
  const warmupFramesRef = useRef(0);

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

      // Skip first 30 frames so auto-exposure can settle before measuring stability
      if (warmupFramesRef.current < 30) {
        warmupFramesRef.current += 1;
        ctx.drawImage(video, 0, 0, 32, 32);
        prevPixelsRef.current = new Uint8ClampedArray(ctx.getImageData(0, 0, 32, 32).data);
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
        const meanSad = sad / (32 * 32);
        const isStable = meanSad < 18;

        if (isStable) {
          stableFramesRef.current += 1;
          unstableFramesRef.current = 0;
        } else {
          unstableFramesRef.current += 1;
          stableFramesRef.current = 0;
        }

        const cur = currentTierRef.current;
        let next = cur;

        if (cur === "low" && stableFramesRef.current >= 20) next = "medium";
        else if (cur === "medium" && stableFramesRef.current >= 35) next = "high";
        else if (cur === "high" && unstableFramesRef.current >= 5) next = "medium";
        else if (cur === "medium" && unstableFramesRef.current >= 5) next = "low";

        if (next !== cur) {
          currentTierRef.current = next;
          setTier(next);
        }
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
    warmupFramesRef.current = 0;
    setTier("low");
  }, []);

  return { tier, reset };
}

const VIEWS = [
  { label: "Front View", instruction: "Smile and look straight at the camera." },
  { label: "Left View", instruction: "Turn your head to the left." },
  { label: "Right View", instruction: "Turn your head to the right." },
  { label: "Upper Teeth", instruction: "Tilt your head back and open wide." },
  { label: "Lower Teeth", instruction: "Tilt your head down and open wide." },
];

export default function ScanningFlow() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const scanActive = camReady && currentStep < 5;
  const { tier, reset } = useStabilityScore(videoRef, scanActive);

  useEffect(() => {
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
        setCamError("Camera access required for scan — refresh and try again");
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImages((prev) => [...prev, dataUrl]);
      setCurrentStep((prev) => prev + 1);
      reset();
    }
  }, [reset]);

  const overlayColor = STABILITY_COLORS[tier];
  const canCapture = tier === "high";

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

            {/* View-specific guidance overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {currentStep <= 2 ? (
                <svg
                  viewBox="0 0 200 250"
                  className="w-[52%]"
                  style={{ filter: `drop-shadow(0 0 6px ${overlayColor}88)` }}
                >
                  <motion.path
                    d="M100,12 C150,12 178,50 178,95 C178,148 158,190 132,204 C122,212 100,216 100,216 C100,216 78,212 68,204 C42,190 22,148 22,95 C22,50 50,12 100,12 Z"
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    animate={{ stroke: overlayColor }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Chin curve */}
                  <motion.path
                    d="M68,204 C78,228 122,228 132,204"
                    fill="none"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    animate={{ stroke: overlayColor, opacity: 0.4 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Mouth area hint */}
                  <motion.path
                    d="M65,158 C72,168 100,172 135,158"
                    fill="none"
                    strokeWidth="1.2"
                    strokeDasharray="3 4"
                    animate={{ stroke: overlayColor, opacity: 0.35 }}
                    transition={{ duration: 0.4 }}
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 200 100"
                  className="w-[78%]"
                  style={{ filter: `drop-shadow(0 0 6px ${overlayColor}88)` }}
                >
                  {/* Lips with cupid's bow */}
                  <motion.path
                    d="M18,52 C22,36 46,22 66,28 C78,32 88,44 100,41 C112,44 122,32 134,28 C154,22 178,36 182,52 C168,74 134,86 100,88 C66,86 32,74 18,52 Z"
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    animate={{ stroke: overlayColor }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Tooth line */}
                  <motion.path
                    d="M18,52 C50,46 80,44 100,44 C120,44 150,46 182,52"
                    fill="none"
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                    animate={{ stroke: overlayColor, opacity: 0.5 }}
                    transition={{ duration: 0.4 }}
                  />
                </svg>
              )}
            </div>

            {/* Stability label */}
            <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={tier}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] font-medium px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm"
                  style={{ color: overlayColor }}
                >
                  {STABILITY_LABELS[tier]}
                </motion.span>
              </AnimatePresence>
            </div>

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

      {/* Capture button — locked (grey) until stability is high (green) */}
      <div className="p-10 w-full flex justify-center">
        {currentStep < 5 && (
          <motion.button
            onClick={handleCapture}
            disabled={!canCapture}
            animate={{
              borderColor: canCapture ? "#22c55e" : "#52525b",
              scale: canCapture ? 1 : 0.95,
            }}
            transition={{ duration: 0.3 }}
            className="w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-90 transition-transform disabled:cursor-not-allowed"
          >
            <motion.div
              animate={{ backgroundColor: canCapture ? "#22c55e" : "#3f3f46" }}
              transition={{ duration: 0.3 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
            >
              <Camera className={canCapture ? "text-white" : "text-zinc-500"} />
            </motion.div>
          </motion.button>
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
