import React from 'react';
import { GameType } from '../../types';
import { ArrowLeft } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';

interface GameSelectionProps {
  onSelectGame: (type: GameType) => void;
  onBack: () => void;
}

export const GameSelection: React.FC<GameSelectionProps> = ({ onSelectGame, onBack }) => {
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
          SELECT DISCIPLINE
        </span>
      </header>

      {/* Main Selection Area */}
      <main className="max-w-6xl w-full mx-auto my-auto py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#EAE7DE] uppercase mb-2">
            SELECT GAME MODE
          </h2>
          <p className="text-xs md:text-sm text-[#A6AAA2]">
            Choose your arena
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Card 1: Air Hockey */}
          <div className="flex flex-col justify-between p-6 rounded-lg bg-[#121715] border border-[#303833] hover:border-[#168BFF]/70 transition duration-200">
            <div>
              {/* Flat 2D Top-Down Arena Illustration */}
              <div className="w-full aspect-[16/10] rounded-md bg-[#0B0E0D] border border-[#303833] mb-5 p-4 flex items-center justify-center">
                <svg viewBox="0 0 240 140" className="w-full h-full select-none" fill="none">
                  {/* Rounded table body */}
                  <rect x="10" y="10" width="220" height="120" rx="14" fill="#171D1A" stroke="#303833" strokeWidth="1.5" />
                  {/* Center line */}
                  <line x1="120" y1="12" x2="120" y2="128" stroke="#303833" strokeWidth="1" strokeDasharray="4 4" />
                  {/* Center circle */}
                  <circle cx="120" cy="70" r="24" stroke="#303833" strokeWidth="1" />
                  {/* Left goal */}
                  <rect x="8" y="50" width="4" height="40" fill="#168BFF" />
                  <circle cx="50" cy="70" r="14" fill="#168BFF" />
                  <circle cx="50" cy="70" r="6" fill="#121715" />
                  {/* Right goal */}
                  <rect x="228" y="50" width="4" height="40" fill="#E65361" />
                  <circle cx="190" cy="70" r="14" fill="#E65361" />
                  <circle cx="190" cy="70" r="6" fill="#121715" />
                  {/* Puck */}
                  <circle cx="120" cy="70" r="5" fill="#EAE7DE" stroke="#A6AAA2" strokeWidth="1" />
                </svg>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#168BFF]" />
                <h3 className="text-lg font-bold text-[#EAE7DE] uppercase tracking-wide">
                  AIR HOCKEY
                </h3>
              </div>

              <p className="text-xs text-[#A6AAA2] leading-relaxed mb-6">
                Direct top-down air table hockey. Low-friction sliding puck, perimeter bank shots,
                and circular goal openings.
              </p>
            </div>

            <button
              onClick={() => {
                audioManager.playButtonClick();
                onSelectGame('air-hockey');
              }}
              className="w-full py-3 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-wider uppercase transition"
            >
              PLAY AIR HOCKEY
            </button>
          </div>

          {/* Card 2: Arcade Table Tennis */}
          <div className="flex flex-col justify-between p-6 rounded-lg bg-[#121715] border border-[#303833] hover:border-[#E65361]/70 transition duration-200">
            <div>
              {/* Flat 2D Top-Down Arena Illustration */}
              <div className="w-full aspect-[16/10] rounded-md bg-[#0B0E0D] border border-[#303833] mb-5 p-4 flex items-center justify-center">
                <svg viewBox="0 0 240 140" className="w-full h-full select-none" fill="none">
                  {/* Rectangular table body */}
                  <rect x="10" y="10" width="220" height="120" fill="#171D1A" stroke="#303833" strokeWidth="1.5" />
                  {/* Center net divider */}
                  <line x1="120" y1="8" x2="120" y2="132" stroke="#303833" strokeWidth="1.5" strokeDasharray="3 3" />
                  <rect x="118" y="6" width="4" height="4" fill="#D9CCB2" />
                  <rect x="118" y="130" width="4" height="4" fill="#D9CCB2" />
                  {/* Left paddle: Blue */}
                  <rect x="24" y="52" width="6" height="36" rx="2" fill="#168BFF" />
                  {/* Right paddle: Red */}
                  <rect x="210" y="52" width="6" height="36" rx="2" fill="#E65361" />
                  {/* Ball */}
                  <circle cx="100" cy="65" r="4" fill="#EAE7DE" stroke="#A6AAA2" strokeWidth="0.5" />
                </svg>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#E65361]" />
                <h3 className="text-lg font-bold text-[#EAE7DE] uppercase tracking-wide">
                  ARCADE TABLE TENNIS
                </h3>
              </div>

              <p className="text-xs text-[#A6AAA2] leading-relaxed mb-6">
                Fast-paced rally ping pong. Dynamic spin trajectory, accelerating return speeds,
                and fist gesture activated smash returns.
              </p>
            </div>

            <button
              onClick={() => {
                audioManager.playButtonClick();
                onSelectGame('table-tennis');
              }}
              className="w-full py-3 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-wider uppercase transition"
            >
              PLAY TABLE TENNIS
            </button>
          </div>

          {/* Card 3: Neon Boxing */}
          <div className="flex flex-col justify-between p-6 rounded-lg bg-[#121715] border border-[#303833] hover:border-[#D9CCB2]/70 transition duration-200">
            <div>
              <div className="w-full aspect-[16/10] rounded-md bg-[#0B0E0D] border border-[#303833] mb-5 p-4 flex items-center justify-center">
                <svg viewBox="0 0 240 140" className="w-full h-full select-none" fill="none" aria-hidden="true">
                  <path d="M16 82 44 28h152l28 54-28 38H44L16 82Z" fill="#121715" stroke="#303833" strokeWidth="2" />
                  <path d="M30 82h180M42 54h156M42 108h156" stroke="#303833" strokeWidth="2" />
                  <path d="M120 32v92" stroke="#A6AAA2" strokeOpacity=".45" strokeDasharray="4 5" />
                  <circle cx="83" cy="54" r="11" fill="#202723" stroke="#168BFF" strokeWidth="4" />
                  <path d="M83 68v24m0-14L67 90m16-12 16 9m-16 5-11 20m11-20 12 20" stroke="#168BFF" strokeWidth="7" strokeLinecap="round" />
                  <circle cx="157" cy="54" r="11" fill="#202723" stroke="#E65361" strokeWidth="4" />
                  <path d="M157 68v24m0-14 16 9m-16-9-16 9m16 5 11 20m-11-20-12 20" stroke="#E65361" strokeWidth="7" strokeLinecap="round" />
                  <circle cx="111" cy="72" r="5" fill="#D9CCB2" />
                  <circle cx="129" cy="72" r="5" fill="#D9CCB2" />
                </svg>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#D9CCB2]" />
                <h3 className="text-lg font-bold text-[#EAE7DE] uppercase tracking-wide">NEON BOXING</h3>
              </div>

              <p className="text-xs text-[#A6AAA2] leading-relaxed mb-6">
                Read head movement and both wrists for each player. Duck, sway, guard, and punch in a best-of-three ring match.
              </p>
            </div>

            <button
              onClick={() => {
                audioManager.playButtonClick();
                onSelectGame('boxing');
              }}
              className="w-full py-3 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] text-xs font-bold tracking-wider uppercase transition"
            >
              ENTER THE RING
            </button>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#A6AAA2]">
        All three games support camera input, local keyboard, or solo play against AI.
      </footer>
    </div>
  );
};
