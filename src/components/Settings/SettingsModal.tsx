import React from 'react';
import { X, Volume2, Sliders, Shield, Trophy, Activity } from 'lucide-react';
import { GameSettings } from '../../types';
import { audioManager } from '../../audio/AudioManager';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-[#121715] border border-[#303833] shadow-2xl p-6 text-left animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#303833] mb-5">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-[#A6AAA2]" />
            <h2 className="text-sm font-bold text-[#EAE7DE] uppercase tracking-wider">
              SETTINGS
            </h2>
          </div>
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            className="p-1 rounded text-[#A6AAA2] hover:text-[#EAE7DE] hover:bg-[#171D1A]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Target Score */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#EAE7DE] uppercase tracking-wider mb-2">
              <Trophy size={13} className="text-[#D9CCB2]" />
              <span>Target Score (Points to Win)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 7, 10].map(score => (
                <button
                  key={score}
                  onClick={() => {
                    audioManager.playButtonClick();
                    onUpdateSettings({ targetScore: score });
                  }}
                  className={`py-2 rounded-md font-mono text-xs font-bold border transition ${
                    settings.targetScore === score
                      ? 'bg-[#D9CCB2] text-[#171916] border-[#D9CCB2]'
                      : 'bg-[#171D1A] text-[#A6AAA2] border-[#303833] hover:text-[#EAE7DE]'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#EAE7DE] uppercase tracking-wider mb-2">
              <Shield size={13} className="text-[#E65361]" />
              <span>AI Bot Difficulty</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'pro'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => {
                    audioManager.playButtonClick();
                    onUpdateSettings({ aiDifficulty: diff });
                  }}
                  className={`py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition ${
                    settings.aiDifficulty === diff
                      ? 'bg-[#E65361] text-white border-[#E65361]'
                      : 'bg-[#171D1A] text-[#A6AAA2] border-[#303833] hover:text-[#EAE7DE]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#EAE7DE] uppercase tracking-wider mb-2">
              <span className="flex items-center gap-2">
                <Volume2 size={13} className="text-[#A6AAA2]" />
                <span>Audio Volume</span>
              </span>
              <span className="font-mono text-[#A6AAA2]">
                {settings.soundEnabled ? `${Math.round(settings.sfxVolume * 100)}%` : 'MUTED'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundEnabled ? settings.sfxVolume : 0}
              onChange={e => {
                const val = parseFloat(e.target.value);
                audioManager.setVolume(val);
                audioManager.setSoundEnabled(val > 0);
                onUpdateSettings({ sfxVolume: val, soundEnabled: val > 0 });
              }}
              className="w-full h-1.5 rounded-lg bg-[#303833] accent-[#D9CCB2] cursor-pointer"
            />
          </div>

          {/* Hand Tracking Smoothing */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#EAE7DE] uppercase tracking-wider mb-2">
              <span className="flex items-center gap-2">
                <Activity size={13} className="text-[#65B987]" />
                <span>Hand Tracking Response</span>
              </span>
              <span className="font-mono text-[#65B987]">
                {Math.round((1 - settings.smoothingFactor) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.45"
              step="0.05"
              value={settings.smoothingFactor}
              onChange={e => {
                const val = parseFloat(e.target.value);
                onUpdateSettings({ smoothingFactor: val });
              }}
              className="w-full h-1.5 rounded-lg bg-[#303833] accent-[#65B987] cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#303833] flex justify-end">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            className="px-6 py-2 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-wider uppercase transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
