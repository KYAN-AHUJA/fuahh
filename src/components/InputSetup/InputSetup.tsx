import React from 'react';
import { ControlMode } from '../../types';
import { Camera, Gamepad2, Bot, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';

interface InputSetupProps {
  selectedMode: ControlMode;
  onSelectMode: (mode: ControlMode) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const InputSetup: React.FC<InputSetupProps> = ({
  selectedMode,
  onSelectMode,
  onContinue,
  onBack,
}) => {
  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-8 bg-[#0a0d12] text-[#f3f4f6]">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
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
          STEP 2 / 3 : CONTROL MODE
        </span>
      </header>

      {/* Main Mode Cards */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase mb-2">
            SELECT CONTROL METHOD
          </h2>
          <p className="text-xs md:text-sm text-[#94a3b8]">
            Choose whether to track your hands via camera or play with keyboard and mouse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Option 1: Dual Webcam Hands */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectMode('camera');
            }}
            className={`cursor-pointer p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              selectedMode === 'camera'
                ? 'bg-[#141a24] border-[#06b6d4] shadow-xl shadow-[#06b6d4]/10 ring-2 ring-[#06b6d4]/30'
                : 'bg-[#0f141c] border-[#263346] hover:border-[#38485e]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#06b6d4]/10 text-[#06b6d4]">
                  <Camera size={24} />
                </div>
                {selectedMode === 'camera' && (
                  <div className="p-1 rounded-full bg-[#06b6d4] text-black">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                Webcam Hands
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                Track both players through one webcam. P1 uses a black wrist marker; P2 uses a red wrist marker.
              </p>
            </div>

            <div className="pt-4 border-t border-[#1e293b] text-[11px] font-mono text-[#cbd5e1] space-y-1">
              <div>• Mirror-tracked index tips</div>
              <div>• Fist gesture for SMASH</div>
            </div>
          </div>

          {/* Option 2: Keyboard & Mouse Local */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectMode('keyboard-mouse');
            }}
            className={`cursor-pointer p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              selectedMode === 'keyboard-mouse'
                ? 'bg-[#141a24] border-[#168BFF] shadow-xl shadow-[#168BFF]/10 ring-2 ring-[#168BFF]/30'
                : 'bg-[#0f141c] border-[#263346] hover:border-[#38485e]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#168BFF]/10 text-[#168BFF]">
                  <Gamepad2 size={24} />
                </div>
                {selectedMode === 'keyboard-mouse' && (
                  <div className="p-1 rounded-full bg-[#168BFF] text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                2-Player Local
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                Two players share the keyboard and mouse on one screen. Instant zero-setup input.
              </p>
            </div>

            <div className="pt-4 border-t border-[#1e293b] text-[11px] font-mono text-[#cbd5e1] space-y-1">
              <div>• P1: W / S Keys or Mouse</div>
              <div>• P2: Up / Down Arrow Keys</div>
            </div>
          </div>

          {/* Option 3: Solo vs AI Bot */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectMode('vs-ai');
            }}
            className={`cursor-pointer p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              selectedMode === 'vs-ai'
                ? 'bg-[#141a24] border-[#E65361] shadow-xl shadow-[#E65361]/10 ring-2 ring-[#E65361]/30'
                : 'bg-[#0f141c] border-[#263346] hover:border-[#38485e]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#E65361]/10 text-[#E65361]">
                  <Bot size={24} />
                </div>
                {selectedMode === 'vs-ai' && (
                  <div className="p-1 rounded-full bg-[#E65361] text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                Solo vs AI Bot
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                Single player mode against an intelligent defense AI bot. Perfect for quick matches.
              </p>
            </div>

            <div className="pt-4 border-t border-[#1e293b] text-[11px] font-mono text-[#cbd5e1] space-y-1">
              <div>• P1: Mouse or W / S / Space</div>
              <div>• P2: AI Bot (Adjustable tier)</div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onContinue();
            }}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-[#168BFF] hover:bg-[#0d78e3] text-white font-bold text-sm tracking-wider uppercase transition shadow-xl shadow-[#168BFF]/25 hover:scale-[1.02]"
          >
            <span>PROCEED TO ARENA</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#64748b]">
        You can always re-configure controls during gameplay from the settings menu.
      </footer>
    </div>
  );
};
