import React from 'react';
import { Pause, RotateCcw, Settings as SettingsIcon, Maximize, Minimize } from 'lucide-react';
import { PlayerScore, GameType, ControlMode, HandData } from '../../types';
import { audioManager } from '../../audio/AudioManager';

interface GameHUDProps {
  gameType: GameType;
  controlMode: ControlMode;
  scores: PlayerScore;
  timerSeconds: number;
  p1Hand: HandData;
  p2Hand: HandData;
  p1InputReady?: boolean;
  p2InputReady?: boolean;
  onPause: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameType,
  controlMode,
  scores,
  timerSeconds,
  p1Hand,
  p2Hand,
  p1InputReady,
  p2InputReady,
  onPause,
  onRestart,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };
  const p1Ready = p1InputReady ?? p1Hand.isDetected;
  const p2Ready = p2InputReady ?? p2Hand.isDetected;

  return (
    <>
      {/* Top HUD */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3.5 bg-[#121715]/90 border-b border-[#303833] backdrop-blur-sm select-none">
        {/* Player 1 Score with Blue Dot */}
        <div className="flex items-center gap-3.5 min-w-[140px]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                controlMode === 'camera'
                  ? p1Ready
                    ? 'bg-[#168BFF]'
                    : 'bg-[#303833]'
                  : 'bg-[#168BFF]'
              }`}
            />
            <span className="font-semibold text-xs tracking-wider text-[#A6AAA2] uppercase">
              PLAYER 1
            </span>
          </div>
          <span className="font-mono text-2xl font-bold text-[#EAE7DE] tracking-tight">
            {scores.p1}
          </span>
        </div>

        {/* Centered Match Timer and Game Mode */}
        <div className="flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold tracking-widest text-[#EAE7DE]">
            {gameType === 'boxing' ? 'BO3' : formatTime(timerSeconds)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[#A6AAA2] font-medium mt-0.5">
            {gameType === 'air-hockey' ? 'AIR HOCKEY' : gameType === 'boxing' ? 'NEON BOXING' : 'ARCADE TABLE TENNIS'}
          </span>
        </div>

        {/* Player 2 Score with Red Dot */}
        <div className="flex items-center justify-end gap-3.5 min-w-[140px]">
          <span className="font-mono text-2xl font-bold text-[#EAE7DE] tracking-tight">
            {scores.p2}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-wider text-[#A6AAA2] uppercase">
              {controlMode === 'vs-ai' ? 'AI BOT' : 'PLAYER 2'}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                controlMode === 'camera'
                  ? p2Ready
                    ? 'bg-[#E65361]'
                    : 'bg-[#303833]'
                  : 'bg-[#E65361]'
              }`}
            />
          </div>
        </div>
      </header>

      {/* Bottom Controls Bar */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-3 px-6 py-2.5 bg-[#121715]/85 border-t border-[#303833] backdrop-blur-sm select-none">
        <button
          onClick={() => {
            audioManager.playButtonClick();
            onPause();
          }}
          title="Pause Match (Esc)"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-xs font-medium text-[#EAE7DE] transition"
        >
          <Pause size={13} />
          <span>PAUSE</span>
        </button>

        <button
          onClick={() => {
            audioManager.playButtonClick();
            onRestart();
          }}
          title="Restart Match"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-xs font-medium text-[#EAE7DE] transition"
        >
          <RotateCcw size={13} />
          <span>RESTART</span>
        </button>

        <button
          onClick={() => {
            audioManager.playButtonClick();
            onOpenSettings();
          }}
          title="Settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-xs font-medium text-[#EAE7DE] transition"
        >
          <SettingsIcon size={13} />
          <span>SETTINGS</span>
        </button>

        <button
          onClick={() => {
            audioManager.playButtonClick();
            onToggleFullscreen();
          }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-xs font-medium text-[#EAE7DE] transition"
        >
          {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
        </button>
      </footer>
    </>
  );
};
