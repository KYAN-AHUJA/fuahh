import React from 'react';
import { GameType } from '../../types';
import { Disc, Activity, ArrowLeft, ChevronRight, Zap, Target } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';

interface GameSelectionProps {
  onSelectGame: (type: GameType) => void;
  onBack: () => void;
}

export const GameSelection: React.FC<GameSelectionProps> = ({ onSelectGame, onBack }) => {
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
          STEP 1 / 3 : SELECT DISCIPLINE
        </span>
      </header>

      {/* Main Selection Area */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase mb-2">
            CHOOSE YOUR SPORT
          </h2>
          <p className="text-xs md:text-sm text-[#94a3b8]">
            Both games support simultaneous 2-player hand tracking, local controls, and AI mode.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Air Hockey */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectGame('air-hockey');
            }}
            className="group relative cursor-pointer p-8 rounded-3xl bg-[#0f141c] hover:bg-[#141a24] border border-[#263346] hover:border-[#168BFF] transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-[#168BFF]/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-[#168BFF]/10 border border-[#168BFF]/30 text-[#168BFF] group-hover:scale-110 transition duration-200">
                  <Disc size={28} />
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#1e293b] text-[#94a3b8]">
                  TOP-DOWN 2D
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#168BFF] transition">
                AIR HOCKEY
              </h3>

              <p className="text-xs text-[#94a3b8] leading-relaxed mb-6">
                Classic arcade table hockey. Gliding puck with realistic air-table physics, goal slots,
                defensive zones, and paddle swings that transfer raw speed directly on impact.
              </p>

              <div className="flex flex-col gap-2 text-xs text-[#cbd5e1]">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[#168BFF]" />
                  <span>Dual goal nets & goal explosion sparks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-[#168BFF]" />
                  <span>First to 5 goals wins the match</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#1e293b] flex items-center justify-between">
              <span className="text-xs font-bold text-[#168BFF] tracking-wider uppercase">
                Launch Air Hockey
              </span>
              <div className="p-2 rounded-xl bg-[#168BFF]/10 group-hover:bg-[#168BFF] text-[#168BFF] group-hover:text-white transition">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>

          {/* Card 2: Table Tennis */}
          <div
            onClick={() => {
              audioManager.playButtonClick();
              onSelectGame('table-tennis');
            }}
            className="group relative cursor-pointer p-8 rounded-3xl bg-[#0f141c] hover:bg-[#141a24] border border-[#263346] hover:border-[#06b6d4] transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-[#06b6d4]/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#06b6d4] group-hover:scale-110 transition duration-200">
                  <Activity size={28} />
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#1e293b] text-[#94a3b8]">
                  ARCADE SPEED
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#06b6d4] transition">
                ARCADE TABLE TENNIS
              </h3>

              <p className="text-xs text-[#94a3b8] leading-relaxed mb-6">
                High-octane rally ping pong. Dynamic ball spin, accelerating ball velocity on consecutive returns,
                rally combo multipliers, and fist-activated SMASH power shots.
              </p>

              <div className="flex flex-col gap-2 text-xs text-[#cbd5e1]">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[#06b6d4]" />
                  <span>Ball spin curves & speed escalation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-[#06b6d4]" />
                  <span>Fist Gesture / Spacebar SMASH ability</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#1e293b] flex items-center justify-between">
              <span className="text-xs font-bold text-[#06b6d4] tracking-wider uppercase">
                Launch Table Tennis
              </span>
              <div className="p-2 rounded-xl bg-[#06b6d4]/10 group-hover:bg-[#06b6d4] text-[#06b6d4] group-hover:text-white transition">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#64748b]">
        You can switch game disciplines at any time from the pause menu.
      </footer>
    </div>
  );
};
