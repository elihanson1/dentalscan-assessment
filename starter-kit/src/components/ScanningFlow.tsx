"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        setCamError("Camera access required for scan — refresh and try again.");
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
    }
  }, []);

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

            {/* Head outline overlay — all steps */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg
                viewBox="0 0 200 250"
                className="w-[72%]"
                style={{ filter: "drop-shadow(0 0 8px #ffffff44)" }}
              >
                <path
                  d="M100,12 C150,12 178,50 178,95 C178,148 158,190 132,204 C122,212 100,216 100,216 C100,216 78,212 68,204 C42,190 22,148 22,95 C22,50 50,12 100,12 Z"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  opacity="0.7"
                />
                <path
                  d="M68,204 C78,228 122,228 132,204"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.35"
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

      {/* Capture button — always active once camera is ready */}
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
