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
import { useBoxingTracking } from './hooks/useBoxingTracking';
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
import { Boxing } from './games/boxing/Boxing';

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
  smoothingFactor: 0.05,
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
  const [boxingRestartKey, setBoxingRestartKey] = useState(0);

  // Settings & Modals
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHandPreview, setShowHandPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Match Statistics
  const matchStartTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<number | null>(null);
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
    handTrackingRef,
    isModelReady,
    previewCanvasRef,
    trackingFps,
    handsDetectedCount,
  } = useHandTracking({
    videoElement: videoRef.current,
    isEnabled: activeGame !== 'boxing' && controlMode === 'camera' && (screen === 'camera-setup' || screen === 'calibration' || screen === 'gameplay'),
    smoothingFactor: settings.smoothingFactor,
    p1ColorTarget: settings.p1ColorTarget,
    p2ColorTarget: settings.p2ColorTarget,
    colorTolerance: settings.colorTolerance,
  });

  const {
    players: boxingTracking,
    playersRef: boxingTrackingRef,
    isModelReady: isBoxingModelReady,
    trackingError: boxingTrackingError,
    previewCanvasRef: boxingPreviewCanvasRef,
  } = useBoxingTracking({
    videoElement: videoRef.current,
    isEnabled: activeGame === 'boxing' && controlMode === 'camera' && (screen === 'calibration' || screen === 'gameplay'),
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
    if (screen === 'gameplay' && matchState === 'playing' && activeGame !== 'boxing') {
      interval = window.setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screen, matchState, activeGame]);

  useEffect(() => {
    if (activeGame === 'boxing' || screen !== 'gameplay' || matchState !== 'playing' || settings.matchDuration <= 0 || timerSeconds < settings.matchDuration) {
      return;
    }

    const winner = scores.p1 === scores.p2 ? null : scores.p1 > scores.p2 ? 'p1' : 'p2';
    matchStatsRef.current.winner = winner;
    matchStatsRef.current.duration = settings.matchDuration;
    matchStatsRef.current.p1Score = scores.p1;
    matchStatsRef.current.p2Score = scores.p2;
    setFinalStats({ ...matchStatsRef.current });
    setMatchState('match-complete');
  }, [activeGame, matchState, scores.p1, scores.p2, screen, settings.matchDuration, timerSeconds]);

  useEffect(() => () => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
    }
  }, []);

  // Start match countdown (3, 2, 1, GO!)
  const triggerMatchCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
    }
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
        countdownIntervalRef.current = null;
        setCountdown(null);
        setMatchState('playing');
        matchStartTimeRef.current = Date.now();
      }
    }, 850);
    countdownIntervalRef.current = timer;
  }, []);

  const resetMatch = useCallback(() => {
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
    if (activeGame === 'boxing') setBoxingRestartKey(key => key + 1);
    triggerMatchCountdown();
  }, [activeGame, triggerMatchCountdown]);

  // Launch match into gameplay screen
  const startMatch = useCallback(() => {
    resetMatch();
    setScreen('gameplay');
  }, [resetMatch]);

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

  const handleBoxingRoundEnd = useCallback((_winner: PlayerId, p1Wins: number, p2Wins: number) => {
    setScores({ p1: p1Wins, p2: p2Wins });
    matchStatsRef.current.p1Score = p1Wins;
    matchStatsRef.current.p2Score = p2Wins;
    matchStatsRef.current.goalsScored = p1Wins + p2Wins;
  }, []);

  const handleBoxingMatchEnd = useCallback((winner: PlayerId) => {
    matchStatsRef.current.winner = winner;
    matchStatsRef.current.duration = Math.round((Date.now() - matchStartTimeRef.current) / 1000);
    setFinalStats({ ...matchStatsRef.current });
    setMatchState('match-complete');
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
          gameType={activeGame}
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
          gameType={activeGame}
          boxingTracking={boxingTracking}
          boxingPreviewCanvasRef={boxingPreviewCanvasRef}
          boxingModelReady={isBoxingModelReady}
          boxingTrackingError={boxingTrackingError}
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
            p1InputReady={activeGame === 'boxing' ? boxingTracking.p1.head.isDetected && boxingTracking.p1.leftHand.isDetected && boxingTracking.p1.rightHand.isDetected : undefined}
            p2InputReady={activeGame === 'boxing' ? boxingTracking.p2.head.isDetected && boxingTracking.p2.leftHand.isDetected && boxingTracking.p2.rightHand.isDetected : undefined}
            onPause={() => setMatchState('paused')}
            onRestart={resetMatch}
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
                handTrackingRef={handTrackingRef}
                controlMode={controlMode}
                settings={settings}
                videoElement={videoRef.current}
                isPaused={matchState !== 'playing'}
                onScore={handleScore}
                onHit={handleHit}
              />
            ) : activeGame === 'table-tennis' ? (
              <TableTennis
                p1Hand={p1Hand}
                p2Hand={p2Hand}
                handTrackingRef={handTrackingRef}
                controlMode={controlMode}
                settings={settings}
                videoElement={videoRef.current}
                isPaused={matchState !== 'playing'}
                onScore={handleScore}
                onHit={handleHit}
              />
            ) : (
              <Boxing
                tracking={boxingTracking}
                trackingRef={boxingTrackingRef}
                controlMode={controlMode}
                settings={settings}
                isPaused={matchState !== 'playing' || isSettingsOpen}
                restartKey={boxingRestartKey}
                showTrackingPreview={showHandPreview}
                onCloseTrackingPreview={() => setShowHandPreview(false)}
                onRoundEnd={handleBoxingRoundEnd}
                onMatchEnd={handleBoxingMatchEnd}
                onHit={handleHit}
                previewCanvasRef={boxingPreviewCanvasRef}
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
          {activeGame !== 'boxing' && controlMode === 'camera' && showHandPreview && (
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
              onRestart={resetMatch}
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
              onRematch={resetMatch}
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
