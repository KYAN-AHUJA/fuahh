import React, { useState, useEffect } from 'react';
import { HandData, ColorTarget } from '../../types';
import { CheckCircle2, AlertCircle, ArrowLeft, Play, Sparkles, Pipette, Sliders } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';

interface CalibrationProps {
  p1Hand: HandData;
  p2Hand: HandData;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
  p1ColorTarget: ColorTarget;
  p2ColorTarget: ColorTarget;
  colorTolerance: number;
  onUpdateColors: (p1: ColorTarget, p2: ColorTarget, tol: number) => void;
  onCalibrationComplete: () => void;
  onBack: () => void;
}

export const Calibration: React.FC<CalibrationProps> = ({
  p1Hand,
  p2Hand,
  previewCanvasRef,
  p1ColorTarget,
  p2ColorTarget,
  colorTolerance,
  onUpdateColors,
  onCalibrationComplete,
  onBack,
}) => {
  const [holdProgress, setHoldProgress] = useState(0);

  // Calibration progress when both hands are detected
  useEffect(() => {
    let interval: number;

    if (p1Hand.isDetected && p2Hand.isDetected) {
      interval = window.setInterval(() => {
        setHoldProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            audioManager.playVictory();
            onCalibrationComplete();
            return 100;
          }
          return prev + 4;
        });
      }, 50);
    } else {
      setHoldProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [p1Hand.isDetected, p2Hand.isDetected, onCalibrationComplete]);

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
      hex,
    };
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-6 bg-[#0a0d12] text-[#f3f4f6] overflow-y-auto">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={() => {
            audioManager.playButtonClick();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141a24] hover:bg-[#1a2230] border border-[#263346] text-xs font-semibold text-[#cbd5e1] tracking-wider transition"
        >
          <ArrowLeft size={16} />
          <span>BACK</span>
        </button>

        <span className="font-mono text-xs uppercase tracking-widest text-[#94a3b8]">
          CALIBRATION : BLUE & RED COLOR DETECTION
        </span>
      </header>

      {/* Main calibration screen */}
      <main className="max-w-4xl w-full mx-auto my-auto py-4 text-center">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase mb-1">
          RED & BLUE GLOVE / HAND CALIBRATION
        </h2>
        <p className="text-xs text-[#94a3b8] mb-4 max-w-lg mx-auto">
          Hold up your <strong>BLUE</strong> marker/glove for Player 1 and <strong>RED</strong> marker/glove for Player 2.
          The vision engine samples pixel colors from each hand in real-time.
        </p>

        {/* Live Calibration Canvas Container */}
        <div className="relative w-full aspect-video max-h-[380px] mx-auto rounded-3xl overflow-hidden bg-[#0f141c] border-2 border-[#263346] shadow-2xl mb-5">
          <canvas
            ref={previewCanvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />

          {/* Left / Right Target Zones Overlay */}
          <div className="absolute inset-0 pointer-events-none flex">
            {/* P1 Left Zone */}
            <div className={`w-1/2 h-full border-r border-[#263346] flex flex-col items-center justify-center p-4 transition-colors ${
              p1Hand.isDetected ? 'bg-[#168BFF]/10' : 'bg-transparent'
            }`}>
              <div className={`p-4 rounded-2xl border-2 transition-transform ${
                p1Hand.isDetected
                  ? 'border-[#168BFF] bg-[#168BFF]/20 scale-105 shadow-lg shadow-[#168BFF]/30'
                  : 'border-dashed border-[#168BFF]/40 bg-[#168BFF]/5'
              }`}>
                <span className="font-bold text-xs tracking-wider text-[#168BFF] block">
                  {p1Hand.isDetected ? '✓ P1 BLUE DETECTED' : 'PLACE BLUE HAND HERE'}
                </span>
                {p1Hand.isDetected && p1Hand.detectedColor && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span
                      className="w-4 h-4 rounded-full border border-white"
                      style={{ backgroundColor: p1Hand.detectedColor.hex }}
                    />
                    <span className="font-mono text-[10px] text-white">
                      {p1Hand.detectedColor.hex}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* P2 Right Zone */}
            <div className={`w-1/2 h-full flex flex-col items-center justify-center p-4 transition-colors ${
              p2Hand.isDetected ? 'bg-[#E65361]/10' : 'bg-transparent'
            }`}>
              <div className={`p-4 rounded-2xl border-2 transition-transform ${
                p2Hand.isDetected
                  ? 'border-[#E65361] bg-[#E65361]/20 scale-105 shadow-lg shadow-[#E65361]/30'
                  : 'border-dashed border-[#E65361]/40 bg-[#E65361]/5'
              }`}>
                <span className="font-bold text-xs tracking-wider text-[#E65361] block">
                  {p2Hand.isDetected ? '✓ P2 RED DETECTED' : 'PLACE RED HAND HERE'}
                </span>
                {p2Hand.isDetected && p2Hand.detectedColor && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span
                      className="w-4 h-4 rounded-full border border-white"
                      style={{ backgroundColor: p2Hand.detectedColor.hex }}
                    />
                    <span className="font-mono text-[10px] text-white">
                      {p2Hand.detectedColor.hex}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hold Countdown Bar */}
          {holdProgress > 0 && (
            <div className="absolute bottom-4 left-8 right-8">
              <div className="h-3 rounded-full bg-[#1e293b] overflow-hidden border border-[#38485e]">
                <div
                  className="h-full bg-gradient-to-r from-[#168BFF] via-[#06b6d4] to-[#E65361] transition-all duration-75"
                  style={{ width: `${holdProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-white mt-1 block">
                COLOR LOCK ACQUIRED... {holdProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Color Configuration Bar (Matches original Neon Arena controls) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#0f141c] border border-[#263346] max-w-3xl mx-auto mb-6 text-left">
          {/* Blue Target Picker */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#141a24] border border-[#1e293b]">
            <div>
              <span className="text-xs font-bold text-[#168BFF] block">P1 Blue Target</span>
              <span className="text-[10px] font-mono text-[#94a3b8]">{p1ColorTarget.hex}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={p1ColorTarget.hex}
                onChange={e => {
                  const rgb = hexToRgb(e.target.value);
                  onUpdateColors(rgb, p2ColorTarget, colorTolerance);
                }}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              {p1Hand.isDetected && p1Hand.detectedColor && (
                <button
                  onClick={() => {
                    audioManager.playButtonClick();
                    onUpdateColors(
                      { ...p1Hand.detectedColor!, hex: p1Hand.detectedColor!.hex },
                      p2ColorTarget,
                      colorTolerance
                    );
                  }}
                  title="Sample live color from P1 hand"
                  className="p-1.5 rounded-lg bg-[#168BFF]/20 hover:bg-[#168BFF]/40 text-[#168BFF] text-xs font-semibold flex items-center gap-1"
                >
                  <Pipette size={13} />
                  <span>Sample</span>
                </button>
              )}
            </div>
          </div>

          {/* Red Target Picker */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#141a24] border border-[#1e293b]">
            <div>
              <span className="text-xs font-bold text-[#E65361] block">P2 Red Target</span>
              <span className="text-[10px] font-mono text-[#94a3b8]">{p2ColorTarget.hex}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={p2ColorTarget.hex}
                onChange={e => {
                  const rgb = hexToRgb(e.target.value);
                  onUpdateColors(p1ColorTarget, rgb, colorTolerance);
                }}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              {p2Hand.isDetected && p2Hand.detectedColor && (
                <button
                  onClick={() => {
                    audioManager.playButtonClick();
                    onUpdateColors(
                      p1ColorTarget,
                      { ...p2Hand.detectedColor!, hex: p2Hand.detectedColor!.hex },
                      colorTolerance
                    );
                  }}
                  title="Sample live color from P2 hand"
                  className="p-1.5 rounded-lg bg-[#E65361]/20 hover:bg-[#E65361]/40 text-[#E65361] text-xs font-semibold flex items-center gap-1"
                >
                  <Pipette size={13} />
                  <span>Sample</span>
                </button>
              )}
            </div>
          </div>

          {/* Color Tolerance Slider */}
          <div className="flex flex-col justify-center p-2 rounded-xl bg-[#141a24] border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-[#cbd5e1] flex items-center gap-1">
                <Sliders size={13} className="text-[#06b6d4]" />
                <span>Tolerance</span>
              </span>
              <span className="font-mono text-[#06b6d4] font-bold">{colorTolerance}</span>
            </div>
            <input
              type="range"
              min={20}
              max={180}
              value={colorTolerance}
              onChange={e => {
                const tol = parseInt(e.target.value);
                onUpdateColors(p1ColorTarget, p2ColorTarget, tol);
              }}
              className="w-full h-1.5 rounded-lg bg-[#1e293b] accent-[#06b6d4] cursor-pointer"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onCalibrationComplete();
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#168BFF] hover:bg-[#0d78e3] text-white font-bold text-sm tracking-wider uppercase transition shadow-xl shadow-[#168BFF]/25 hover:scale-[1.02]"
          >
            <Play size={16} fill="white" />
            <span>CONFIRM & ENTER MATCH</span>
          </button>
        </div>
      </main>

      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-[#64748b]">
        You can also use colored stickers, wristbands, or cups to guide Player 1 (Blue) and Player 2 (Red).
      </footer>
    </div>
  );
};
