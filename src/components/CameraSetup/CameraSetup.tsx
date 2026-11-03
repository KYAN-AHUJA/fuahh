import React, { useEffect, useRef } from 'react';
import { Camera, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, RefreshCw, Gamepad2 } from 'lucide-react';
import { CameraStatus } from '../../hooks/useCamera';
import { audioManager } from '../../audio/AudioManager';

interface CameraSetupProps {
  status: CameraStatus;
  errorMessage: string | null;
  stream: MediaStream | null;
  onRequestCamera: () => void;
  onContinue: () => void;
  onFallbackToKeyboard: () => void;
  onBack: () => void;
}

export const CameraSetup: React.FC<CameraSetupProps> = ({
  status,
  errorMessage,
  stream,
  onRequestCamera,
  onContinue,
  onFallbackToKeyboard,
  onBack,
}) => {
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-8 bg-[#0B0E0D] text-[#EAE7DE] overflow-y-auto">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
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
          CAMERA INITIALIZATION
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-xl w-full mx-auto my-auto py-6 text-center">
        <div className="inline-flex p-3 rounded-md bg-[#121715] border border-[#303833] text-[#A6AAA2] mb-4">
          <Camera size={26} />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-[#EAE7DE] uppercase mb-2">
          CAMERA PERMISSION
        </h2>
        <p className="text-xs text-[#A6AAA2] mb-6 max-w-md mx-auto leading-relaxed">
          Neon Arena uses your webcam to detect hand movements in real-time. Video is processed locally in your browser and never leaves your device.
        </p>

        {/* Video Preview Box */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0B0E0D] border border-[#303833] mb-6 flex items-center justify-center">
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${status === 'active' ? 'block' : 'hidden'}`}
          />

          {status === 'idle' && (
            <div className="flex flex-col items-center gap-2.5 p-6 text-center">
              <Camera size={36} className="text-[#A6AAA2]" />
              <p className="text-xs text-[#A6AAA2]">Click below to enable camera tracking</p>
            </div>
          )}

          {status === 'requesting' && (
            <div className="flex flex-col items-center gap-2.5 p-6 text-center">
              <RefreshCw size={30} className="text-[#D9CCB2] animate-spin" />
              <p className="text-xs text-[#A6AAA2]">Requesting camera permission...</p>
            </div>
          )}

          {(status === 'denied' || status === 'error') && (
            <div className="flex flex-col items-center gap-2.5 p-6 text-center">
              <AlertCircle size={30} className="text-[#E65361]" />
              <span className="text-sm font-bold text-[#E65361]">Camera Access Blocked</span>
              <p className="text-xs text-[#A6AAA2] max-w-sm">
                {errorMessage || 'Camera permission was denied. You can play using Keyboard/Mouse controls or grant permission in browser settings.'}
              </p>
            </div>
          )}

          {status === 'active' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121715]/90 border border-[#65B987]/50 text-[#65B987] text-xs font-semibold backdrop-blur-sm">
              <CheckCircle2 size={13} />
              <span>Camera Ready</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {status !== 'active' ? (
            <>
              <button
                onClick={() => {
                  audioManager.playButtonClick();
                  onRequestCamera();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] font-bold text-xs tracking-wider uppercase transition shadow-sm"
              >
                <Camera size={16} />
                <span>ENABLE CAMERA</span>
              </button>

              <button
                onClick={() => {
                  audioManager.playButtonClick();
                  onFallbackToKeyboard();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-md bg-[#121715] hover:bg-[#171D1A] border border-[#303833] text-[#A6AAA2] hover:text-[#EAE7DE] font-semibold text-xs tracking-wider uppercase transition"
              >
                <Gamepad2 size={15} />
                <span>PLAY WITH KEYBOARD / MOUSE INSTEAD</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                audioManager.playButtonClick();
                onContinue();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] font-bold text-xs tracking-wider uppercase transition shadow-sm"
            >
              <span>CONTINUE TO CALIBRATION</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </main>

      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-[#A6AAA2]">
        All camera video frames are processed completely client-side in real-time.
      </footer>
    </div>
  );
};
