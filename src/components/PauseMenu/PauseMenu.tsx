import React from 'react';
import { Play, RotateCcw, Home, Settings, ArrowLeft } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onSwitchGame: () => void;
  onOpenSettings: () => void;
  onQuitToMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onSwitchGame,
  onOpenSettings,
  onQuitToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#0f141c] border border-[#263346] shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-2xl font-black tracking-widest text-white uppercase mb-1">
          MATCH PAUSED
        </h2>
        <p className="text-xs text-[#94a3b8] mb-6">
          Press ESC or choose an action below
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#168BFF] hover:bg-[#0d78e3] text-white font-bold text-sm tracking-wide transition shadow-lg shadow-[#168BFF]/20"
          >
            <Play size={16} fill="white" />
            <span>RESUME MATCH</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a2230] hover:bg-[#263346] border border-[#263346] text-[#e2e8f0] font-semibold text-sm transition"
          >
            <RotateCcw size={15} />
            <span>RESTART ROUND</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onSwitchGame();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a2230] hover:bg-[#263346] border border-[#263346] text-[#e2e8f0] font-semibold text-sm transition"
          >
            <ArrowLeft size={15} />
            <span>SWITCH GAME</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a2230] hover:bg-[#263346] border border-[#263346] text-[#e2e8f0] font-semibold text-sm transition"
          >
            <Settings size={15} />
            <span>GAME SETTINGS</span>
          </button>

          <div className="h-[1px] bg-[#1e293b] my-2" />

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onQuitToMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-transparent hover:bg-rose-950/30 text-rose-400 font-medium text-xs transition"
          >
            <Home size={14} />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
