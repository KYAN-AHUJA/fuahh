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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl bg-[#121715] border border-[#303833] shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-xl font-bold tracking-widest text-[#EAE7DE] uppercase mb-1">
          MATCH PAUSED
        </h2>
        <p className="text-xs text-[#A6AAA2] mb-6">
          Press ESC to resume or choose an option
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] font-bold text-xs tracking-wider uppercase transition"
          >
            <Play size={14} fill="#171916" />
            <span>RESUME MATCH</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-[#EAE7DE] font-medium text-xs tracking-wider uppercase transition"
          >
            <RotateCcw size={14} />
            <span>RESTART MATCH</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onSwitchGame();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-[#EAE7DE] font-medium text-xs tracking-wider uppercase transition"
          >
            <ArrowLeft size={14} />
            <span>SWITCH GAME</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-[#EAE7DE] font-medium text-xs tracking-wider uppercase transition"
          >
            <Settings size={14} />
            <span>SETTINGS</span>
          </button>

          <div className="h-[1px] bg-[#303833] my-2" />

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onQuitToMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-transparent hover:bg-[#171D1A] text-[#A6AAA2] hover:text-[#EAE7DE] font-medium text-xs tracking-wider uppercase transition"
          >
            <Home size={14} />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
