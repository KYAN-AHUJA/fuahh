import React, { useState } from 'react';
import { HandData } from '../../types';
import { Camera, Minimize2, Maximize2, CheckCircle2, AlertCircle } from 'lucide-react';

interface HandTrackingPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  p1Hand: HandData;
  p2Hand: HandData;
  isModelReady: boolean;
  onClose?: () => void;
}

export const HandTrackingPreview: React.FC<HandTrackingPreviewProps> = ({
  canvasRef,
  p1Hand,
  p2Hand,
  isModelReady,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-[#0f141c]/90 border border-[#263346] rounded-xl shadow-2xl backdrop-blur-lg overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141a24] border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-[#06b6d4]" />
          <span className="text-xs font-semibold tracking-wider text-[#cbd5e1] uppercase">
            Color & Hand Pipeline
          </span>
          <span className={`w-2 h-2 rounded-full ${isModelReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-[#94a3b8] hover:text-white rounded hover:bg-[#1e293b]"
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3">
          {/* Canvas mirror video + landmarks */}
          <div className="relative w-52 h-36 rounded-lg overflow-hidden bg-black border border-[#1e293b]">
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className="w-full h-full object-cover"
            />
            {!isModelReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-xs text-[#94a3b8]">
                Loading model...
              </div>
            )}
          </div>

          {/* Player Detection & Sampled Color Indicators */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            {/* P1 status */}
            <div className={`p-1.5 rounded-md border text-[11px] ${
              p1Hand.isDetected
                ? 'bg-[#168BFF]/10 border-[#168BFF]/40 text-[#168BFF]'
                : 'bg-[#1e293b]/40 border-[#263346] text-[#64748b]'
            }`}>
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1">
                  {p1Hand.detectedColor && (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-white"
                      style={{ backgroundColor: p1Hand.detectedColor.hex }}
                    />
                  )}
                  <span>P1 BLACK</span>
                </span>
                {p1Hand.isDetected ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              </div>
              <div className="text-[10px] mt-0.5 opacity-80 flex items-center justify-between font-mono">
                <span>{p1Hand.isDetected ? `${Math.round(p1Hand.confidence * 100)}%` : 'Searching'}</span>
                {p1Hand.detectedColor && <span>{p1Hand.detectedColor.hex}</span>}
              </div>
            </div>

            {/* P2 status */}
            <div className={`p-1.5 rounded-md border text-[11px] ${
              p2Hand.isDetected
                ? 'bg-[#E65361]/10 border-[#E65361]/40 text-[#E65361]'
                : 'bg-[#1e293b]/40 border-[#263346] text-[#64748b]'
            }`}>
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1">
                  {p2Hand.detectedColor && (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-white"
                      style={{ backgroundColor: p2Hand.detectedColor.hex }}
                    />
                  )}
                  <span>P2 RED</span>
                </span>
                {p2Hand.isDetected ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              </div>
              <div className="text-[10px] mt-0.5 opacity-80 flex items-center justify-between font-mono">
                <span>{p2Hand.isDetected ? `${Math.round(p2Hand.confidence * 100)}%` : 'Searching'}</span>
                {p2Hand.detectedColor && <span>{p2Hand.detectedColor.hex}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
