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
  const winnerTitle = isP1Winner ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';

  useEffect(() => {
    audioManager.playVictory();
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-2xl bg-[#0f141c] border border-[#263346] shadow-2xl p-8 text-center relative overflow-hidden">
        {/* Top ambient aura */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: winnerColor }}
        />

        {/* Trophy icon */}
        <div className="inline-flex p-4 rounded-2xl mb-4 bg-[#1a2230] border border-[#263346] shadow-inner relative">
          <Trophy size={42} style={{ color: winnerColor }} />
        </div>

        <h1 className="text-2xl font-black tracking-wider text-white uppercase mb-1">
          {winnerTitle}
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#94a3b8] font-mono mb-6">
          {stats.gameType === 'air-hockey' ? 'Air Hockey Championship' : 'Arcade Table Tennis Match'}
        </p>

        {/* Final Scoreboard Card */}
        <div className="flex items-center justify-center gap-6 py-4 px-6 rounded-xl bg-[#141a24] border border-[#1e293b] mb-6">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-[#168BFF] tracking-wider mb-1">PLAYER 1</span>
            <span className={`font-mono text-4xl font-black ${isP1Winner ? 'text-white' : 'text-[#64748b]'}`}>
              {stats.p1Score}
            </span>
          </div>

          <span className="text-2xl font-black text-[#38485e]">:</span>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-[#E65361] tracking-wider mb-1">PLAYER 2</span>
            <span className={`font-mono text-4xl font-black ${!isP1Winner ? 'text-white' : 'text-[#64748b]'}`}>
              {stats.p2Score}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-8">
          <div className="p-3 rounded-lg bg-[#141a24]/60 border border-[#1e293b] text-center">
            <div className="flex items-center justify-center gap-1 text-[#94a3b8] text-[11px] mb-1">
              <Clock size={12} />
              <span>DURATION</span>
            </div>
            <div className="font-mono text-sm font-bold text-white">
              {formatDuration(stats.duration)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#141a24]/60 border border-[#1e293b] text-center">
            <div className="flex items-center justify-center gap-1 text-[#94a3b8] text-[11px] mb-1">
              <Zap size={12} />
              <span>TOTAL HITS</span>
            </div>
            <div className="font-mono text-sm font-bold text-white">
              {stats.totalHits}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#141a24]/60 border border-[#1e293b] text-center">
            <div className="flex items-center justify-center gap-1 text-[#94a3b8] text-[11px] mb-1">
              <Flame size={12} className="text-amber-500" />
              <span>MAX RALLY</span>
            </div>
            <div className="font-mono text-sm font-bold text-amber-400">
              {stats.maxRally}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              audioManager.playButtonClick();
              onRematch();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm tracking-wide transition shadow-lg"
            style={{ backgroundColor: winnerColor }}
          >
            <RotateCcw size={16} />
            <span>PLAY AGAIN (REMATCH)</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onSwitchGame();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a2230] hover:bg-[#263346] border border-[#263346] text-[#e2e8f0] font-semibold text-sm transition"
          >
            <ArrowRight size={15} />
            <span>SELECT DIFFERENT GAME</span>
          </button>

          <button
            onClick={() => {
              audioManager.playButtonClick();
              onQuitToMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[#94a3b8] hover:text-white font-medium text-xs transition"
          >
            <Home size={14} />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
