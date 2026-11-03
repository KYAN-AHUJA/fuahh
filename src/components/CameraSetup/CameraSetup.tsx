import React from 'react';
import { Camera, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, RefreshCw, Gamepad2 } from 'lucide-react';
import { CameraStatus } from '../../hooks/useCamera';
import { audioManager } from '../../audio/AudioManager';

interface CameraSetupProps {
  status: CameraStatus;
  errorMessage: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onRequestCamera: () => void;
  onContinue: () => void;
  onFallbackToKeyboard: () => void;
  onBack: () => void;
}

export const CameraSetup: React.FC<CameraSetupProps> = ({
  status,
  errorMessage,
  videoRef,
  onRequestCamera,
  onContinue,
  onFallbackToKeyboard,
  onBack,
}) => {
  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-8 bg-[#0a0d12] text-[#f3f4f6]">
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
          STEP 3 / 3 : WEBCAM INITIALIZATION
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-xl w-full mx-auto my-auto py-6 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#06b6d4] mb-4">
          <Camera size={32} />
        </div>

        <h2 className="text-3xl font-black tracking-tight text-white uppercase mb-2">
          CAMERA PERMISSION
        </h2>
        <p className="text-xs text-[#94a3b8] mb-6 max-w-md mx-auto">
          Neon Arena uses your webcam to detect hand movements in real-time. Video is processed locally in your browser and never leaves your device.
        </p>

        {/* Video Preview Box */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#0f141c] border border-[#263346] mb-6 shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${status === 'active' ? 'block' : 'hidden'}`}
          />

          {status === 'idle' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <Camera size={40} className="text-[#64748b]" />
              <p className="text-xs text-[#94a3b8]">Click the button below to enable camera tracking</p>
            </div>
          )}

          {status === 'requesting' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <RefreshCw size={36} className="text-[#06b6d4] animate-spin" />
              <p className="text-xs text-[#94a3b8]">Requesting webcam access from browser...</p>
            </div>
          )}

          {(status === 'denied' || status === 'error') && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <AlertCircle size={36} className="text-rose-500" />
              <span className="text-sm font-bold text-rose-400">Camera Access Blocked</span>
              <p className="text-xs text-[#94a3b8] max-w-sm">
                {errorMessage || 'Camera permission was denied. You can play using Keyboard/Mouse controls or grant permission in browser settings.'}
              </p>
            </div>
          )}

          {status === 'active' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold backdrop-blur-md">
              <CheckCircle2 size={13} />
              <span>Camera Connected</span>
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
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold text-sm tracking-wider uppercase transition shadow-lg shadow-[#06b6d4]/20"
              >
                <Camera size={18} />
                <span>ENABLE WEBCAM FEED</span>
              </button>

              <button
                onClick={() => {
                  audioManager.playButtonClick();
                  onFallbackToKeyboard();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-[#141a24] hover:bg-[#1a2230] border border-[#263346] text-[#cbd5e1] font-semibold text-xs tracking-wider transition"
              >
                <Gamepad2 size={16} />
                <span>PLAY WITH KEYBOARD / MOUSE INSTEAD</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                audioManager.playButtonClick();
                onContinue();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#168BFF] hover:bg-[#0d78e3] text-white font-bold text-sm tracking-wider uppercase transition shadow-lg shadow-[#168BFF]/25"
            >
              <span>CONTINUE TO CALIBRATION</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </main>

      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-[#64748b]">
        If playing in an embedded window, ensure the browser has granted camera permission to this domain.
      </footer>
    </div>
  );
};
