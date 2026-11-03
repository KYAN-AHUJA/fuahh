import React, { useEffect } from 'react';
import { Trophy, RotateCcw, ArrowRight, Home, Flame, Clock, Zap } from 'lucide-react';
import { MatchStats } from '../../types';
import { audioManager } from '../../audio/AudioManager';

interface ResultsScreenProps {
  stats: MatchStats;
  onRematch: () => void;
  onSwitchGame: () => void;
  onQuitToMenu: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  stats,
  onRematch,
  onSwitchGame,
  onQuitToMenu,
}) => {
  const isP1Winner = stats.winner === 'p1';
  const winnerColor = isP1Winner ? '#168BFF' : '#E65361';
  const winnerTitle = isP1Winner ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';

  useEffect(() => {
    audioManager.playVictory();
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-[#121715] border border-[#303833] shadow-2xl p-7 text-center">
        {/* Trophy icon */}
        <div className="inline-flex p-3 rounded-lg mb-3 bg-[#171D1A] border border-[#303833]">
          <Trophy size={32} style={{ color: winnerColor }} />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-[#EAE7DE] uppercase mb-1">
          {winnerTitle}
        </h1>
        <p className="text-[11px] uppercase tracking-widest text-[#A6AAA2] font-mono mb-6">
          {stats.gameType === 'air-hockey' ? 'Air Hockey Match' : 'Table Tennis Match'}
        </p>

        {/* Final Scoreboard */}
        <div className="flex items-center justify-center gap-6 py-4 px-6 rounded-lg bg-[#171D1A] border border-[#303833] mb-6">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-[#168BFF] tracking-wider mb-1">PLAYER 1</span>
            <span className={`font-mono text-4xl font-bold ${isP1Winner ? 'text-[#EAE7DE]' : 'text-[#A6AAA2]'}`}>
              {stats.p1Score}
            </span>
          </div>

          <span className="text-xl font-bold text-[#303833]">:</span>

          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-[#E65361] tracking-wider mb-1">PLAYER 2</span>
            <span className={`font-mono text-4xl font-bold ${!isP1Winner ? 'text-[#EAE7DE]' : 'text-[#A6AAA2]'}`}>
              {stats.p2Score}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-2.5 rounded-md bg-[#171D1A] border border-[#303833] text-center">
            <div className="flex items-center justify-center gap-1 text-[#A6AAA2] text-[10px] uppercase font-mono mb-1">
              <Clock size={11} />
              <span>TIME</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#EAE7DE]">
              {formatDuration(stats.duration)}
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-[#171D1A] border border-[#303833] text-center">
            <div className="flex items-center justify-center gap-1 text-[#A6AAA2] text-[10px] uppercase font-mono mb-1">
              <Zap size={11} />
              <span>HITS</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#EAE7DE]">
              {stats.totalHits}
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-[#171D1A] border border-[#303833] text-center">
            <div className="flex items-center justify-center gap-1 text-[#A6AAA2] text-[10px] uppercase font-mono mb-1">
              <Flame size={11} />
              <span>RALLY</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#EAE7DE]">
              {stats.maxRally}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onRematch();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-[#D9CCB2] hover:bg-[#eae0cb] text-[#171916] font-bold text-xs tracking-wider uppercase transition"
          >
            <RotateCcw size={14} />
            <span>PLAY AGAIN (REMATCH)</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onSwitchGame();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#171D1A] hover:bg-[#202723] border border-[#303833] text-[#EAE7DE] font-medium text-xs tracking-wider uppercase transition"
          >
            <ArrowRight size={14} />
            <span>SELECT DIFFERENT GAME</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onQuitToMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-[#A6AAA2] hover:text-[#EAE7DE] font-medium text-xs tracking-wider uppercase transition"
          >
            <Home size={13} />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
