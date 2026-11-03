import React, { useEffect, useState } from 'react';
import { HandData } from '../../types';
import { ArrowLeft, Check } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';

interface CalibrationProps {
  p1Hand: HandData;
  p2Hand: HandData;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
  onCalibrationComplete: () => void;
  onBack: () => void;
}

export const Calibration: React.FC<CalibrationProps> = ({
  p1Hand,
  p2Hand,
  previewCanvasRef,
  onCalibrationComplete,
  onBack,
}) => {
  const [autoStarted, setAutoStarted] = useState(false);
  const bothReady = p1Hand.isDetected && p2Hand.isDetected;

  // Optional subtle audio prompt when both players are detected
  useEffect(() => {
    if (bothReady && !autoStarted) {
      audioManager.playVictory();
      setAutoStarted(true);
    }
  }, [bothReady, autoStarted]);

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-6 md:p-8 bg-[#0B0E0D] text-[#EAE7DE] overflow-y-auto">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={() => {
            audioManager.playButtonClick();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#121715] hover:bg-[#171D1A] border border-[#303833] text-xs font-medium text-[#A6AAA2] hover:text-[#EAE7DE] tracking-wider transition"
        >
          <ArrowLeft size={14} />
          <span>BACK</span>
        </button>

        <span className="font-mono text-xs uppercase tracking-widest text-[#A6AAA2]">
          CALIBRATION
        </span>
      </header>

      {/* Main Calibration Area */}
      <main className="max-w-4xl w-full mx-auto my-auto py-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#EAE7DE] uppercase mb-1.5">
          CALIBRATION
        </h2>
        <p className="text-xs md:text-sm text-[#A6AAA2] mb-8">
          Place both hands in front of the camera
        </p>

        {/* 3-Column Center Layout: Left Card, Center Webcam, Right Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center mb-6">
          {/* Left Status Card: PLAYER 1 · BLUE */}
          <div className="md:col-span-3 flex flex-col justify-between p-5 rounded-xl bg-[#121715] border border-[#303833] text-left">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#168BFF]" />
                <span className="font-bold text-xs tracking-wider uppercase text-[#EAE7DE]">
                  PLAYER 1 · BLUE
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] text-[#A6AAA2] block">Detection State:</span>
                <span className={`text-sm font-semibold ${p1Hand.isDetected ? 'text-[#168BFF]' : 'text-[#A6AAA2]'}`}>
                  {p1Hand.isDetected ? 'Detected' : 'Searching...'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] text-[#A6AAA2] block">Confidence:</span>
                <span className="font-mono text-lg font-bold text-[#EAE7DE]">
                  {p1Hand.isDetected ? `${Math.round(p1Hand.confidence * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Small Blue Hand-Landmark Illustration */}
            <div className="w-full aspect-[4/3] rounded bg-[#0B0E0D] border border-[#303833] p-2 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-20 h-20 select-none" fill="none">
                {/* Palm bones */}
                <path d="M 50 85 L 50 55 L 30 40 L 40 25 M 50 55 L 45 22 M 50 55 L 55 20 M 50 55 L 65 24 M 50 55 L 75 35" stroke={p1Hand.isDetected ? '#168BFF' : '#303833'} strokeWidth="1.5" />
                {/* Joints */}
                {[
                  [50, 85], [50, 55], [30, 40], [40, 25],
                  [45, 22], [55, 20], [65, 24], [75, 35]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r={i === 0 ? 3.5 : 2.5} fill={p1Hand.isDetected ? '#168BFF' : '#303833'} />
                ))}
              </svg>
            </div>
          </div>

          {/* Center Area: Webcam Preview */}
          <div className="md:col-span-6 flex flex-col items-center">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0B0E0D] border-2 border-[#303833]">
              <canvas
                ref={previewCanvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Status Card: PLAYER 2 · RED */}
          <div className="md:col-span-3 flex flex-col justify-between p-5 rounded-xl bg-[#121715] border border-[#303833] text-left">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E65361]" />
                <span className="font-bold text-xs tracking-wider uppercase text-[#EAE7DE]">
                  PLAYER 2 · RED
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] text-[#A6AAA2] block">Detection State:</span>
                <span className={`text-sm font-semibold ${p2Hand.isDetected ? 'text-[#E65361]' : 'text-[#A6AAA2]'}`}>
                  {p2Hand.isDetected ? 'Detected' : 'Searching...'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] text-[#A6AAA2] block">Confidence:</span>
                <span className="font-mono text-lg font-bold text-[#EAE7DE]">
                  {p2Hand.isDetected ? `${Math.round(p2Hand.confidence * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Small Red Hand-Landmark Illustration */}
            <div className="w-full aspect-[4/3] rounded bg-[#0B0E0D] border border-[#303833] p-2 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-20 h-20 select-none" fill="none">
                {/* Palm bones */}
                <path d="M 50 85 L 50 55 L 70 40 L 60 25 M 50 55 L 55 22 M 50 55 L 45 20 M 50 55 L 35 24 M 50 55 L 25 35" stroke={p2Hand.isDetected ? '#E65361' : '#303833'} strokeWidth="1.5" />
                {/* Joints */}
                {[
                  [50, 85], [50, 55], [70, 40], [60, 25],
                  [55, 22], [45, 20], [35, 24], [25, 35]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r={i === 0 ? 3.5 : 2.5} fill={p2Hand.isDetected ? '#E65361' : '#303833'} />
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Below Camera: Compact Green Confirmation Pill */}
        <div className="flex flex-col items-center gap-4">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-medium transition ${
              bothReady
                ? 'bg-[#121715] border-[#65B987]/60 text-[#65B987]'
                : 'bg-[#121715] border-[#303833] text-[#A6AAA2]'
            }`}
          >
            {bothReady && <Check size={13} className="text-[#65B987]" />}
            <span>{bothReady ? 'Both Players Ready!' : 'Waiting for both players...'}</span>
          </div>

          {/* Large Warm Off-White "START MATCH" Button */}
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onCalibrationComplete();
            }}
            className="w-full max-w-sm py-4 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-sm font-bold tracking-[0.15em] uppercase transition shadow-sm hover:scale-[1.01] active:scale-[0.99]"
          >
            START MATCH
          </button>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#A6AAA2]">
        Player 1 on the left (Blue) · Player 2 on the right (Red)
      </footer>
    </div>
  );
};
