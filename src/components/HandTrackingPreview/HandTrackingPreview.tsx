import React, { useState } from 'react';
import { HandData } from '../../types';
import { Camera, Minimize2, Maximize2 } from 'lucide-react';

interface HandTrackingPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  p1Hand: HandData;
  p2Hand: HandData;
  isModelReady: boolean;
  cameraStatus?: string;
  trackingFps?: number;
  handsDetectedCount?: number;
  onClose?: () => void;
}

export const HandTrackingPreview: React.FC<HandTrackingPreviewProps> = ({
  canvasRef,
  p1Hand,
  p2Hand,
  isModelReady,
  cameraStatus = 'active',
  trackingFps = 60,
  handsDetectedCount,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Compute actual count from detection if not passed
  const activeHandsCount = handsDetectedCount !== undefined
    ? handsDetectedCount
    : (p1Hand.isDetected ? 1 : 0) + (p2Hand.isDetected ? 1 : 0);

  return (
    <div className="fixed top-16 right-4 z-30 w-64 bg-[#121715]/95 border border-[#303833] rounded-lg shadow-xl backdrop-blur-md overflow-hidden select-none transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#171D1A] border-b border-[#303833]">
        <div className="flex items-center gap-2">
          <Camera size={13} className="text-[#A6AAA2]" />
          <span className="text-[11px] font-semibold tracking-wider text-[#EAE7DE] uppercase">
            HAND TRACKING
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[#A6AAA2]">
            {trackingFps} FPS
          </span>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-0.5 text-[#A6AAA2] hover:text-[#EAE7DE] rounded hover:bg-[#303833] transition"
            title={isMinimized ? 'Expand preview' : 'Minimize preview'}
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-2.5 flex flex-col gap-2">
          {/* Live Webcam Thumbnail with Landmarks */}
          <div className="relative w-full aspect-video rounded bg-[#0B0E0D] border border-[#303833] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={320}
              height={180}
              className="w-full h-full object-cover"
            />
            {!isModelReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E0D]/80 text-[11px] text-[#A6AAA2]">
                Initializing model...
              </div>
            )}
          </div>

          {/* Stats Summary Line: Hands detected count & Camera status */}
          <div className="flex items-center justify-between px-1 text-[10px] font-mono text-[#A6AAA2]">
            <span className="flex items-center gap-1">
              <span>HANDS:</span>
              <strong className="text-[#EAE7DE]">{activeHandsCount}/2</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${cameraStatus === 'active' ? 'bg-[#65B987]' : 'bg-[#A6AAA2]'}`} />
              <span className="uppercase text-[#A6AAA2]">{cameraStatus}</span>
            </span>
          </div>

          {/* Player 1 and Player 2 Separate Detection States */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {/* Player 1 (Blue) */}
            <div
              className={`p-1.5 rounded border text-[10px] transition ${
                p1Hand.isDetected
                  ? 'bg-[#171D1A] border-[#168BFF]/50 text-[#EAE7DE]'
                  : 'bg-[#121715] border-[#303833] text-[#A6AAA2]'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${p1Hand.isDetected ? 'bg-[#168BFF]' : 'bg-[#303833]'}`} />
                  <span className="text-[#168BFF]">P1 BLUE</span>
                </span>
                <span className="font-mono text-[9px]">
                  {p1Hand.isDetected ? `${Math.round(p1Hand.confidence * 100)}%` : 'OFF'}
                </span>
              </div>
            </div>

            {/* Player 2 (Red) */}
            <div
              className={`p-1.5 rounded border text-[10px] transition ${
                p2Hand.isDetected
                  ? 'bg-[#171D1A] border-[#E65361]/50 text-[#EAE7DE]'
                  : 'bg-[#121715] border-[#303833] text-[#A6AAA2]'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${p2Hand.isDetected ? 'bg-[#E65361]' : 'bg-[#303833]'}`} />
                  <span className="text-[#E65361]">P2 RED</span>
                </span>
                <span className="font-mono text-[9px]">
                  {p2Hand.isDetected ? `${Math.round(p2Hand.confidence * 100)}%` : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
