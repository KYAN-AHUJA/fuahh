import React, { useState } from 'react';
import { Maximize, Minimize, ChevronDown, Disc, Activity, Camera, X } from 'lucide-react';
import { CameraStatus } from '../../hooks/useCamera';
import { audioManager } from '../../audio/AudioManager';

interface LandingPageProps {
  cameraStatus: CameraStatus;
  onRequestCamera: () => void;
  onStart: () => void;
  onOpenSettings: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  cameraStatus,
  onRequestCamera,
  onStart,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between bg-[#0B0E0D] text-[#EAE7DE] overflow-y-auto selection:bg-[#303833]">
      {/* 1. Minimal Top Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-5 bg-[#0B0E0D]/90 border-b border-[#303833]/60 backdrop-blur-md">
        {/* Wordmark on left */}
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-lg tracking-[0.2em] text-[#EAE7DE] uppercase">
            NEON ARENA
          </span>
        </div>

        {/* Navigation links */}
        <nav className="hidden sm:flex items-center gap-8 text-xs tracking-wider uppercase text-[#A6AAA2] font-medium">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-[#EAE7DE] transition"
          >
            Home
          </button>
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onStart();
            }}
            className="hover:text-[#EAE7DE] transition"
          >
            Play
          </button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="hover:text-[#EAE7DE] transition"
          >
            How to Play
          </button>
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onOpenSettings();
            }}
            className="hover:text-[#EAE7DE] transition"
          >
            Settings
          </button>
        </nav>

        {/* Fullscreen control on the right */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onToggleFullscreen();
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 rounded-md bg-[#121715] hover:bg-[#171D1A] border border-[#303833] text-[#A6AAA2] hover:text-[#EAE7DE] transition"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </header>

      {/* 2. Main Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-8 py-12 md:py-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Typography & Action Buttons */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <p className="font-mono text-xs tracking-[0.25em] text-[#A6AAA2] uppercase mb-4">
              THE ARCADE. REIMAGINED.
            </p>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#EAE7DE] uppercase leading-[1.05] mb-5">
              NEON ARENA
            </h1>

            <p className="text-base md:text-lg text-[#A6AAA2] font-normal leading-relaxed mb-8 max-w-lg">
              Two players. One camera. Unlimited competition.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  audioManager.playButtonClick();
                  onStart();
                }}
                className="px-6 py-3.5 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-[0.15em] uppercase transition hover:scale-[1.01] active:scale-[0.99] shadow-sm"
              >
                PLAY NOW
              </button>

              <button
                onClick={() => setShowHowToPlay(true)}
                className="px-6 py-3.5 rounded-md bg-transparent hover:bg-[#121715] border border-[#303833] text-[#EAE7DE] text-xs font-semibold tracking-[0.15em] uppercase transition"
              >
                HOW TO PLAY
              </button>
            </div>

            {/* Camera feed indicator pill */}
            <div className="mt-8 flex items-center gap-2.5 text-xs text-[#A6AAA2]">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraStatus === 'active' ? 'bg-[#65B987]' : 'bg-[#A6AAA2]'
                }`}
              />
              <span>
                {cameraStatus === 'active'
                  ? 'Webcam connected · Dual-hand gesture engine ready'
                  : 'Webcam gesture tracking or local two-player mode'}
              </span>
              {cameraStatus !== 'active' && (
                <button
                  onClick={() => {
                    audioManager.playButtonClick();
                    onRequestCamera();
                  }}
                  className="ml-2 text-xs text-[#168BFF] hover:underline uppercase tracking-wider font-semibold"
                >
                  Enable Camera
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Restrained Abstract 2D Composition */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl bg-[#121715] border border-[#303833] p-6 flex items-center justify-center overflow-hidden shadow-sm">
              <svg
                viewBox="0 0 320 320"
                className="w-full h-full select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background grid dots */}
                <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="0.75" fill="#303833" opacity="0.6" />
                </pattern>
                <rect width="320" height="320" fill="url(#dot-grid)" />

                {/* Overlapping Circles & Soft Arc */}
                <circle cx="160" cy="160" r="110" stroke="#303833" strokeWidth="1.5" />
                <circle cx="160" cy="160" r="70" stroke="#303833" strokeWidth="1" strokeDasharray="4 4" />

                {/* Soft arc */}
                <path
                  d="M 60 160 A 100 100 0 0 1 260 160"
                  stroke="#303833"
                  strokeWidth="1.5"
                />

                {/* Center table line */}
                <line x1="160" y1="40" x2="160" y2="280" stroke="#303833" strokeWidth="1.5" />

                {/* Player 1 Blue Disc element */}
                <circle cx="110" cy="160" r="28" fill="#168BFF" />
                <circle cx="110" cy="160" r="12" fill="#121715" />
                <circle cx="110" cy="160" r="4" fill="#168BFF" />

                {/* Player 2 Red Disc element */}
                <circle cx="210" cy="160" r="28" fill="#E65361" />
                <circle cx="210" cy="160" r="12" fill="#121715" />
                <circle cx="210" cy="160" r="4" fill="#E65361" />

                {/* Small off-white puck */}
                <circle cx="160" cy="130" r="8" fill="#EAE7DE" stroke="#A6AAA2" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Small "SCROLL TO EXPLORE" cue */}
        <div className="flex flex-col items-center justify-center mt-12 text-[#A6AAA2] select-none">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono">
            SCROLL TO EXPLORE
          </span>
          <ChevronDown size={14} className="mt-1 animate-bounce text-[#A6AAA2]" />
        </div>
      </main>

      {/* 3. Features & Disciplines Section */}
      <section className="max-w-6xl w-full mx-auto px-8 py-16 border-t border-[#303833]/60">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Discipline 1: Air Hockey */}
          <div className="p-8 rounded-xl bg-[#121715] border border-[#303833]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs tracking-wider text-[#168BFF] uppercase">
                01 · DISCIPLINE
              </span>
              <Disc size={18} className="text-[#168BFF]" />
            </div>
            <h3 className="text-xl font-bold text-[#EAE7DE] mb-2 uppercase">
              2D Air Hockey
            </h3>
            <p className="text-xs text-[#A6AAA2] leading-relaxed">
              Authentic top-down table hockey. Glide physics, perimeter wall bounces, goal crease slots,
              and tactile hand-controlled mallets.
            </p>
          </div>

          {/* Discipline 2: Table Tennis */}
          <div className="p-8 rounded-xl bg-[#121715] border border-[#303833]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs tracking-wider text-[#E65361] uppercase">
                02 · DISCIPLINE
              </span>
              <Activity size={18} className="text-[#E65361]" />
            </div>
            <h3 className="text-xl font-bold text-[#EAE7DE] mb-2 uppercase">
              Arcade Table Tennis
            </h3>
            <p className="text-xs text-[#A6AAA2] leading-relaxed">
              High-speed rally ping pong. Dynamic spin trajectory, accelerating return speeds,
              and fist gesture activated smash power returns.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="max-w-6xl w-full mx-auto px-8 py-6 flex items-center justify-between text-xs text-[#A6AAA2] border-t border-[#303833]/40">
        <span>PLAYER 1 · BLUE (#168BFF) · PLAYER 2 · RED (#E65361)</span>
        <span>60 FPS DELTA-TIME CANVAS ENGINE</span>
      </footer>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-lg w-full bg-[#121715] border border-[#303833] rounded-xl p-6 text-[#EAE7DE] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#303833] mb-5">
              <h3 className="font-bold text-sm tracking-wider uppercase text-[#EAE7DE]">
                HOW TO PLAY
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="p-1 rounded text-[#A6AAA2] hover:text-[#EAE7DE] hover:bg-[#171D1A]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#A6AAA2] leading-relaxed">
              <div>
                <strong className="text-[#EAE7DE] block mb-1">1. WEBCAM GESTURE CONTROL</strong>
                Position both players in front of the camera. Player 1 stands on the left (Blue paddle), Player 2 on the right (Red paddle). Move your open hand to position your paddle.
              </div>

              <div>
                <strong className="text-[#EAE7DE] block mb-1">2. SMASH POWER SHOT</strong>
                In Table Tennis, close your hand into a fist to trigger a high-speed smash shot when the ball approaches!
              </div>

              <div>
                <strong className="text-[#EAE7DE] block mb-1">3. KEYBOARD / LOCAL FALLBACK</strong>
                Player 1 can use W/S or Mouse. Player 2 can use Arrow Keys or play against the AI Bot. Press Escape at any time to pause.
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-6 w-full py-2.5 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-wider uppercase transition"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
