import React from 'react';
import { Play, Disc, Activity, Users, Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { CameraStatus } from '../../hooks/useCamera';
import { audioManager } from '../../audio/AudioManager';

interface LandingPageProps {
  cameraStatus: CameraStatus;
  onRequestCamera: () => void;
  onStart: () => void;
  onOpenSettings: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  cameraStatus,
  onRequestCamera,
  onStart,
  onOpenSettings,
}) => {
  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-8 bg-[#0a0d12] text-[#f3f4f6] overflow-y-auto">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#168BFF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E65361]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#168BFF] to-[#06b6d4] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-[#168BFF]/25">
            ⚡
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-wider text-white">NEON ARENA</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] text-[#94a3b8] font-mono border border-[#263346]">
              v2.0 MULTIPLAYER
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Top Webcam Quick-Permission Button */}
          {cameraStatus !== 'active' ? (
            <button
              onClick={() => {
                audioManager.playButtonClick();
                onRequestCamera();
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 border border-[#06b6d4]/40 text-[#06b6d4] text-xs font-semibold tracking-wide transition animate-pulse"
            >
              <Camera size={14} />
              <span>Allow Webcam</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={13} />
              <span>Webcam Ready</span>
            </div>
          )}

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onOpenSettings();
            }}
            className="px-4 py-2 rounded-xl bg-[#141a24] hover:bg-[#1a2230] border border-[#263346] text-xs font-semibold text-[#cbd5e1] tracking-wider transition"
          >
            SETTINGS
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl w-full mx-auto text-center my-auto py-12 z-10 flex flex-col items-center">
        {/* Interactive Camera Permission Banner */}
        <div
          onClick={() => {
            if (cameraStatus !== 'active') {
              audioManager.playButtonClick();
              onRequestCamera();
            }
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium mb-6 transition cursor-pointer ${
            cameraStatus === 'active'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : cameraStatus === 'denied'
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
              : cameraStatus === 'requesting'
              ? 'bg-[#06b6d4]/10 border-[#06b6d4]/40 text-[#06b6d4]'
              : 'bg-[#141a24] border-[#263346] text-[#cbd5e1] hover:border-[#06b6d4]'
          }`}
        >
          {cameraStatus === 'active' && <CheckCircle2 size={14} className="text-emerald-400" />}
          {cameraStatus === 'denied' && <AlertCircle size={14} className="text-rose-400" />}
          {cameraStatus === 'requesting' && <RefreshCw size={14} className="text-[#06b6d4] animate-spin" />}
          {cameraStatus === 'idle' && <Camera size={14} className="text-[#06b6d4]" />}

          <span>
            {cameraStatus === 'active' && 'Webcam Feed Connected • Dual Hand Tracking Active'}
            {cameraStatus === 'denied' && 'Camera Permission Blocked • Click Here to Re-Request Webcam Feed'}
            {cameraStatus === 'requesting' && 'Connecting to Webcam Stream...'}
            {cameraStatus === 'idle' && 'Click to Connect Webcam Feed for Hand Gesture Controls'}
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white uppercase mb-4">
          GESTURE-DRIVEN <br />
          <span className="bg-gradient-to-r from-[#168BFF] via-[#06b6d4] to-[#E65361] bg-clip-text text-transparent">
            ARCADE ARENA
          </span>
        </h1>

        <p className="max-w-xl text-sm md:text-base text-[#94a3b8] leading-relaxed mb-8">
          Step up to the table. Play with high-speed circular paddles and comet balls with your bare hands
          or responsive keyboard controls in two authentic 2D multiplayer sports.
        </p>

        {/* Action Button Group */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onStart();
            }}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#168BFF] hover:bg-[#0d78e3] text-white font-bold text-base tracking-wider uppercase transition shadow-xl shadow-[#168BFF]/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play size={20} fill="white" />
            <span>ENTER ARENA</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-mono">SPACE</span>
          </button>

          {cameraStatus !== 'active' && (
            <button
              onClick={() => {
                audioManager.playButtonClick();
                onRequestCamera();
              }}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#141a24] hover:bg-[#1a2230] border border-[#06b6d4]/50 text-[#06b6d4] font-bold text-sm tracking-wider uppercase transition hover:scale-[1.02]"
            >
              <Camera size={18} />
              <span>ENABLE WEBCAM FEED</span>
            </button>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-14 text-left">
          <div className="p-5 rounded-2xl bg-[#0f141c]/80 border border-[#1e293b] backdrop-blur-sm">
            <div className="p-2.5 rounded-xl bg-[#168BFF]/10 text-[#168BFF] w-fit mb-3">
              <Disc size={20} />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Air Hockey</h3>
            <p className="text-xs text-[#94a3b8] leading-normal">
              High-velocity puck physics, live webcam table overlay, and circular mallet collisions.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f141c]/80 border border-[#1e293b] backdrop-blur-sm">
            <div className="p-2.5 rounded-xl bg-[#06b6d4]/10 text-[#06b6d4] w-fit mb-3">
              <Activity size={20} />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Arcade Table Tennis</h3>
            <p className="text-xs text-[#94a3b8] leading-normal">
              Dynamic ball spin, accelerating rally multipliers, and fist-activated SMASH power shots.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f141c]/80 border border-[#1e293b] backdrop-blur-sm">
            <div className="p-2.5 rounded-xl bg-[#E65361]/10 text-[#E65361] w-fit mb-3">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Dual Red & Blue Vision</h3>
            <p className="text-xs text-[#94a3b8] leading-normal">
              Samples physical colors for Player 1 Blue (#168BFF) and Player 2 Red (#E65361) in real time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex items-center justify-between text-xs text-[#64748b] border-t border-[#1e293b] pt-4 z-10">
        <span>PLAYER 1: BLUE (#168BFF) • PLAYER 2: RED (#E65361)</span>
        <span>60 FPS DELTA-TIME CANVAS ENGINE</span>
      </footer>
    </div>
  );
};
