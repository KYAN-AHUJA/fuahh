import React from 'react';
import { Volume2, VolumeX, Pause, Settings as SettingsIcon, Eye, EyeOff, Radio } from 'lucide-react';
import { PlayerScore, GameType, ControlMode, HandData } from '../../types';
import { audioManager } from '../../audio/AudioManager';

interface GameHUDProps {
  gameType: GameType;
  controlMode: ControlMode;
  scores: PlayerScore;
  timerSeconds: number;
  p1Hand: HandData;
  p2Hand: HandData;
  soundEnabled: boolean;
  showPreview: boolean;
  onToggleSound: () => void;
  onTogglePreview: () => void;
  onPause: () => void;
  onOpenSettings: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameType,
  controlMode,
  scores,
  timerSeconds,
  p1Hand,
  p2Hand,
  soundEnabled,
  showPreview,
  onToggleSound,
  onTogglePreview,
  onPause,
  onOpenSettings,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3 bg-[#0f141c]/85 border-b border-[#1e293b] backdrop-blur-md">
      {/* Player 1 Badge & Score */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#168BFF]/10 border border-[#168BFF]/40">
          <div className={`w-2.5 h-2.5 rounded-full ${controlMode === 'camera' ? (p1Hand.isDetected ? 'bg-[#168BFF] animate-pulse' : 'bg-gray-600') : 'bg-[#168BFF]'}`} />
          <span className="font-bold text-sm tracking-wide text-[#168BFF]">P1 BLUE</span>
        </div>
        <span className="font-mono text-3xl font-extrabold text-white tracking-wider px-2">
          {scores.p1}
        </span>
      </div>

      {/* Center Match Info & Timer */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-widest text-[#f3f4f6]">
            {formatTime(timerSeconds)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold">
            {gameType === 'air-hockey' ? 'Air Hockey' : 'Arcade Table Tennis'}
          </span>
          <span className="text-[10px] text-[#475569]">•</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] text-[#cbd5e1] font-mono">
            {controlMode === 'camera' ? '🎥 Webcam Hands' : controlMode === 'vs-ai' ? '🤖 vs AI Bot' : '🎮 2-Player Local'}
          </span>
        </div>
      </div>

      {/* Player 2 Badge & Score */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl font-extrabold text-white tracking-wider px-2">
            {scores.p2}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E65361]/10 border border-[#E65361]/40">
            <span className="font-bold text-sm tracking-wide text-[#E65361]">
              {controlMode === 'vs-ai' ? 'AI BOT' : 'P2 RED'}
            </span>
            <div className={`w-2.5 h-2.5 rounded-full ${controlMode === 'camera' ? (p2Hand.isDetected ? 'bg-[#E65361] animate-pulse' : 'bg-gray-600') : 'bg-[#E65361]'}`} />
          </div>
        </div>

        {/* Action Controls */}
        <div className="h-6 w-[1px] bg-[#263346] mx-1" />

        <div className="flex items-center gap-1.5">
          {controlMode === 'camera' && (
            <button
              onClick={() => {
                audioManager.playButtonClick();
                onTogglePreview();
              }}
              title={showPreview ? 'Hide Hand PIP Preview' : 'Show Hand PIP Preview'}
              className={`p-2 rounded-lg border transition ${
                showPreview
                  ? 'bg-[#1e293b] border-[#38485e] text-[#06b6d4]'
                  : 'bg-transparent border-transparent text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
              }`}
            >
              {showPreview ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          )}

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onToggleSound();
            }}
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onOpenSettings();
            }}
            title="Settings"
            className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition"
          >
            <SettingsIcon size={18} />
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onPause();
            }}
            title="Pause Game (Esc)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#263346] hover:bg-[#38485e] text-white text-xs font-semibold tracking-wide transition border border-[#38485e]"
          >
            <Pause size={14} />
            <span>PAUSE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
