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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f141c] border border-[#263346] shadow-2xl p-6 text-left animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b] mb-5">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[#06b6d4]" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              MATCH & SYSTEM SETTINGS
            </h2>
          </div>
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Target Score */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
              <Trophy size={14} className="text-[#f59e0b]" />
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
                  className={`py-2 rounded-lg font-mono text-sm font-bold border transition ${
                    settings.targetScore === score
                      ? 'bg-[#168BFF] text-white border-[#168BFF]'
                      : 'bg-[#141a24] text-[#94a3b8] border-[#263346] hover:bg-[#1a2230]'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
              <Shield size={14} className="text-[#E65361]" />
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
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition ${
                    settings.aiDifficulty === diff
                      ? 'bg-[#E65361] text-white border-[#E65361]'
                      : 'bg-[#141a24] text-[#94a3b8] border-[#263346] hover:bg-[#1a2230]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
              <span className="flex items-center gap-2">
                <Volume2 size={14} className="text-[#06b6d4]" />
                <span>Audio Volume</span>
              </span>
              <span className="font-mono text-[#06b6d4]">
                {settings.soundEnabled ? `${Math.round(settings.sfxVolume * 100)}%` : 'MUTED'}
              </span>
            </div>
            <div className="flex items-center gap-3">
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
                className="w-full h-2 rounded-lg bg-[#1e293b] accent-[#06b6d4] cursor-pointer"
              />
            </div>
          </div>

          {/* Hand Tracking Smoothing */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
              <span className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" />
                <span>Hand Smoothing</span>
              </span>
              <span className="font-mono text-emerald-400">
                {Math.round(settings.smoothingFactor * 100)}%
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
              className="w-full h-2 rounded-lg bg-[#1e293b] accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Color Detection Targets */}
          <div className="pt-2 border-t border-[#1e293b]">
            <span className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2 block">
              Glove Color Targets
            </span>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#141a24] border border-[#1e293b] text-xs">
                <span className="text-[#168BFF] font-semibold">P1 Blue</span>
                <input
                  type="color"
                  value={settings.p1ColorTarget?.hex || '#168BFF'}
                  onChange={e => {
                    const hex = e.target.value;
                    const c = parseInt(hex.slice(1), 16);
                    onUpdateSettings({
                      p1ColorTarget: {
                        r: (c >> 16) & 255,
                        g: (c >> 8) & 255,
                        b: c & 255,
                        hex,
                      },
                    });
                  }}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#141a24] border border-[#1e293b] text-xs">
                <span className="text-[#E65361] font-semibold">P2 Red</span>
                <input
                  type="color"
                  value={settings.p2ColorTarget?.hex || '#E65361'}
                  onChange={e => {
                    const hex = e.target.value;
                    const c = parseInt(hex.slice(1), 16);
                    onUpdateSettings({
                      p2ColorTarget: {
                        r: (c >> 16) & 255,
                        g: (c >> 8) & 255,
                        b: c & 255,
                        hex,
                      },
                    });
                  }}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
              </label>
            </div>

            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#94a3b8]">Color Tolerance</span>
              <span className="font-mono text-[#06b6d4]">{settings.colorTolerance || 80}</span>
            </div>
            <input
              type="range"
              min="20"
              max="180"
              value={settings.colorTolerance || 80}
              onChange={e => {
                onUpdateSettings({ colorTolerance: parseInt(e.target.value) });
              }}
              className="w-full h-1.5 rounded-lg bg-[#1e293b] accent-[#06b6d4] cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#1e293b] flex justify-end">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-[#168BFF] hover:bg-[#0d78e3] text-white text-xs font-bold tracking-wider uppercase transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
