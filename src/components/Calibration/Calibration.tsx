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
    <div className="relative w-full h-full min-h-screen flex flex-col gap-3 p-3 md:gap-4 md:p-5 bg-[#0a0d12] text-[#f3f4f6] overflow-y-auto">
      {/* Header */}
      <header className="max-w-[1600px] w-full mx-auto flex items-center justify-between shrink-0">
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
          CALIBRATION : BLACK & RED MARKER DETECTION
        </span>
      </header>

      {/* Main calibration screen */}
      <main className="max-w-[1600px] w-full mx-auto py-1 text-center">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase mb-1">
          BLACK & RED WRIST MARKER CALIBRATION
        </h2>
        <p className="text-xs text-[#94a3b8] mb-3 max-w-lg mx-auto">
          Wear a <strong>BLACK</strong> marker or wristband for Player 1 and a <strong>RED</strong> one for Player 2.
          Only the wrist marker area is sampled; natural hand color is ignored.
        </p>

        {/* Live Calibration Canvas Container */}
        <div
          style={{ width: 'min(100%, 114vh)' }}
          className="relative aspect-video mx-auto rounded-2xl overflow-hidden bg-[#0f141c] border-2 border-[#263346] shadow-2xl mb-3"
        >
          <canvas
            ref={previewCanvasRef}
            width={640}
            height={360}
            className="w-full h-full object-cover"
          />

          {/* Both marker states stay visible without covering the camera view. */}
          <div className="absolute inset-x-0 top-0 pointer-events-none flex justify-between gap-2 p-2 md:p-4">
            <div className={`max-w-[48%] rounded-lg border px-3 py-2 backdrop-blur-md ${
              p1Hand.isDetected ? 'border-[#cbd5e1] bg-black/75 text-white' : 'border-white/30 bg-black/65 text-[#cbd5e1]'
            }`}>
              <span className="block text-left text-[10px] md:text-xs font-bold tracking-wide">
                {p1Hand.isDetected ? 'P1 BLACK DETECTED' : 'P1 BLACK NOT FOUND'}
              </span>
              {p1Hand.isDetected && p1Hand.detectedColor && (
                <span className="font-mono text-[10px]">{p1Hand.detectedColor.hex}</span>
              )}
            </div>
            <div className={`max-w-[48%] rounded-lg border px-3 py-2 backdrop-blur-md ${
              p2Hand.isDetected ? 'border-[#E65361] bg-black/75 text-white' : 'border-white/30 bg-black/65 text-[#cbd5e1]'
            }`}>
              <span className="block text-right text-[10px] md:text-xs font-bold tracking-wide">
                {p2Hand.isDetected ? 'P2 RED DETECTED' : 'P2 RED NOT FOUND'}
              </span>
              {p2Hand.isDetected && p2Hand.detectedColor && (
                <span className="font-mono text-[10px]">{p2Hand.detectedColor.hex}</span>
              )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 rounded-xl bg-[#0f141c] border border-[#263346] max-w-[1200px] mx-auto mb-3 text-left">
          {/* Black Marker Target Picker */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#141a24] border border-[#1e293b]">
            <div>
              <span className="text-xs font-bold text-[#cbd5e1] block">P1 Black Marker</span>
              <span className="text-[10px] font-mono text-[#94a3b8]">{p1ColorTarget.hex}</span>
            </div>
            <div className="flex items-center gap-2">
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
                  title="Sample live color from P1 black wrist marker"
                  className="p-1.5 rounded-lg bg-[#64748b]/20 hover:bg-[#64748b]/40 text-[#cbd5e1] text-xs font-semibold flex items-center gap-1"
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
              max={200}
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#168BFF] hover:bg-[#0d78e3] text-white font-bold text-sm tracking-wider uppercase transition shadow-xl shadow-[#168BFF]/25 hover:scale-[1.02]"
          >
            <Play size={16} fill="white" />
            <span>CONFIRM & ENTER MATCH</span>
          </button>
        </div>
      </main>

      <footer className="max-w-[1600px] w-full mx-auto text-center text-xs text-[#64748b] shrink-0">
        Use a black wristband or marker for Player 1 and a red wristband or marker for Player 2.
      </footer>
    </div>
  );
};
