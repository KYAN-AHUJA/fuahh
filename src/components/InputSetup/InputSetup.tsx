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
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-8 bg-[#0B0E0D] text-[#EAE7DE] overflow-y-auto">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={() => {
            audioManager.playButtonClick();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#121715] hover:bg-[#171D1A] border border-[#303833] text-xs font-medium text-[#A6AAA2] hover:text-[#EAE7DE] tracking-wider transition"
        >
          <ArrowLeft size={14} />
          <span>BACK</span>
        </button>

        <span className="font-mono text-xs uppercase tracking-widest text-[#A6AAA2]">
          SELECT CONTROLS
        </span>
      </header>

      {/* Main Mode Cards */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#EAE7DE] uppercase mb-2">
            SELECT CONTROL METHOD
          </h2>
          <p className="text-xs md:text-sm text-[#A6AAA2]">
            Choose camera gesture tracking, local keyboard & mouse, or solo play against AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Option 1: Dual Webcam Hands */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectMode('camera');
            }}
            className={`cursor-pointer p-6 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
              selectedMode === 'camera'
                ? 'bg-[#171D1A] border-[#168BFF]'
                : 'bg-[#121715] border-[#303833] hover:border-[#A6AAA2]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-[#121715] text-[#168BFF] border border-[#303833]">
                  <Camera size={20} />
                </div>
                {selectedMode === 'camera' && (
                  <div className="w-5 h-5 rounded-full bg-[#168BFF] text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-[#EAE7DE] mb-1 uppercase tracking-wide">
                Webcam Hands
              </h3>
              <p className="text-xs text-[#A6AAA2] leading-relaxed mb-4">
                Full gesture control. P1 controls Blue on the left; P2 controls Red on the right.
              </p>
            </div>

            <div className="pt-3 border-t border-[#303833] text-[11px] font-mono text-[#A6AAA2] space-y-1">
              <div>• Left hand: Player 1 (Blue)</div>
              <div>• Right hand: Player 2 (Red)</div>
            </div>
          </div>

          {/* Option 2: Keyboard & Mouse Local */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectMode('keyboard-mouse');
            }}
            className={`cursor-pointer p-6 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
              selectedMode === 'keyboard-mouse'
                ? 'bg-[#171D1A] border-[#D9CCB2]'
                : 'bg-[#121715] border-[#303833] hover:border-[#A6AAA2]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-[#121715] text-[#D9CCB2] border border-[#303833]">
                  <Gamepad2 size={20} />
                </div>
                {selectedMode === 'keyboard-mouse' && (
                  <div className="w-5 h-5 rounded-full bg-[#D9CCB2] text-[#171916] flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-[#EAE7DE] mb-1 uppercase tracking-wide">
                2-Player Local
              </h3>
              <p className="text-xs text-[#A6AAA2] leading-relaxed mb-4">
                Two players share one keyboard and mouse. Zero setup required.
              </p>
            </div>

            <div className="pt-3 border-t border-[#303833] text-[11px] font-mono text-[#A6AAA2] space-y-1">
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
            className={`cursor-pointer p-6 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
              selectedMode === 'vs-ai'
                ? 'bg-[#171D1A] border-[#E65361]'
                : 'bg-[#121715] border-[#303833] hover:border-[#A6AAA2]/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-[#121715] text-[#E65361] border border-[#303833]">
                  <Bot size={20} />
                </div>
                {selectedMode === 'vs-ai' && (
                  <div className="w-5 h-5 rounded-full bg-[#E65361] text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-[#EAE7DE] mb-1 uppercase tracking-wide">
                Solo vs AI Bot
              </h3>
              <p className="text-xs text-[#A6AAA2] leading-relaxed mb-4">
                Play alone against an intelligent responsive opponent bot.
              </p>
            </div>

            <div className="pt-3 border-t border-[#303833] text-[11px] font-mono text-[#A6AAA2] space-y-1">
              <div>• P1: Mouse or W / S Keys</div>
              <div>• P2: Reactive AI Opponent</div>
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
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] font-bold text-xs tracking-wider uppercase transition shadow-sm hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>PROCEED TO ARENA</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#A6AAA2]">
        You can always change control settings during gameplay from the settings menu.
      </footer>
    </div>
  );
};
