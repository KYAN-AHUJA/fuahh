import React, { useState } from 'react';
import { Maximize, Minimize, ChevronDown, Disc, Activity, Camera, X, ArrowRight, Swords, Settings as SettingsIcon } from 'lucide-react';
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
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 py-4 bg-[#0B0E0D]/95 border-b border-[#303833]/60 backdrop-blur-md">
        {/* Wordmark on left */}
        <div className="flex items-center gap-2.5">
          <span className="font-display font-bold text-xl tracking-normal text-[#EAE7DE] uppercase">
            NEON <span className="text-[#A6AAA2]">ARENA</span>
          </span>
        </div>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs tracking-wider uppercase text-[#A6AAA2] font-medium">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onOpenSettings();
            }}
            title="Settings"
            className="p-2 rounded-md text-[#A6AAA2] hover:text-[#EAE7DE] hover:bg-[#171D1A] transition"
          >
            <span className="sr-only">Settings</span>
            <SettingsIcon size={16} />
          </button>
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 pt-10 pb-12 md:pt-12 md:pb-14 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Typography & Action Buttons */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#65B987] uppercase mb-5">
              CAMERA-READY ARCADE · THREE DISCIPLINES
            </p>

            <h1 className="font-display text-7xl sm:text-8xl lg:text-9xl font-bold tracking-normal text-[#EAE7DE] uppercase leading-[0.8] mb-6">
              NEON<br />ARENA
            </h1>

            <p className="text-base md:text-lg text-[#A6AAA2] font-normal leading-relaxed mb-7 max-w-md">
              Step up to the table, take the ring, or challenge the AI. Play with gestures, keyboard, or mouse.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  audioManager.playButtonClick();
                  onStart();
                }}
                className="inline-flex items-center gap-3 px-5 py-3.5 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-[0.12em] uppercase transition hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
              >
                PLAY NOW <ArrowRight size={15} />
              </button>

              <button
                onClick={() => setShowHowToPlay(true)}
                className="px-5 py-3.5 rounded-md bg-transparent hover:bg-[#121715] border border-[#303833] text-[#EAE7DE] text-xs font-semibold tracking-[0.12em] uppercase transition"
              >
                HOW TO PLAY
              </button>
            </div>

            {/* Camera feed indicator pill */}
            <div className="mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-[#A6AAA2]">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraStatus === 'active' ? 'bg-[#65B987]' : 'bg-[#A6AAA2]'
                }`}
              />
              <span>
                {cameraStatus === 'active'
                  ? 'Webcam connected · Dual-hand gesture engine ready'
                  : 'CAMERA OFF · Keyboard and mouse play available'}
              </span>
              {cameraStatus !== 'active' && (
                <button
                  onClick={() => {
                    audioManager.playButtonClick();
                    onRequestCamera();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#168BFF] hover:text-[#74B9FF] uppercase tracking-wider font-semibold"
                >
                  <Camera size={13} /> Enable Camera
                </button>
              )}
            </div>
          </div>

          {/* Top-down arena preview */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="flex items-center justify-between pb-3 font-mono text-[10px] uppercase tracking-wider text-[#A6AAA2]">
              <span>LIVE ARENA STUDY</span>
              <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#65B987]" /> AIR HOCKEY · 01</span>
            </div>
            <div className="landing-arena" role="img" aria-label="Top-down air hockey table with blue and coral mallets and a moving puck">
              <span className="landing-arena__center-line" />
              <span className="landing-arena__center-circle" />
              <span className="landing-arena__goal landing-arena__goal--left" />
              <span className="landing-arena__goal landing-arena__goal--right" />
              <span className="landing-arena__mallet landing-arena__mallet--blue"><i /></span>
              <span className="landing-arena__mallet landing-arena__mallet--coral"><i /></span>
              <span className="landing-arena__puck" />
            </div>
            <div className="flex justify-between pt-3 font-mono text-[10px] uppercase tracking-wider">
              <span className="text-[#168BFF]">P1 · BLUE</span>
              <span className="text-[#A6AAA2]">TWO PLAYERS · ONE FIELD</span>
              <span className="text-[#E65361]">P2 · CORAL</span>
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
      <section className="max-w-7xl w-full mx-auto px-5 sm:px-8 py-10 md:py-12 border-t border-[#303833]/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-7">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-mono text-[10px] tracking-wider text-[#65B987] uppercase mb-2">THE LINEUP · 03</p>
            <h2 className="font-display text-3xl font-semibold uppercase leading-none">Pick your<br className="hidden lg:block" /> arena.</h2>
          </div>
          <article className="border-t border-[#168BFF]/60 pt-3">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] text-[#168BFF]">01 / TABLE</span>
              <Disc size={16} className="text-[#168BFF]" />
            </div>
            <h3 className="font-display text-2xl font-semibold uppercase mb-1">Air Hockey</h3>
            <p className="text-xs text-[#A6AAA2] leading-relaxed">Bank shots, quick saves, and hand-tracked mallets.</p>
          </article>
          <article className="border-t border-[#E65361]/60 pt-3">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] text-[#E65361]">02 / RALLY</span>
              <Activity size={16} className="text-[#E65361]" />
            </div>
            <h3 className="font-display text-2xl font-semibold uppercase mb-1">Table Tennis</h3>
            <p className="text-xs text-[#A6AAA2] leading-relaxed">Spin, return, and trigger a fist-powered smash.</p>
          </article>
          <article className="border-t border-[#D9CCB2]/60 pt-3">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] text-[#D9CCB2]">03 / RING</span>
              <Swords size={16} className="text-[#D9CCB2]" />
            </div>
            <h3 className="font-display text-2xl font-semibold uppercase mb-1">Neon Boxing</h3>
            <p className="text-xs text-[#A6AAA2] leading-relaxed">Read, dodge, guard, and punch in a best-of-three.</p>
          </article>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="max-w-7xl w-full mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[10px] font-mono uppercase tracking-wider text-[#A6AAA2] border-t border-[#303833]/40">
        <span>PLAYER 1 · BLUE <span className="text-[#303833]">/</span> PLAYER 2 · CORAL</span>
        <span>CAMERA · KEYBOARD · AI</span>
      </footer>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="how-to-play-title" className="max-w-lg w-full bg-[#121715] border border-[#303833] rounded-lg p-6 text-[#EAE7DE] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#303833] mb-5">
              <h3 id="how-to-play-title" className="font-bold text-sm tracking-wider uppercase text-[#EAE7DE]">
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
                <strong className="text-[#EAE7DE] block mb-1">1. CHOOSE YOUR CONTROL</strong>
                Use camera gestures, keyboard and mouse, or play solo against the AI. Camera access is optional.
              </div>

              <div>
                <strong className="text-[#EAE7DE] block mb-1">2. TAKE YOUR SIDE</strong>
                In table games, Player 1 is blue on the left and Player 2 is coral on the right. Move your hands or paddles to return the ball.
              </div>

              <div>
                <strong className="text-[#EAE7DE] block mb-1">3. FIGHT YOUR WAY</strong>
                In Table Tennis, make a fist for a smash. In Boxing, raise your hands to guard and punch forward. Press Escape to pause.
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
