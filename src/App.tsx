import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameType,
  ControlMode,
  NavigationScreen,
  MatchState,
  PlayerId,
  PlayerScore,
  GameSettings,
  MatchStats,
} from './types';
import { useCamera } from './hooks/useCamera';
import { useHandTracking } from './hooks/useHandTracking';
import { audioManager } from './audio/AudioManager';

// Views
import { LandingPage } from './components/LandingPage/LandingPage';
import { GameSelection } from './components/GameSelection/GameSelection';
import { InputSetup } from './components/InputSetup/InputSetup';
import { CameraSetup } from './components/CameraSetup/CameraSetup';
import { Calibration } from './components/Calibration/Calibration';

// Game Engines
import { AirHockey } from './games/air-hockey/AirHockey';
import { TableTennis } from './games/table-tennis/TableTennis';

// Overlays & HUD
import { GameHUD } from './components/GameHUD/GameHUD';
import { HandTrackingPreview } from './components/HandTrackingPreview/HandTrackingPreview';
import { PauseMenu } from './components/PauseMenu/PauseMenu';
import { SettingsModal } from './components/Settings/SettingsModal';
import { ResultsScreen } from './components/ResultsScreen/ResultsScreen';

const DEFAULT_SETTINGS: GameSettings = {
  targetScore: 5,
  matchDuration: 180,
  aiDifficulty: 'medium',
  soundEnabled: true,
  sfxVolume: 0.5,
  showHandPreview: true,
  smoothingFactor: 0.25,
  p1ColorTarget: { r: 22, g: 139, b: 255, hex: '#168BFF' },
  p2ColorTarget: { r: 230, g: 83, b: 97, hex: '#E65361' },
  colorTolerance: 120,
  colorTrackingMode: 'spatial-priority',
};

export const App: React.FC = () => {
  // Navigation & Game State
  const [screen, setScreen] = useState<NavigationScreen>('landing');
  const [activeGame, setActiveGame] = useState<GameType>('air-hockey');
  const [controlMode, setControlMode] = useState<ControlMode>('camera');
  const [matchState, setMatchState] = useState<MatchState>('countdown');

  // Gameplay Scores & Metrics
  const [scores, setScores] = useState<PlayerScore>({ p1: 0, p2: 0 });
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Settings & Modals
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHandPreview, setShowHandPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Match Statistics
  const matchStartTimeRef = useRef<number>(0);
  const matchStatsRef = useRef<MatchStats>({
    winner: null,
    duration: 0,
    p1Score: 0,
    p2Score: 0,
    totalHits: 0,
    p1Hits: 0,
    p2Hits: 0,
    maxRally: 0,
    goalsScored: 0,
    gameType: 'air-hockey',
  });
  const [finalStats, setFinalStats] = useState<MatchStats | null>(null);

  // Camera & Hand Tracking Hooks
  const {
    videoRef,
    stream: cameraStream,
    status: cameraStatus,
    errorMessage: cameraErrorMessage,
    startCamera,
    stopCamera,
  } = useCamera();

  const {
    p1Hand,
    p2Hand,
    isModelReady,
    previewCanvasRef,
    trackingFps,
    handsDetectedCount,
  } = useHandTracking({
    videoElement: videoRef.current,
    isEnabled: controlMode === 'camera' && (screen === 'camera-setup' || screen === 'calibration' || screen === 'gameplay'),
    smoothingFactor: settings.smoothingFactor,
    p1ColorTarget: settings.p1ColorTarget,
    p2ColorTarget: settings.p2ColorTarget,
    colorTolerance: settings.colorTolerance,
  });

  // Track Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Global Keyboard shortcuts (Space to start, Escape to pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && screen === 'gameplay') {
        if (matchState === 'playing') {
          setMatchState('paused');
        } else if (matchState === 'paused') {
          setMatchState('playing');
        }
      }
      if (e.key === ' ' && screen === 'landing') {
        setScreen('game-selection');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, matchState]);

  // Match timer loop
  useEffect(() => {
    let interval: number;
    if (screen === 'gameplay' && matchState === 'playing') {
      interval = window.setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screen, matchState]);

  // Start match countdown (3, 2, 1, GO!)
  const triggerMatchCountdown = useCallback(() => {
    setCountdown(3);
    setMatchState('countdown');
    audioManager.playCountdownTick(false);

    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        audioManager.playCountdownTick(false);
      } else if (count === 0) {
        setCountdown(0);
        audioManager.playCountdownTick(true);
      } else {
        clearInterval(timer);
        setCountdown(null);
        setMatchState('playing');
        matchStartTimeRef.current = Date.now();
      }
    }, 850);
  }, []);

  // Launch match into gameplay screen
  const startMatch = useCallback(() => {
    setScores({ p1: 0, p2: 0 });
    setTimerSeconds(0);
    matchStatsRef.current = {
      winner: null,
      duration: 0,
      p1Score: 0,
      p2Score: 0,
      totalHits: 0,
      p1Hits: 0,
      p2Hits: 0,
      maxRally: 0,
      goalsScored: 0,
      gameType: activeGame,
    };
    setFinalStats(null);
    setScreen('gameplay');
    triggerMatchCountdown();
  }, [activeGame, triggerMatchCountdown]);

  // Handle Score Event
  const handleScore = useCallback((scorer: PlayerId) => {
    setScores(prev => {
      const nextP1 = scorer === 'p1' ? prev.p1 + 1 : prev.p1;
      const nextP2 = scorer === 'p2' ? prev.p2 + 1 : prev.p2;

      matchStatsRef.current.p1Score = nextP1;
      matchStatsRef.current.p2Score = nextP2;
      matchStatsRef.current.goalsScored += 1;

      if (nextP1 >= settings.targetScore || nextP2 >= settings.targetScore) {
        const winner = nextP1 >= settings.targetScore ? 'p1' : 'p2';
        matchStatsRef.current.winner = winner;
        matchStatsRef.current.duration = Math.round((Date.now() - matchStartTimeRef.current) / 1000);
        setFinalStats({ ...matchStatsRef.current });
        setMatchState('match-complete');
      }

      return { p1: nextP1, p2: nextP2 };
    });
  }, [settings.targetScore]);

  // Handle Hit Event
  const handleHit = useCallback((player: PlayerId, rallyCount?: number) => {
    matchStatsRef.current.totalHits += 1;
    if (player === 'p1') matchStatsRef.current.p1Hits += 1;
    if (player === 'p2') matchStatsRef.current.p2Hits += 1;
    if (rallyCount && rallyCount > matchStatsRef.current.maxRally) {
      matchStatsRef.current.maxRally = rallyCount;
    }
  }, []);

  // Update Settings
  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B0E0D] text-[#EAE7DE] select-none font-sans">
      {/* Active system video element for camera feed capture */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed -top-[9999px] -left-[9999px] w-[640px] h-[480px] opacity-0 pointer-events-none"
      />

      {/* Screen 1: Landing Page */}
      {screen === 'landing' && (
        <LandingPage
          cameraStatus={cameraStatus}
          onRequestCamera={() => startCamera()}
          onStart={() => setScreen('game-selection')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Screen 2: Game Selection */}
      {screen === 'game-selection' && (
        <GameSelection
          onSelectGame={(type) => {
            setActiveGame(type);
            setScreen('input-setup');
          }}
          onBack={() => setScreen('landing')}
        />
      )}

      {/* Screen 3: Input Method Setup */}
      {screen === 'input-setup' && (
        <InputSetup
          selectedMode={controlMode}
          onSelectMode={setControlMode}
          onContinue={() => {
            if (controlMode === 'camera') {
              if (cameraStatus === 'active') {
                setScreen('calibration');
              } else {
                setScreen('camera-setup');
              }
            } else {
              startMatch();
            }
          }}
          onBack={() => setScreen('game-selection')}
        />
      )}

      {/* Screen 4: Camera Setup (Webcam Permission & Initialization) */}
      {screen === 'camera-setup' && (
        <CameraSetup
          status={cameraStatus}
          errorMessage={cameraErrorMessage}
          stream={cameraStream}
          onRequestCamera={() => startCamera()}
          onContinue={() => setScreen('calibration')}
          onFallbackToKeyboard={() => {
            setControlMode('keyboard-mouse');
            startMatch();
          }}
          onBack={() => setScreen('input-setup')}
        />
      )}

      {/* Screen 5: Hand Calibration */}
      {screen === 'calibration' && (
        <Calibration
          p1Hand={p1Hand}
          p2Hand={p2Hand}
          previewCanvasRef={previewCanvasRef}
          onCalibrationComplete={startMatch}
          onBack={() => setScreen('camera-setup')}
        />
      )}

      {/* Screen 6: Active Gameplay */}
      {screen === 'gameplay' && (
        <div className="relative w-full h-full flex flex-col bg-[#0B0E0D]">
          {/* Top HUD */}
          <GameHUD
            gameType={activeGame}
            controlMode={controlMode}
            scores={scores}
            timerSeconds={timerSeconds}
            p1Hand={p1Hand}
            p2Hand={p2Hand}
            onPause={() => setMatchState('paused')}
            onRestart={() => {
              setScores({ p1: 0, p2: 0 });
              setTimerSeconds(0);
              triggerMatchCountdown();
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />

          {/* Active Canvas Game View: Table occupies most of the gameplay viewport */}
          <div className="relative flex-1 w-full h-full pt-14 pb-12 flex items-center justify-center">
            {activeGame === 'air-hockey' ? (
              <AirHockey
                p1Hand={p1Hand}
                p2Hand={p2Hand}
                controlMode={controlMode}
                settings={settings}
                videoElement={videoRef.current}
                isPaused={matchState !== 'playing'}
                onScore={handleScore}
                onHit={handleHit}
              />
            ) : (
              <TableTennis
                p1Hand={p1Hand}
                p2Hand={p2Hand}
                controlMode={controlMode}
                settings={settings}
                videoElement={videoRef.current}
                isPaused={matchState !== 'playing'}
                onScore={handleScore}
                onHit={handleHit}
              />
            )}
          </div>

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
              <span className="font-mono text-7xl md:text-9xl font-extrabold text-[#EAE7DE] tracking-widest animate-pulse">
                {countdown === 0 ? 'GO!' : countdown}
              </span>
            </div>
          )}

          {/* Floating PIP Hand Tracking Preview (Top-Right) */}
          {controlMode === 'camera' && showHandPreview && (
            <HandTrackingPreview
              canvasRef={previewCanvasRef}
              p1Hand={p1Hand}
              p2Hand={p2Hand}
              isModelReady={isModelReady}
              cameraStatus={cameraStatus}
              trackingFps={trackingFps}
              handsDetectedCount={handsDetectedCount}
              onClose={() => setShowHandPreview(false)}
            />
          )}

          {/* Pause Menu Modal */}
          {matchState === 'paused' && (
            <PauseMenu
              onResume={() => setMatchState('playing')}
              onRestart={() => {
                setScores({ p1: 0, p2: 0 });
                setTimerSeconds(0);
                triggerMatchCountdown();
              }}
              onSwitchGame={() => setScreen('game-selection')}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onQuitToMenu={() => {
                stopCamera();
                setScreen('landing');
              }}
            />
          )}

          {/* Victory / Results Modal */}
          {matchState === 'match-complete' && finalStats && (
            <ResultsScreen
              stats={finalStats}
              onRematch={() => {
                setScores({ p1: 0, p2: 0 });
                setTimerSeconds(0);
                triggerMatchCountdown();
              }}
              onSwitchGame={() => setScreen('game-selection')}
              onQuitToMenu={() => {
                stopCamera();
                setScreen('landing');
              }}
            />
          )}
        </div>
      )}

      {/* Global Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
