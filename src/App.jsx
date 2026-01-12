import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, Star, Skull, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Bot, User, Wifi, WifiOff, Copy, Check, Save, Upload, Undo2, Layers, Hand } from 'lucide-react';
import Peer from 'peerjs';

export default function BoardGame() {
  // Each color's path around the board
  // Position 0 is the first square AFTER home
  // Outer circle: positions 0-14 (15 squares)
  // Inner circle: positions 15-22 (8 squares leading to heaven)
  // Heaven: position 23
  const paths = {
    // Yellow: home [4,2], enters inner from [4,1], spirals through inner circle to heaven
    // Outer (0-14): around the board edge
    // Inner (15-22): [3,1]→[2,1]→[1,1]→[1,2]→[1,3]→[2,3]→[3,3]→[3,2]
    // Heaven (23): [2,2]
    yellow: [
      [4,3],[4,4],[3,4],[2,4],[1,4],[0,4],[0,3],[0,2],  // 0-7
      [0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],        // 8-14 (enters inner after 14)
      [3,1],[2,1],[1,1],[1,2],[1,3],[2,3],[3,3],[3,2]   // 15-22 inner circle, then 23=heaven [2,2]
    ],
    // Green: home [2,4], enters inner from [1,4], spirals through inner circle to heaven
    // Outer (0-14): opposite direction - goes up first then around
    // Inner (15-22): [3,3]→[3,2]→[3,1]→[2,1]→[1,1]→[1,2]→[1,3]→[2,3]
    // Heaven (23): [2,2]
    green: [
      [1,4],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],  // 0-7
      [3,0],[4,0],[4,1],[4,2],[4,3],[4,4],[3,4],        // 8-14 (enters inner after 14)
      [3,3],[3,2],[3,1],[2,1],[1,1],[1,2],[1,3],[2,3]   // 15-22 inner circle, then 23=heaven [2,2]
    ],
    // Blue: home [0,2], enters inner from [0,3], spirals through inner circle to heaven
    // Outer (0-14): around the board edge
    // Inner (15-22): [1,3]→[2,3]→[3,3]→[3,2]→[3,1]→[2,1]→[1,1]→[1,2]
    // Heaven (23): [2,2]
    blue: [
      [0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],  // 0-7
      [4,3],[4,4],[3,4],[2,4],[1,4],[0,4],[0,3],        // 8-14 (enters inner after 14)
      [1,3],[2,3],[3,3],[3,2],[3,1],[2,1],[1,1],[1,2]   // 15-22 inner circle, then 23=heaven [2,2]
    ],
    // Red: home [2,0], enters inner from [1,0], spirals through inner circle to heaven
    // Outer (0-14): around the board edge
    // Inner (15-22): [1,1]→[1,2]→[1,3]→[2,3]→[3,3]→[3,2]→[3,1]→[2,1]
    // Heaven (23): [2,2]
    red: [
      [3,0],[4,0],[4,1],[4,2],[4,3],[4,4],[3,4],[2,4],  // 0-7
      [1,4],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],        // 8-14 (enters inner after 14)
      [1,1],[1,2],[1,3],[2,3],[3,3],[3,2],[3,1],[2,1]   // 15-22 inner circle, then 23=heaven [2,2]
    ]
  };

  // Inner circle starts at position 15 (after the 15 outer squares 0-14)
  // Heaven is at position 23 (beyond position 22)
  const INNER_CIRCLE_START = 15;
  const HEAVEN_POS = 23;

  // Starting positions for each color - these are safe zones
  const startingSquares = {
    yellow: [4, 2],
    green: [2, 4],
    blue: [0, 2],
    red: [2, 0]
  };

  const allColors = ['yellow', 'green', 'blue', 'red'];
  // 3D coin color classes with lighting effects
  const colorClasses = {
    yellow: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 shadow-[0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.3)]',
    green: 'bg-gradient-to-br from-green-300 via-green-500 to-emerald-700 shadow-[0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.3)]',
    blue: 'bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-700 shadow-[0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.3)]',
    red: 'bg-gradient-to-br from-red-300 via-red-500 to-rose-700 shadow-[0_3px_6px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.3)]'
  };

  const [playerCount, setPlayerCount] = useState(null);
  const [colors, setColors] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);

  // innerMoves tracks how many positions a coin has moved within the inner circle
  // After 8 moves in inner circle (one full lap), recircling is restricted
  const [gameState, setGameState] = useState({
    yellow: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
    green: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
    blue: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
    red: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }]
  });

  // Track if each player has made at least one kill (required for inner circle)
  const [hasKilled, setHasKilled] = useState({
    yellow: false,
    green: false,
    blue: false,
    red: false
  });

  const [diceResult, setDiceResult] = useState(null);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState(null);
  const [selectedCoins, setSelectedCoins] = useState([]);

  // Track individual unused rolls (each roll must be used on ONE coin/stack)
  const [unusedRolls, setUnusedRolls] = useState([]); // Array of roll values not yet used
  const [selectedRollIndex, setSelectedRollIndex] = useState(null); // Which roll is selected to use
  const [canRoll, setCanRoll] = useState(true);
  const [consecutiveBonusCount, setConsecutiveBonusCount] = useState(0);

  // Computer player settings
  const [computerPlayers, setComputerPlayers] = useState({}); // { color: true/false }
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  // Undo history - stores last 2 game states
  const [undoHistory, setUndoHistory] = useState([]);

  // Online multiplayer state
  const [onlineMode, setOnlineMode] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [myColor, setMyColor] = useState(null);
  const [copied, setCopied] = useState(false);
  const connectionRef = useRef(null);

  // Mobile stack mode - allows selecting coins without Shift key
  const [stackMode, setStackMode] = useState(false);

  const startGame = (numPlayers, cpuPlayers = {}) => {
    const selectedColors = numPlayers === 2 ? ['yellow', 'blue'] : allColors;
    setPlayerCount(numPlayers);
    setColors(selectedColors);
    setCurrentPlayer(0);
    setComputerPlayers(cpuPlayers);
    setIsComputerThinking(false);
    setMessage(`${selectedColors[0]}'s turn! Roll the dice.`);
    setGameState({
      yellow: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
      green: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
      blue: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
      red: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }]
    });
    setHasKilled({ yellow: false, green: false, blue: false, red: false });
    setDiceResult(null);
    setWinner(null);
    setSelectedCoins([]);
    setUnusedRolls([]);
    setSelectedRollIndex(null);
    setCanRoll(true);
    setConsecutiveBonusCount(0);
    setUndoHistory([]);
  };

  // Save current state to undo history (max 2 states)
  const saveToUndoHistory = () => {
    const currentState = {
      gameState: JSON.parse(JSON.stringify(gameState)),
      hasKilled: { ...hasKilled },
      currentPlayer,
      unusedRolls: [...unusedRolls],
      canRoll,
      consecutiveBonusCount,
      winner,
      selectedRollIndex
    };
    setUndoHistory(prev => {
      const newHistory = [...prev, currentState];
      // Keep only last 2 states
      if (newHistory.length > 2) {
        return newHistory.slice(-2);
      }
      return newHistory;
    });
  };

  // Undo last move
  const undoMove = () => {
    if (undoHistory.length === 0) {
      setMessage('No moves to undo!');
      return;
    }

    const lastState = undoHistory[undoHistory.length - 1];
    setGameState(lastState.gameState);
    setHasKilled(lastState.hasKilled);
    setCurrentPlayer(lastState.currentPlayer);
    setUnusedRolls(lastState.unusedRolls);
    setCanRoll(lastState.canRoll);
    setConsecutiveBonusCount(lastState.consecutiveBonusCount);
    setWinner(lastState.winner);
    setSelectedRollIndex(lastState.selectedRollIndex);
    setSelectedCoins([]);

    // Remove the used state from history
    setUndoHistory(prev => prev.slice(0, -1));
    setMessage('Move undone! ' + (undoHistory.length - 1) + ' undo(s) remaining.');
  };

  // Save game to localStorage and also download as file
  const saveGame = () => {
    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      gameState,
      hasKilled,
      currentPlayer,
      colors,
      playerCount,
      computerPlayers,
      unusedRolls,
      canRoll,
      consecutiveBonusCount,
      winner
    };

    // Save to localStorage
    localStorage.setItem('attha_save', JSON.stringify(saveData));

    // Also download as file
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attha_save_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMessage('Game saved!');
  };

  // Load game from localStorage or file
  const loadGame = (saveData) => {
    try {
      if (!saveData || !saveData.gameState) {
        setMessage('Invalid save file!');
        return false;
      }

      setGameState(saveData.gameState);
      setHasKilled(saveData.hasKilled || { yellow: false, green: false, blue: false, red: false });
      setCurrentPlayer(saveData.currentPlayer || 0);
      setColors(saveData.colors || ['yellow', 'blue']);
      setPlayerCount(saveData.playerCount || 2);
      setComputerPlayers(saveData.computerPlayers || []);
      setUnusedRolls(saveData.unusedRolls || []);
      setCanRoll(saveData.canRoll !== undefined ? saveData.canRoll : true);
      setConsecutiveBonusCount(saveData.consecutiveBonusCount || 0);
      setWinner(saveData.winner || null);
      setSelectedCoins([]);
      setSelectedRollIndex(null);
      setMessage('Game loaded! ' + (saveData.colors?.[saveData.currentPlayer] || 'yellow') + "'s turn.");

      return true;
    } catch (e) {
      console.error('Error loading game:', e);
      setMessage('Error loading game!');
      return false;
    }
  };

  // Load from localStorage
  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('attha_save');
    if (saved) {
      const saveData = JSON.parse(saved);
      loadGame(saveData);
    } else {
      setMessage('No saved game found!');
    }
  };

  // Handle file upload for loading
  const handleFileLoad = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target.result);
        loadGame(saveData);
      } catch (err) {
        setMessage('Invalid save file!');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Generate a random 6-character room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Send game state to peer
  const sendGameState = useCallback((conn, action, data) => {
    if (conn && conn.open) {
      conn.send({ action, ...data });
    }
  }, []);

  // Handle incoming peer messages
  const handlePeerMessage = useCallback((data) => {
    switch (data.action) {
      case 'gameStart':
        setPlayerCount(2);
        setColors(['yellow', 'blue']);
        setCurrentPlayer(0);
        setGameState(data.gameState);
        setHasKilled(data.hasKilled);
        setMyColor('blue'); // Guest is always blue
        setMessage("Game started! Yellow's turn.");
        break;
      case 'stateUpdate':
        setGameState(data.gameState);
        setHasKilled(data.hasKilled);
        setCurrentPlayer(data.currentPlayer);
        setUnusedRolls(data.unusedRolls);
        setSelectedRollIndex(data.selectedRollIndex);
        setCanRoll(data.canRoll);
        setConsecutiveBonusCount(data.consecutiveBonusCount);
        setMessage(data.message);
        setWinner(data.winner);
        setDiceResult(data.diceResult);
        break;
      case 'disconnect':
        setConnectionStatus('disconnected');
        setMessage('Opponent disconnected!');
        break;
    }
  }, []);

  // Create an online game room (host)
  const createOnlineGame = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setConnectionStatus('connecting');
    setMyColor('yellow'); // Host is always yellow

    const newPeer = new Peer(`attha-${code}`, {
      debug: 1
    });

    newPeer.on('open', (id) => {
      setConnectionStatus('waiting');
      setMessage('Waiting for opponent to join...');
    });

    newPeer.on('connection', (conn) => {
      connectionRef.current = conn;
      setConnection(conn);

      conn.on('open', () => {
        setConnectionStatus('connected');
        setMessage('Opponent connected! Starting game...');

        // Initialize game
        const initialState = {
          yellow: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
          green: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
          blue: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
          red: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }]
        };
        const initialKilled = { yellow: false, green: false, blue: false, red: false };

        setPlayerCount(2);
        setColors(['yellow', 'blue']);
        setCurrentPlayer(0);
        setGameState(initialState);
        setHasKilled(initialKilled);
        setOnlineMode(true);
        setCanRoll(true);
        setUnusedRolls([]);
        setMessage("Game started! Your turn (Yellow).");

        // Send game start to guest
        sendGameState(conn, 'gameStart', {
          gameState: initialState,
          hasKilled: initialKilled
        });
      });

      conn.on('data', handlePeerMessage);

      conn.on('close', () => {
        setConnectionStatus('disconnected');
        setMessage('Opponent disconnected!');
      });
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      setConnectionStatus('disconnected');
      setMessage(`Connection error: ${err.type}`);
    });

    setPeer(newPeer);
  };

  // Join an online game room (guest)
  const joinOnlineGame = () => {
    if (!joinCode.trim()) {
      setMessage('Please enter a room code!');
      return;
    }

    setConnectionStatus('connecting');
    setIsHost(false);
    setMyColor('blue'); // Guest is always blue

    const newPeer = new Peer();

    newPeer.on('open', () => {
      const conn = newPeer.connect(`attha-${joinCode.toUpperCase()}`);
      connectionRef.current = conn;
      setConnection(conn);

      conn.on('open', () => {
        setConnectionStatus('connected');
        setOnlineMode(true);
        setMessage('Connected! Waiting for game to start...');
      });

      conn.on('data', handlePeerMessage);

      conn.on('close', () => {
        setConnectionStatus('disconnected');
        setMessage('Host disconnected!');
      });
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      setConnectionStatus('disconnected');
      if (err.type === 'peer-unavailable') {
        setMessage('Room not found! Check the code and try again.');
      } else {
        setMessage(`Connection error: ${err.type}`);
      }
    });

    setPeer(newPeer);
  };

  // Cleanup peer connection on unmount
  useEffect(() => {
    return () => {
      if (peer) {
        peer.destroy();
      }
    };
  }, [peer]);

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cancel online game setup
  const cancelOnlineSetup = () => {
    if (peer) {
      peer.destroy();
    }
    setPeer(null);
    setConnection(null);
    setConnectionStatus('disconnected');
    setRoomCode('');
    setJoinCode('');
    setIsHost(false);
    setOnlineMode(false);
    setMyColor(null);
  };

  // Sync state to peer after local changes (only for host or when it's your turn)
  const syncStateToPeer = useCallback(() => {
    if (connectionRef.current && connectionRef.current.open && onlineMode) {
      sendGameState(connectionRef.current, 'stateUpdate', {
        gameState,
        hasKilled,
        currentPlayer,
        unusedRolls,
        selectedRollIndex,
        canRoll,
        consecutiveBonusCount,
        message,
        winner,
        diceResult
      });
    }
  }, [gameState, hasKilled, currentPlayer, unusedRolls, selectedRollIndex, canRoll, consecutiveBonusCount, message, winner, diceResult, onlineMode, sendGameState]);

  // Check if a position is in inner circle
  const isInnerCircle = (pos) => pos >= INNER_CIRCLE_START && pos < HEAVEN_POS;

  // Check if any coin (NOT in inner circle) can use the given roll value
  // Used to determine if recircling should be allowed
  const canAnyNonInnerCoinUseRoll = (color, rollValue, killed) => {
    const playerCoins = gameState[color];
    const hasAnyOnBoard = playerCoins.some(c => c.pos >= 0 && c.pos < HEAVEN_POS);

    for (const coin of playerCoins) {
      if (coin.pos === HEAVEN_POS) continue; // Skip coins in heaven
      if (isInnerCircle(coin.pos)) continue; // Skip inner circle coins - we're checking non-inner only

      // Check if coin at home can leave with this roll
      if (coin.pos === -1) {
        // First coin needs 1, 4, or 8
        if (!hasAnyOnBoard && ![1, 4, 8].includes(rollValue)) continue;
        // Any roll works if there's already a coin on board
        const newPos = rollValue - 1;
        // Check if landing position is valid (not entering inner without kill)
        if (newPos < INNER_CIRCLE_START || killed) {
          return true; // This coin can use the roll
        }
        continue;
      }

      // Coin is on outer circle (pos 0-14)
      const newPos = coin.pos + rollValue;

      // Check if move is valid
      if (newPos > HEAVEN_POS) continue; // Would overshoot - can't use

      // Entering inner circle requires kill
      if (newPos >= INNER_CIRCLE_START && !killed) continue;

      // Check if any inner circle coin can reach heaven exactly with this roll
      // (those get priority over outer circle moves too)
      // Actually, inner circle coins that CAN reach heaven should use the roll
      // But that's handled separately - here we just check if outer/home coins can use it

      return true; // This coin can use the roll
    }

    // Also check if any inner circle coin can reach heaven EXACTLY with this roll
    for (const coin of playerCoins) {
      if (!isInnerCircle(coin.pos)) continue;
      const newPos = coin.pos + rollValue;
      if (newPos === HEAVEN_POS) {
        return true; // An inner circle coin can reach heaven exactly
      }
    }

    return false;
  };

  // Check if player can make any valid move with given rolls
  const canMakeAnyMoveWithRolls = (color, rolls, killed) => {
    if (rolls.length === 0) return false;

    const playerCoins = gameState[color];
    const hasAnyOnBoard = playerCoins.some(c => c.pos >= 0 && c.pos < HEAVEN_POS);
    const canLeaveHome = hasAnyOnBoard || rolls.some(r => [1, 4, 8].includes(r));

    // First pass: check for non-recircle moves (these have priority)
    for (const coin of playerCoins) {
      if (coin.pos === HEAVEN_POS) continue; // Skip coins in heaven

      // Check if coin at home can leave
      if (coin.pos === -1) {
        if (canLeaveHome) {
          for (const roll of rolls) {
            const newPos = roll - 1;
            if (newPos <= HEAVEN_POS && (newPos < INNER_CIRCLE_START || killed)) {
              return true;
            }
          }
        }
        continue;
      }

      // Check if coin on board can move with any roll
      for (const roll of rolls) {
        let newPos = coin.pos + roll;

        if (newPos > HEAVEN_POS) continue; // Can't overshoot heaven (recircle checked separately)

        // Inner circle restriction: if moving from outer to inner/heaven, need kill
        const wasInOuter = coin.pos < INNER_CIRCLE_START;
        const enteringInnerOrHeaven = newPos >= INNER_CIRCLE_START;
        if (wasInOuter && enteringInnerOrHeaven && !killed) continue;
        return true;
      }
    }

    // Second pass: check for recircle moves (only if no normal moves available)
    for (const roll of rolls) {
      // Check if any inner circle coin can recircle with this roll
      for (const coin of playerCoins) {
        if (!isInnerCircle(coin.pos)) continue;

        const newPos = coin.pos + roll;
        if (newPos > HEAVEN_POS) {
          // This would be a recircle - it's valid since no normal moves exist
          return true;
        }
      }
    }

    return false;
  };

  // Cowrie shell dice (4 shells: 4 heads=8, 3=3, 2=2, 1=1, 0 heads=4)
  const rollDice = () => {
    // In online mode, only allow rolling on your turn
    if (onlineMode && colors[currentPlayer] !== myColor) {
      setMessage("Wait for your turn!");
      return;
    }

    // Roll the cowrie dice
    const flips = Array(4).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
    const heads = flips.reduce((a, b) => a + b, 0);
    const diceValues = { 4: 8, 3: 3, 2: 2, 1: 1, 0: 4 };
    const result = diceValues[heads];

    const color = colors[currentPlayer];
    setDiceResult(result);
    setSelectedCoins([]);
    setSelectedRollIndex(null);

    const isBonusRoll = result === 4 || result === 8;

    // Count unused bonus rolls (4s and 8s) currently in the pool
    const unusedBonusCount = unusedRolls.filter(r => r === 4 || r === 8).length;
    const newUnusedBonusCount = isBonusRoll ? unusedBonusCount + 1 : unusedBonusCount;

    // Check for triple unused bonus penalty (3 unused bonus rolls)
    if (newUnusedBonusCount >= 3) {
      setUnusedRolls([]);
      setConsecutiveBonusCount(0);
      setCanRoll(true);
      setMessage(`Triple unused bonus! All moves lost. Roll again!`);
      return;
    }

    // Update consecutive count for UI warning (tracks unused bonuses)
    setConsecutiveBonusCount(newUnusedBonusCount);
    const newRolls = [...unusedRolls, result];
    setUnusedRolls(newRolls);

    // Check if any valid move exists
    const hasValidMove = canMakeAnyMoveWithRolls(color, newRolls, hasKilled[color]);

    if (!hasValidMove) {
      if (isBonusRoll) {
        setCanRoll(true);
        setMessage(`Rolled ${result}! No valid moves. Roll again.`);
      } else {
        setMessage(`Rolled ${result}! No valid moves. Turn passes.`);
        setTimeout(() => nextTurn(), 1500);
      }
      return;
    }

    // Auto-select if only one roll available
    if (newRolls.length === 1) {
      setSelectedRollIndex(0);
    }

    if (isBonusRoll) {
      setCanRoll(true);
      setMessage(`Rolled ${result}! ${newRolls.length === 1 ? 'Click a coin to move.' : 'Click a roll to select it, then click a coin.'}`);
    } else {
      setCanRoll(false);
      setMessage(`Rolled ${result}! ${newRolls.length === 1 ? 'Click a coin to move.' : 'Click a roll to select it, then click a coin.'}`);
    }
  };

  // Check if a position is a safe zone
  const isSafeSquare = (row, col) => {
    if (isHome(row, col)) return true;
    if (isHeaven(row, col)) return true;
    for (const color of allColors) {
      const [sr, sc] = startingSquares[color];
      if (row === sr && col === sc) return true;
    }
    return false;
  };

  // Check if position is safe for a color
  // Safe zones: all 4 home squares (any color), all 4 starting squares (same as homes), heaven
  const isPositionSafe = (color, pos) => {
    if (pos === -1 || pos === HEAVEN_POS) return true;
    if (pos < 0 || pos >= paths[color].length) return false;
    const [row, col] = paths[color][pos];
    return isSafeSquare(row, col);
  };

  // Get all coins at a specific board position (any color)
  const getAllCoinsAtPosition = (row, col) => {
    const result = [];
    colors.forEach(color => {
      gameState[color].forEach((coin, i) => {
        if (coin.pos >= 0 && coin.pos < paths[color].length) {
          const [coinRow, coinCol] = paths[color][coin.pos];
          if (coinRow === row && coinCol === col) {
            result.push({ color, coinIndex: i, stacked: coin.stacked });
          }
        }
      });
    });
    return result;
  };

  // Get opponent coins at a specific board position
  const getOpponentCoinsAtPosition = (row, col, excludeColor) => {
    const result = [];
    colors.forEach(opponentColor => {
      if (opponentColor !== excludeColor) {
        gameState[opponentColor].forEach((oppCoin, i) => {
          if (oppCoin.pos >= 0 && oppCoin.pos < paths[opponentColor].length) {
            const [oppRow, oppCol] = paths[opponentColor][oppCoin.pos];
            if (oppRow === row && oppCol === col) {
              result.push({ color: opponentColor, coinIndex: i, stacked: oppCoin.stacked });
            }
          }
        });
      }
    });
    return result;
  };

  // Check if position has mixed colors (protected from capture)
  const hasMultipleColors = (row, col) => {
    const coinsAtPos = getAllCoinsAtPosition(row, col);
    const uniqueColors = new Set(coinsAtPos.map(c => c.color));
    return uniqueColors.size > 1;
  };

  // State for drag-to-merge rolls
  const [draggedRollIndex, setDraggedRollIndex] = useState(null);

  // Form a stack from selected coins
  const formStack = () => {
    if (selectedCoins.length < 2) return;

    const color = colors[currentPlayer];
    const newState = {
      yellow: gameState.yellow.map(c => ({ ...c })),
      green: gameState.green.map(c => ({ ...c })),
      blue: gameState.blue.map(c => ({ ...c })),
      red: gameState.red.map(c => ({ ...c }))
    };

    // Mark all selected coins as stacked
    selectedCoins.forEach(idx => {
      newState[color][idx].stacked = true;
    });

    setGameState(newState);
    setSelectedCoins([]);
    setMessage(`Formed a stack of ${selectedCoins.length} coins!`);
  };

  // Select a roll to use
  const handleRollClick = (index) => {
    if (selectedRollIndex === index) {
      setSelectedRollIndex(null);
    } else {
      setSelectedRollIndex(index);
    }
    setSelectedCoins([]);
  };

  // Drag handlers for merging rolls
  const handleRollDragStart = (e, index) => {
    setDraggedRollIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRollDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRollDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedRollIndex === null || draggedRollIndex === targetIndex) {
      setDraggedRollIndex(null);
      return;
    }

    // Merge the two rolls
    const draggedValue = unusedRolls[draggedRollIndex];
    const targetValue = unusedRolls[targetIndex];
    const mergedValue = draggedValue + targetValue;

    // Create new rolls array without the two merged rolls, plus the new merged roll
    const newRolls = unusedRolls.filter((_, i) => i !== draggedRollIndex && i !== targetIndex);
    newRolls.push(mergedValue);

    setUnusedRolls(newRolls);
    setDraggedRollIndex(null);
    setSelectedRollIndex(null);

    // Auto-select if only one roll remains
    if (newRolls.length === 1) {
      setSelectedRollIndex(0);
    }

    setMessage(`Merged ${draggedValue} + ${targetValue} = ${mergedValue}!`);
  };

  const handleRollDragEnd = () => {
    setDraggedRollIndex(null);
  };

  // Get total of selected rolls (for combining multiple rolls on one coin)
  const getSelectedRollsTotal = () => {
    if (selectedRollIndex === null) return 0;
    // For now, single roll selection. Can be extended for multi-roll selection.
    return unusedRolls[selectedRollIndex];
  };

  // Check if a coin in inner circle can move with given roll
  // Recircling (wrapping around inner circle) is ONLY allowed when:
  // 1. The roll would NOT land exactly on heaven, AND
  // 2. No other coin (home/outer) can use this roll, AND
  // 3. No other inner circle coin can reach heaven exactly with this roll
  const canMoveInnerCircleCoin = (color, coinIdx, coinPos, rollValue) => {
    const newPos = coinPos + rollValue;

    // If this coin can reach heaven exactly, always allow
    if (newPos === HEAVEN_POS) {
      return true;
    }

    // If move wouldn't overshoot heaven, always allow (normal move within inner circle)
    if (newPos < HEAVEN_POS) {
      return true;
    }

    // At this point, the move would overshoot heaven (recircle case)
    // Only allow recircling if NO other coin can use this roll
    const canOtherCoinUseRoll = canAnyNonInnerCoinUseRoll(color, rollValue, hasKilled[color]);

    if (canOtherCoinUseRoll) {
      // Another coin can use this roll - don't allow recircling
      return false;
    }

    // No other coin can use the roll - allow recircling
    return true;
  };

  // Move selected coins with the selected roll
  const moveCoins = (coinIndices) => {
    if (winner || selectedRollIndex === null) return;

    const color = colors[currentPlayer];
    const numCoins = coinIndices.length;
    const rollValue = unusedRolls[selectedRollIndex];

    // For stacking: roll must divide evenly by number of coins
    if (numCoins > 1 && rollValue % numCoins !== 0) {
      setMessage(`Can't move ${numCoins} coins with roll ${rollValue}! (doesn't divide evenly)`);
      return;
    }

    const blocksToMove = numCoins > 1 ? rollValue / numCoins : rollValue;
    const coins = coinIndices.map(idx => ({ ...gameState[color][idx], coinIndex: idx }));

    // All coins must be at the same position
    const positions = [...new Set(coins.map(c => c.pos))];
    if (positions.length > 1) {
      setMessage('Selected coins must be on the same square!');
      return;
    }

    const currentPos = positions[0];

    if (currentPos === HEAVEN_POS) {
      setMessage('These coins are already in heaven!');
      return;
    }

    // Create deep copy
    const newState = {
      yellow: gameState.yellow.map(c => ({ ...c })),
      green: gameState.green.map(c => ({ ...c })),
      blue: gameState.blue.map(c => ({ ...c })),
      red: gameState.red.map(c => ({ ...c }))
    };

    let newPos;

    // Leaving home
    if (currentPos === -1) {
      const hasAnyOnBoard = gameState[color].some(c => c.pos >= 0 && c.pos < HEAVEN_POS);

      // First coin needs 1, 4, or 8 in the unused rolls
      if (!hasAnyOnBoard && ![1, 4, 8].includes(rollValue)) {
        setMessage('Need a roll of 1, 4, or 8 for first coin!');
        return;
      }

      newPos = blocksToMove - 1;
    } else {
      newPos = currentPos + blocksToMove;

      // Inner circle coins wrap around if they overshoot heaven
      // Inner circle is positions 15-22 (8 positions), heaven is 23
      if (newPos > HEAVEN_POS && currentPos >= INNER_CIRCLE_START) {
        // Wrap around: calculate how many positions past heaven
        // Inner circle has 8 positions (15-22), so we wrap within those
        const positionsPastHeaven = newPos - HEAVEN_POS;
        // Wrap back to start of inner circle
        newPos = INNER_CIRCLE_START + ((currentPos - INNER_CIRCLE_START + blocksToMove) % 8);
      } else if (newPos > HEAVEN_POS) {
        // Outer circle or home coins cannot overshoot
        setMessage(`Need exact ${HEAVEN_POS - currentPos} to reach heaven!`);
        return;
      }
    }

    // OUTER CIRCLE BOUNDARY: Coins in outer circle (0-15) CANNOT move beyond position 15
    // They can only enter inner circle (16+) if they have killed an opponent
    // No re-circling allowed - position 15 is the final outer circle position
    const wasInOuterCircle = currentPos >= 0 && currentPos < INNER_CIRCLE_START;
    const wouldExceedOuterCircle = newPos >= INNER_CIRCLE_START; // 16+ means entering inner or beyond

    if (wasInOuterCircle && wouldExceedOuterCircle) {
      if (!hasKilled[color]) {
        // Cannot enter inner circle without a kill - stuck at position 15
        const hasOtherMoves = canMakeAnyMoveWithRolls(color, [rollValue], hasKilled[color]);
        if (hasOtherMoves) {
          setMessage('Cannot enter inner circle without a kill! Choose a different coin.');
        } else {
          setMessage('Cannot enter inner circle without a kill! No valid moves - roll wasted.');
          // Remove the roll since no valid moves exist
          const newUnusedRolls = unusedRolls.filter((_, i) => i !== selectedRollIndex);
          setUnusedRolls(newUnusedRolls);
          setSelectedRollIndex(newUnusedRolls.length === 1 ? 0 : null);
          if (newUnusedRolls.length === 0 && !canRoll) {
            setTimeout(() => nextTurn(), 1500);
          }
        }
        return;
      }
      // Has killed - can enter inner circle, newPos is valid
    }
    // Also check for coins leaving home and landing in inner circle or heaven
    if (currentPos === -1 && newPos >= INNER_CIRCLE_START && !hasKilled[color]) {
      const hasOtherMoves = canMakeAnyMoveWithRolls(color, [rollValue], hasKilled[color]);
      if (hasOtherMoves) {
        setMessage('Cannot enter inner circle without a kill! Choose a different coin.');
      } else {
        setMessage('Cannot enter inner circle without a kill! No valid moves - roll wasted.');
        const newUnusedRolls = unusedRolls.filter((_, i) => i !== selectedRollIndex);
        setUnusedRolls(newUnusedRolls);
        setSelectedRollIndex(newUnusedRolls.length === 1 ? 0 : null);
        if (newUnusedRolls.length === 0 && !canRoll) {
          setTimeout(() => nextTurn(), 1500);
        }
      }
      return;
    }

    // Check inner circle cycling restriction (use first coin's index for the check)
    if (isInnerCircle(currentPos) && !canMoveInnerCircleCoin(color, coinIndices[0], currentPos, rollValue)) {
      setMessage('Must move coins outside inner circle first (completed one lap)!');
      return;
    }

    // Save state to undo history before making the move (only for human players, not online)
    if (!onlineMode && !computerPlayers[color]) {
      saveToUndoHistory();
    }

    // Move all selected coins and track inner circle moves
    coinIndices.forEach(idx => {
      newState[color][idx].pos = newPos;

      // Track moves within inner circle for recircling restriction
      // If moving FROM inner circle position, increment innerMoves
      if (currentPos >= INNER_CIRCLE_START && currentPos < HEAVEN_POS) {
        newState[color][idx].innerMoves = (newState[color][idx].innerMoves || 0) + blocksToMove;
      }
      // If entering inner circle for the first time, reset innerMoves
      else if (currentPos < INNER_CIRCLE_START && newPos >= INNER_CIRCLE_START) {
        newState[color][idx].innerMoves = 0;
      }
    });

    // Check if landing on opponent's home square - auto-unstack there
    let landedOnOpponentHome = false;
    if (newPos >= 0 && newPos < paths[color].length) {
      const [landRow, landCol] = paths[color][newPos];
      // Check if this is a home square that belongs to a different color
      const homeColors = {
        '4-2': 'yellow',
        '2-4': 'green',
        '0-2': 'blue',
        '2-0': 'red'
      };
      const homeOwner = homeColors[`${landRow}-${landCol}`];
      if (homeOwner && homeOwner !== color) {
        landedOnOpponentHome = true;
      }
    }

    // Stacks auto-break at opponent's home squares
    // Otherwise stacks stay together
    if (landedOnOpponentHome) {
      // Unstack when landing on opponent's home
      coinIndices.forEach(idx => {
        newState[color][idx].stacked = false;
      });
    } else if (numCoins > 1) {
      // Keep stacked when moving as a group
      coinIndices.forEach(idx => {
        newState[color][idx].stacked = true;
      });
    } else {
      // Single coin stays unstacked
      coinIndices.forEach(idx => {
        newState[color][idx].stacked = false;
      });
    }

    const stackMsg = numCoins > 1
      ? ` (${numCoins} coins, ${blocksToMove} blocks each)`
      : '';

    // Remove the used roll
    const newUnusedRolls = unusedRolls.filter((_, i) => i !== selectedRollIndex);
    setUnusedRolls(newUnusedRolls);

    // Update unused bonus count after using a roll
    const newUnusedBonusCount = newUnusedRolls.filter(r => r === 4 || r === 8).length;
    setConsecutiveBonusCount(newUnusedBonusCount);

    // Auto-select if only one roll remains
    if (newUnusedRolls.length === 1) {
      setSelectedRollIndex(0);
    } else {
      setSelectedRollIndex(null);
    }

    // Check for reaching heaven
    if (newPos === HEAVEN_POS) {
      setGameState(newState);
      setSelectedCoins([]);

      const allInHeaven = newState[color].every(c => c.pos === HEAVEN_POS);
      if (allInHeaven) {
        setWinner(color);
        setMessage(`${color.toUpperCase()} WINS!`);
        setUnusedRolls([]);
        return;
      }

      setMessage(`${numCoins > 1 ? numCoins + ' coins' : 'Coin'} reached heaven!`);

      if (newUnusedRolls.length === 0 && !canRoll) {
        setTimeout(() => nextTurn(), 1000);
      }
      return;
    }

    // Check for collision with opponent
    const [newRow, newCol] = paths[color][newPos];
    let killedOpponent = false;

    if (!isSafeSquare(newRow, newCol)) {
      // Check if position has mixed colors (protected)
      const mixedColors = hasMultipleColors(newRow, newCol);

      if (!mixedColors) {
        const opponentCoins = getOpponentCoinsAtPosition(newRow, newCol, color);

        // Stack vs Stack rule: can only kill if stack sizes match
        if (opponentCoins.length > 0 && opponentCoins.length === numCoins) {
          opponentCoins.forEach(opp => {
            newState[opp.color][opp.coinIndex].pos = -1;
            newState[opp.color][opp.coinIndex].stacked = false;
          });
          killedOpponent = true;
          setHasKilled(prev => ({ ...prev, [color]: true }));
        }
      }
      // If mixed colors, no capture happens - coins coexist safely
    }

    setGameState(newState);
    setSelectedCoins([]);

    if (killedOpponent) {
      setCanRoll(true);
      // Note: consecutiveBonusCount already updated above based on remaining unused rolls
      setMessage(`Captured opponent${stackMsg}! Roll again.`);
      return;
    }

    if (newUnusedRolls.length === 0 && !canRoll) {
      setMessage(`Moved ${blocksToMove} blocks${stackMsg}!`);
      setTimeout(() => nextTurn(), 1000);
    } else {
      const rollsLeft = newUnusedRolls.length;
      setMessage(`Moved ${blocksToMove} blocks${stackMsg}! ${rollsLeft > 0 ? `${rollsLeft} roll(s) left.` : ''}${canRoll ? ' Can roll again.' : ''}`);
    }
  };

  // Check if a coin is selected
  const isCoinSelected = (coinIndex) => selectedCoins.includes(coinIndex);

  // Handle coin click
  const handleCoinClick = (color, coinIndex, event) => {
    if (winner) return;
    // In online mode, only allow moves on your turn
    if (onlineMode && colors[currentPlayer] !== myColor) {
      setMessage("Wait for your turn!");
      return;
    }
    if (unusedRolls.length === 0) {
      setMessage('Roll the dice first!');
      return;
    }
    if (color !== colors[currentPlayer]) {
      setMessage(`It's ${colors[currentPlayer]}'s turn!`);
      return;
    }

    const coin = gameState[color][coinIndex];
    const coinPos = coin.pos;

    // Get all coins at same position (potential stack)
    const coinsAtSamePos = gameState[color]
      .map((c, idx) => ({ ...c, coinIndex: idx }))
      .filter(c => c.pos === coinPos && c.pos !== HEAVEN_POS); // Exclude coins in heaven

    // Check if coins are stacked (marked as stacked and at same position)
    const isStacked = coinsAtSamePos.length > 1 && coinsAtSamePos.some(c => c.stacked);

    // If no roll selected, prompt user
    if (selectedRollIndex === null) {
      setMessage('Click a roll first to select it!');
      return;
    }

    // If stacked, must move together (regardless of safe zone - stack only breaks when LANDING on safe zone)
    if (isStacked) {
      const stackedIndices = coinsAtSamePos.filter(c => c.stacked).map(c => c.coinIndex);
      if (stackedIndices.length > 1) {
        moveCoins(stackedIndices);
        return;
      }
    }

    // Ctrl+click, Shift+click, or Stack Mode to toggle selection for stacking (works anywhere)
    if (event?.ctrlKey || event?.metaKey || event?.shiftKey || stackMode) {
      if (selectedCoins.length > 0) {
        const firstSelectedPos = gameState[color][selectedCoins[0]].pos;
        if (coinPos !== firstSelectedPos) {
          setMessage('Can only select coins on the same square!');
          return;
        }
      }

      if (isCoinSelected(coinIndex)) {
        setSelectedCoins(selectedCoins.filter(idx => idx !== coinIndex));
      } else {
        setSelectedCoins([...selectedCoins, coinIndex]);
      }
      return;
    }

    // Multiple coins at same position but not stacked - each moves independently
    // Use Shift+click at safe zones to form a stack first, then move together

    // Regular click - move coin(s)
    if (selectedCoins.length > 0) {
      if (isCoinSelected(coinIndex)) {
        moveCoins(selectedCoins);
      } else {
        const firstSelectedPos = gameState[color][selectedCoins[0]].pos;
        if (coin.pos === firstSelectedPos) {
          moveCoins([...selectedCoins, coinIndex]);
        } else {
          setSelectedCoins([]);
          moveCoins([coinIndex]);
        }
      }
    } else {
      moveCoins([coinIndex]);
    }
  };

  const nextTurn = () => {
    const nextPlayer = (currentPlayer + 1) % colors.length;
    setCurrentPlayer(nextPlayer);
    setDiceResult(null);
    setSelectedCoins([]);
    setUnusedRolls([]);
    setSelectedRollIndex(null);
    setCanRoll(true);
    setConsecutiveBonusCount(0);
    setMessage(`${colors[nextPlayer]}'s turn! Roll the dice.`);
  };

  // ============ COMPUTER AI LOGIC ============

  // Evaluate a potential move and return a score (higher is better)
  const evaluateMove = (color, coinIndex, currentPos, newPos, rollValue, state, killed) => {
    let score = 0;

    // Reaching heaven is the best move
    if (newPos === HEAVEN_POS) {
      score += 1000;
    }

    // Moving closer to heaven is good
    score += newPos * 5;

    // Entering inner circle (if allowed) is good
    if (currentPos < INNER_CIRCLE_START && newPos >= INNER_CIRCLE_START && killed) {
      score += 100;
    }

    // Leaving home is important
    if (currentPos === -1) {
      score += 50;
    }

    // Check if we can capture an opponent
    if (newPos >= 0 && newPos < paths[color].length) {
      const [newRow, newCol] = paths[color][newPos];
      if (!isSafeSquare(newRow, newCol)) {
        // Check for opponent coins we can capture
        for (const oppColor of allColors) {
          if (oppColor === color) continue;
          for (const oppCoin of state[oppColor]) {
            if (oppCoin.pos >= 0 && oppCoin.pos < paths[oppColor].length) {
              const [oppRow, oppCol] = paths[oppColor][oppCoin.pos];
              if (oppRow === newRow && oppCol === newCol) {
                // Can capture! High priority
                score += 200;
              }
            }
          }
        }
      }
    }

    // Avoid landing where we can be captured (if not safe)
    if (newPos >= 0 && newPos < paths[color].length && newPos !== HEAVEN_POS) {
      const [newRow, newCol] = paths[color][newPos];
      if (!isSafeSquare(newRow, newCol)) {
        // Check if opponents could capture us
        for (const oppColor of allColors) {
          if (oppColor === color) continue;
          for (const oppCoin of state[oppColor]) {
            if (oppCoin.pos >= 0 && oppCoin.pos < INNER_CIRCLE_START) {
              // Check if opponent is within striking distance (1-8 moves)
              const oppPath = paths[oppColor];
              for (let dist = 1; dist <= 8; dist++) {
                const oppNewPos = oppCoin.pos + dist;
                if (oppNewPos < oppPath.length) {
                  const [oppNewRow, oppNewCol] = oppPath[oppNewPos];
                  if (oppNewRow === newRow && oppNewCol === newCol) {
                    score -= 30; // Penalty for being in danger
                  }
                }
              }
            }
          }
        }
      }
    }

    // Prefer moving coins that are further behind
    if (currentPos >= 0) {
      score += (HEAVEN_POS - currentPos) * 2;
    }

    // Small random factor for variety
    score += Math.random() * 10;

    return score;
  };

  // Find the best move for the computer
  const findBestMove = (color, rolls, state, killed) => {
    let bestMove = null;
    let bestScore = -Infinity;

    const playerCoins = state[color];
    const hasAnyOnBoard = playerCoins.some(c => c.pos >= 0 && c.pos < HEAVEN_POS);

    for (let rollIdx = 0; rollIdx < rolls.length; rollIdx++) {
      const rollValue = rolls[rollIdx];

      for (let coinIdx = 0; coinIdx < playerCoins.length; coinIdx++) {
        const coin = playerCoins[coinIdx];
        const currentPos = coin.pos;

        // Skip coins in heaven
        if (currentPos === HEAVEN_POS) continue;

        let newPos;

        // Check if coin can leave home
        if (currentPos === -1) {
          if (!hasAnyOnBoard && ![1, 4, 8].includes(rollValue)) continue;
          newPos = rollValue - 1;
        } else {
          newPos = currentPos + rollValue;

          // Inner circle coins wrap around if they overshoot heaven
          if (newPos > HEAVEN_POS && currentPos >= INNER_CIRCLE_START) {
            // Wrap around within inner circle (8 positions: 15-22)
            newPos = INNER_CIRCLE_START + ((currentPos - INNER_CIRCLE_START + rollValue) % 8);
          } else if (newPos > HEAVEN_POS) {
            continue; // Outer circle can't overshoot
          }
        }

        // Check inner circle entry restriction
        const wasInOuter = currentPos >= 0 && currentPos < INNER_CIRCLE_START;
        const enteringInner = newPos >= INNER_CIRCLE_START;
        if (wasInOuter && enteringInner && !killed) continue;

        // Check if leaving home would land in inner circle without kill
        if (currentPos === -1 && newPos >= INNER_CIRCLE_START && !killed) continue;

        // Valid move found - evaluate it
        const score = evaluateMove(color, coinIdx, currentPos, newPos, rollValue, state, killed);

        if (score > bestScore) {
          bestScore = score;
          bestMove = { rollIndex: rollIdx, coinIndex: coinIdx };
        }
      }
    }

    return bestMove;
  };

  // Computer takes its turn
  const computerTakeTurn = () => {
    const color = colors[currentPlayer];
    if (!computerPlayers[color] || winner) return;

    setIsComputerThinking(true);

    // If can roll, roll first
    if (canRoll && unusedRolls.length === 0) {
      setTimeout(() => {
        rollDice();
      }, 300);
      return;
    }

    // If has rolls to use, find best move
    if (unusedRolls.length > 0) {
      const bestMove = findBestMove(color, unusedRolls, gameState, hasKilled[color]);

      if (bestMove) {
        setTimeout(() => {
          setSelectedRollIndex(bestMove.rollIndex);
          setTimeout(() => {
            // Get the coin and check if it's stacked
            const coin = gameState[color][bestMove.coinIndex];
            const coinsAtSamePos = gameState[color]
              .map((c, idx) => ({ ...c, coinIndex: idx }))
              .filter(c => c.pos === coin.pos && c.pos !== HEAVEN_POS);
            const isStacked = coinsAtSamePos.length > 1 && coinsAtSamePos.some(c => c.stacked);

            if (isStacked) {
              const stackedIndices = coinsAtSamePos.filter(c => c.stacked).map(c => c.coinIndex);
              moveCoins(stackedIndices);
            } else {
              moveCoins([bestMove.coinIndex]);
            }
            setIsComputerThinking(false);
          }, 200);
        }, 200);
      } else {
        // No valid move, but might be able to roll again
        if (canRoll) {
          setTimeout(() => {
            rollDice();
          }, 300);
        } else {
          setIsComputerThinking(false);
        }
      }
    }
  };

  // Effect to trigger computer turn
  useEffect(() => {
    if (!playerCount || winner) return;

    const color = colors[currentPlayer];
    if (computerPlayers[color] && !isComputerThinking) {
      const timer = setTimeout(() => {
        computerTakeTurn();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, computerPlayers, canRoll, unusedRolls, winner, isComputerThinking, playerCount, colors]);

  // ============ END COMPUTER AI LOGIC ============

  // Effect to sync state to peer in online mode
  useEffect(() => {
    if (onlineMode && connectionRef.current && connectionRef.current.open) {
      // Only sync if it's our turn (we made the change)
      if (colors[currentPlayer] === myColor || isHost) {
        syncStateToPeer();
      }
    }
  }, [gameState, hasKilled, currentPlayer, unusedRolls, canRoll, winner, diceResult, onlineMode, myColor, isHost, colors, syncStateToPeer]);

  const getCoinsAtPosition = (row, col) => {
    const result = [];
    allColors.forEach(color => {
      gameState[color].forEach((c, idx) => {
        if (c.pos === -1 || c.pos === HEAVEN_POS) return;
        if (c.pos < 0 || c.pos >= paths[color].length) return; // Safety check
        const [r, co] = paths[color][c.pos];
        if (r === row && co === col) {
          result.push({ color, coinIndex: idx, stacked: c.stacked });
        }
      });
    });
    return result;
  };

  const getHomeCoins = (row, col) => {
    const homeColors = {
      '4-2': 'yellow',
      '2-4': 'green',
      '0-2': 'blue',
      '2-0': 'red'
    };
    const color = homeColors[`${row}-${col}`];
    if (!color) return [];

    const coinsAtHome = [];
    gameState[color].forEach((c, idx) => {
      if (c.pos === -1) {
        coinsAtHome.push({ color, coinIndex: idx });
      }
    });
    return coinsAtHome;
  };

  // Get all coins that have reached heaven
  const getHeavenCoins = () => {
    const result = [];
    allColors.forEach(color => {
      gameState[color].forEach((c, idx) => {
        if (c.pos === HEAVEN_POS) {
          result.push({ color, coinIndex: idx });
        }
      });
    });
    return result;
  };

  const isHome = (row, col) => {
    return (row === 4 && col === 2) || (row === 2 && col === 4) ||
           (row === 0 && col === 2) || (row === 2 && col === 0);
  };

  const isHeaven = (row, col) => row === 2 && col === 2;

  const isStartingSquare = (row, col) => {
    for (const color of allColors) {
      const [sr, sc] = startingSquares[color];
      if (row === sr && col === sc) return true;
    }
    return false;
  };

  const isInnerCircleSquare = (row, col) => {
    if (isHome(row, col) || isHeaven(row, col)) return false;
    return row >= 1 && row <= 3 && col >= 1 && col <= 3;
  };

  // Get inner circle entry arrow info for a cell (color and direction)
  // Arrows placed at position 14 (last outer position) to show inner circle entry direction
  const getInnerCircleEntryArrow = (row, col) => {
    // Yellow: position 14 is [4,1], enters inner at [3,1], arrow points UP
    if (row === 4 && col === 1) return { color: 'yellow', Arrow: ArrowUp };
    // Green: position 14 is [3,4], enters inner at [3,3], arrow points LEFT
    if (row === 3 && col === 4) return { color: 'green', Arrow: ArrowLeft };
    // Blue: position 14 is [0,3], enters inner at [1,3], arrow points DOWN
    if (row === 0 && col === 3) return { color: 'blue', Arrow: ArrowDown };
    // Red: position 14 is [1,0], enters inner at [1,1], arrow points RIGHT
    if (row === 1 && col === 0) return { color: 'red', Arrow: ArrowRight };
    return null;
  };

  // Player selection screen
  if (playerCount === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <h1 className="text-4xl font-bold text-white mb-8">Attha Board Game</h1>
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
            <Users size={28} /> Select Game Mode
          </h2>

          {/* 2 Player Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              2 Players <span className="text-sm font-normal text-gray-500">(Yellow vs Blue)</span>
            </h3>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => startGame(2, {})}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
              >
                <User size={18} /> vs <User size={18} />
                <span className="text-sm ml-1">Human vs Human</span>
              </button>
              <button
                onClick={() => startGame(2, { blue: true })}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition flex items-center gap-2"
              >
                <User size={18} /> vs <Bot size={18} />
                <span className="text-sm ml-1">You vs Computer</span>
              </button>
              <button
                onClick={() => startGame(2, { yellow: true, blue: true })}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition flex items-center gap-2"
              >
                <Bot size={18} /> vs <Bot size={18} />
                <span className="text-sm ml-1">Watch AI Play</span>
              </button>
            </div>
          </div>

          {/* 4 Player Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              4 Players <span className="text-sm font-normal text-gray-500">(All Colors)</span>
            </h3>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => startGame(4, {})}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
              >
                <User size={18} /><User size={18} /><User size={18} /><User size={18} />
                <span className="text-sm ml-1">All Human</span>
              </button>
              <button
                onClick={() => startGame(4, { green: true, blue: true, red: true })}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition flex items-center gap-2"
              >
                <User size={18} /> vs <Bot size={18} /><Bot size={18} /><Bot size={18} />
                <span className="text-sm ml-1">You vs 3 AI</span>
              </button>
              <button
                onClick={() => startGame(4, { yellow: true, green: true, blue: true, red: true })}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition flex items-center gap-2"
              >
                <Bot size={18} /><Bot size={18} /><Bot size={18} /><Bot size={18} />
                <span className="text-sm ml-1">Watch 4 AI Play</span>
              </button>
            </div>
          </div>

          {/* Online Play Section */}
          <div className="mb-6 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Wifi size={20} className="text-green-500" /> Play Online
              <span className="text-sm font-normal text-gray-500">(P2P - No server needed!)</span>
            </h3>

            {connectionStatus === 'disconnected' && (
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={createOnlineGame}
                  className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 transition flex items-center gap-2"
                >
                  <Wifi size={18} />
                  <span>Create Game</span>
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none font-mono text-lg w-32 uppercase"
                  />
                  <button
                    onClick={joinOnlineGame}
                    className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition flex items-center gap-2"
                  >
                    Join Game
                  </button>
                </div>
              </div>
            )}

            {connectionStatus === 'connecting' && (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500"></div>
                <span>Connecting...</span>
                <button
                  onClick={cancelOnlineSetup}
                  className="px-3 py-1 rounded text-sm text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {connectionStatus === 'waiting' && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <p className="text-gray-700 mb-2">Share this code with your friend:</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-3xl font-bold text-teal-600 tracking-widest bg-white px-4 py-2 rounded border-2 border-teal-300">
                    {roomCode}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="p-2 rounded-lg bg-teal-100 hover:bg-teal-200 transition"
                    title="Copy code"
                  >
                    {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-teal-600" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                  <div className="animate-pulse w-2 h-2 rounded-full bg-yellow-500"></div>
                  Waiting for opponent to join...
                </p>
                <button
                  onClick={cancelOnlineSetup}
                  className="mt-3 px-4 py-2 rounded text-sm text-red-600 hover:bg-red-50 border border-red-200"
                >
                  Cancel
                </button>
              </div>
            )}

            {connectionStatus === 'connected' && !playerCount && (
              <div className="flex items-center gap-2 text-green-600">
                <Wifi size={18} />
                <span className="font-semibold">Connected! Starting game...</span>
              </div>
            )}
          </div>

          {/* Resume Saved Game Section */}
          <div className="mb-6 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Save size={20} className="text-amber-500" /> Resume Saved Game
            </h3>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={loadFromLocalStorage}
                className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition flex items-center gap-2"
              >
                <Upload size={18} />
                <span>Load Last Save</span>
              </button>
              <label className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition flex items-center gap-2 cursor-pointer">
                <Upload size={18} />
                <span>Load From File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileLoad}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600 border-t pt-4">
            <h3 className="font-bold mb-2">Rules:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Roll 1, 4, or 8 to move first coin out</li>
              <li>Each roll must be used on ONE coin/stack</li>
              <li>Rolling 4 or 8 lets you roll again</li>
              <li>3 consecutive bonuses = lose all moves!</li>
              <li>Capture to enter inner circle (same stack size only)</li>
              <li>First to get all 4 coins to heaven wins!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Handle leaving online game
  const leaveOnlineGame = () => {
    if (connectionRef.current && connectionRef.current.open) {
      sendGameState(connectionRef.current, 'disconnect', {});
    }
    cancelOnlineSetup();
    setPlayerCount(null);
    setGameState({
      yellow: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
      green: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
      blue: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }],
      red: [{ pos: -1, id: 0, stacked: false, innerMoves: 0 }, { pos: -1, id: 1, stacked: false, innerMoves: 0 }, { pos: -1, id: 2, stacked: false, innerMoves: 0 }, { pos: -1, id: 3, stacked: false, innerMoves: 0 }]
    });
    setHasKilled({ yellow: false, green: false, blue: false, red: false });
    setWinner(null);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-1 sm:p-4">
      {/* Header - Very compact on mobile */}
      <div className="flex items-center justify-between w-full max-w-sm lg:max-w-none lg:justify-center gap-2 mb-2 sm:mb-4">
        <h1 className="text-lg sm:text-4xl font-bold text-white flex items-center gap-1 sm:gap-3">
          Attha
          {onlineMode && (
            <span className="flex items-center gap-1 text-[10px] sm:text-lg bg-teal-500 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
              <Wifi size={10} className="sm:w-4 sm:h-4" />
              {myColor && <span className="capitalize">{myColor}</span>}
            </span>
          )}
          {!onlineMode && <span className="text-sm sm:text-4xl">-{playerCount}P</span>}
        </h1>
        <div className="flex gap-1">
          {!onlineMode && (
            <>
              <button
                onClick={undoMove}
                disabled={undoHistory.length === 0}
                className={`p-1.5 sm:px-3 sm:py-2 rounded-lg font-bold text-white transition text-xs ${
                  undoHistory.length > 0 ? 'bg-amber-600' : 'bg-gray-400'
                }`}
                title="Undo"
              >
                <Undo2 size={14} />
              </button>
              <button onClick={saveGame} className="p-1.5 sm:px-3 sm:py-2 rounded-lg font-bold text-white bg-green-600 text-xs" title="Save">
                <Save size={14} />
              </button>
              <label className="p-1.5 sm:px-3 sm:py-2 rounded-lg font-bold text-white bg-blue-600 text-xs cursor-pointer" title="Load">
                <Upload size={14} />
                <input type="file" accept=".json" onChange={handleFileLoad} className="hidden" />
              </label>
            </>
          )}
          <button
            onClick={onlineMode ? leaveOnlineGame : () => setPlayerCount(null)}
            className="p-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-white bg-gray-600 text-xs"
          >
            <span className="sm:hidden">X</span>
            <span className="hidden sm:inline">{onlineMode ? 'Leave' : 'New'}</span>
          </button>
        </div>
      </div>

      {winner && (
        <div className="bg-yellow-400 text-yellow-900 px-4 py-2 sm:px-8 sm:py-4 rounded-lg mb-2 sm:mb-4 text-lg sm:text-2xl font-bold animate-pulse">
          {winner.toUpperCase()} WINS!
        </div>
      )}

      {/* Main Game Area - Mobile: controls on top, board below */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 items-center lg:items-start w-full max-w-[100vw] overflow-hidden">
        {/* Mobile: Controls FIRST (above board) */}
        <div className="lg:hidden w-full max-w-sm order-first">
          {/* Compact Dice Control Box for Mobile */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl shadow-lg p-2 border border-gray-200">
            {/* Turn + Dice + Roll in one row */}
            <div className="flex items-center gap-2">
              {/* Turn indicator */}
              <div className="text-sm font-bold flex items-center gap-1 flex-shrink-0" style={{ color: colors[currentPlayer] }}>
                <span className="capitalize">{colors[currentPlayer]}</span>
                <Skull size={12} className={hasKilled[colors[currentPlayer]] ? 'text-red-500' : 'text-gray-300'} />
              </div>

              {/* Dice result */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold shadow flex-shrink-0 ${
                diceResult
                  ? (diceResult === 4 || diceResult === 8
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white')
                  : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-400'
              }`}>
                {diceResult || '?'}
              </div>

              {/* Roll button */}
              <button
                onClick={rollDice}
                disabled={!canRoll || winner || computerPlayers[colors[currentPlayer]] || (onlineMode && colors[currentPlayer] !== myColor)}
                className={`flex-1 px-2 py-2 rounded-lg font-bold text-white text-sm ${
                  !canRoll || winner || computerPlayers[colors[currentPlayer]] || (onlineMode && colors[currentPlayer] !== myColor)
                    ? 'bg-gray-400'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 active:scale-95'
                }`}
              >
                {canRoll ? 'ROLL' : 'USE'}
              </button>

              {/* Stack mode */}
              <button
                onClick={() => { setStackMode(!stackMode); if (stackMode) setSelectedCoins([]); }}
                className={`p-2 rounded-lg flex-shrink-0 ${stackMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                <Layers size={16} />
              </button>
            </div>

            {/* Rolls row */}
            <div className="flex gap-1 items-center mt-2 p-1 bg-gray-100 rounded min-h-[28px]">
              {unusedRolls.length === 0 ? (
                <span className="text-gray-400 text-xs">Tap ROLL</span>
              ) : (
                unusedRolls.map((roll, i) => (
                  <button
                    key={i}
                    onClick={() => handleRollClick(i)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      selectedRollIndex === i
                        ? 'bg-blue-500 text-white scale-110'
                        : roll === 4 || roll === 8
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {roll}
                  </button>
                ))
              )}
              {selectedCoins.length > 0 && (
                <div className="ml-auto flex gap-1">
                  {selectedCoins.length >= 2 && (
                    <button onClick={formStack} className="px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold">Stack</button>
                  )}
                  <button onClick={() => { setSelectedCoins([]); setSelectedRollIndex(null); }} className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">X</button>
                </div>
              )}
            </div>

            {/* Message - very compact */}
            {message && <div className="text-[10px] text-gray-600 text-center mt-1 truncate">{message}</div>}
          </div>

          {/* Score bar */}
          <div className="flex justify-around items-center mt-1 bg-white/80 rounded p-1">
            {colors.map(color => {
              const inHeaven = gameState[color].filter(c => c.pos === HEAVEN_POS).length;
              return (
                <div key={color} className={`flex items-center gap-1 ${colors[currentPlayer] === color ? 'font-bold' : ''}`}>
                  <div className={`w-3 h-3 rounded-full ${color === 'yellow' ? 'bg-yellow-500' : color === 'green' ? 'bg-green-500' : color === 'blue' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  <span className="text-[10px]">{inHeaven}/4</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Board with 3D decorative frame */}
        <div className="relative flex-shrink-0">
          {/* Outer decorative border - smaller on mobile */}
          <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-br from-amber-600 via-amber-800 to-amber-950 rounded-xl sm:rounded-2xl shadow-[0_4px_8px_rgba(0,0,0,0.3)]"></div>
          <div className="absolute -inset-1.5 sm:-inset-3 bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900 rounded-lg sm:rounded-xl"></div>
          <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 rounded-lg"></div>

          {/* Board container */}
          <div className="relative grid grid-cols-5 gap-0.5 bg-gradient-to-br from-amber-800 via-stone-700 to-amber-900 p-1 sm:p-2 md:p-3 rounded-lg shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
            {Array(5).fill(0).map((_, row) =>
              Array(5).fill(0).map((_, col) => {
                const coinsHere = getCoinsAtPosition(row, col);
                const homeCoins = getHomeCoins(row, col);
                const home = isHome(row, col);
                const heaven = isHeaven(row, col);
                const startSquare = isStartingSquare(row, col);
                const innerCircle = isInnerCircleSquare(row, col);
                const isSafe = isSafeSquare(row, col);
                const entryArrow = getInnerCircleEntryArrow(row, col);

                // Arrow color classes
                const arrowColorClasses = {
                  yellow: 'text-yellow-400 drop-shadow-lg',
                  green: 'text-green-400 drop-shadow-lg',
                  blue: 'text-blue-400 drop-shadow-lg',
                  red: 'text-red-400 drop-shadow-lg'
                };

                // Get home color for this cell
                const getHomeColor = (r, c) => {
                  if (r === 4 && c === 2) return 'yellow';
                  if (r === 2 && c === 4) return 'green';
                  if (r === 0 && c === 2) return 'blue';
                  if (r === 2 && c === 0) return 'red';
                  return null;
                };
                const homeColor = getHomeColor(row, col);

                // Rich 3D gradient classes for each home - no transparency
                const homeColorClasses = {
                  yellow: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]',
                  green: 'bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]',
                  blue: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]',
                  red: 'bg-gradient-to-br from-red-400 via-red-500 to-rose-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]'
                };

                // Starting square colors matching their team
                const getStartingSquareColor = (r, c) => {
                  if (r === 4 && c === 3) return 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400';
                  if (r === 2 && c === 4) return null; // This is green home
                  if (r === 3 && c === 4) return 'bg-gradient-to-br from-green-100 to-green-200 border-green-400';
                  if (r === 0 && c === 2) return null; // This is blue home
                  if (r === 0 && c === 1) return 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-400';
                  if (r === 2 && c === 0) return null; // This is red home
                  if (r === 1 && c === 0) return 'bg-gradient-to-br from-red-100 to-red-200 border-red-400';
                  return null;
                };
                const startingColor = getStartingSquareColor(row, col);

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`w-[52px] h-[52px] sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md sm:rounded-lg flex items-center justify-center relative transition-all duration-200 ${
                      heaven
                        ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2)] border-2 border-yellow-200'
                        : home && homeColor
                          ? `${homeColorClasses[homeColor]} border-2 border-white`
                          : startSquare && startingColor
                            ? `${startingColor} border-2 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)]`
                            : startSquare
                              ? 'bg-gradient-to-br from-emerald-200 to-green-300 border-2 border-green-400 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)]'
                              : innerCircle
                                ? 'bg-gradient-to-br from-orange-200 via-amber-200 to-orange-300 border border-amber-400 shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                                : 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 border border-amber-300 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.3)]'
                    }`}
                  >
                    {/* Decorative corner accents for regular squares */}
                    {!heaven && !home && (
                      <>
                        <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l border-amber-500 rounded-tl"></div>
                        <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-amber-600 rounded-br"></div>
                      </>
                    )}

                    {/* Heaven with 3D glowing effect and coins that reached it */}
                    {heaven && (
                      <>
                        <Trophy className="text-amber-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] absolute animate-pulse" size={28} style={{ top: '4px' }} />
                        {/* Show coins that have reached heaven */}
                        {(() => {
                          const heavenCoins = getHeavenCoins();
                          if (heavenCoins.length === 0) return null;
                          return (
                            <div className="absolute bottom-1 flex flex-wrap gap-0.5 justify-center items-center max-w-[70px]">
                              {heavenCoins.map((coin, i) => (
                                <div
                                  key={`heaven-${coin.color}-${coin.coinIndex}`}
                                  className={`${colorClasses[coin.color]} rounded-full w-4 h-4 flex items-center justify-center text-white font-bold text-[8px] border border-white shadow-lg`}
                                >
                                  {coin.coinIndex + 1}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Starting square star */}
                    {startSquare && !home && <Star className="text-green-600 absolute drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" size={24} />}

                  {/* Inner circle entry arrow - positioned at boundary between blocks */}
                  {entryArrow && (
                    <entryArrow.Arrow
                      className={`absolute ${arrowColorClasses[entryArrow.color]} opacity-90 z-30 ${
                        entryArrow.Arrow === ArrowUp ? '-top-6' :
                        entryArrow.Arrow === ArrowDown ? '-bottom-6' :
                        entryArrow.Arrow === ArrowLeft ? '-left-6' :
                        '-right-6'
                      }`}
                      size={40}
                      strokeWidth={3}
                    />
                  )}

                  {/* Show ALL coins (home + board) in unified grid */}
                  {(homeCoins.length > 0 || coinsHere.length > 0) && (() => {
                    // Group board coins by color and stack status
                    const stackedByColor = {};
                    const unstackedBoardCoins = [];

                    coinsHere.forEach(coin => {
                      if (coin.stacked) {
                        if (!stackedByColor[coin.color]) {
                          stackedByColor[coin.color] = [];
                        }
                        stackedByColor[coin.color].push(coin);
                      } else {
                        unstackedBoardCoins.push(coin);
                      }
                    });

                    // Combine all items: home coins + stacks + unstacked board coins
                    const allItems = [
                      ...homeCoins.map(coin => ({ type: 'home', coin })),
                      ...Object.entries(stackedByColor).map(([color, coins]) => ({ type: 'stack', color, coins })),
                      ...unstackedBoardCoins.map(coin => ({ type: 'board', coin }))
                    ];

                    // Use grid layout when there are multiple items
                    const useGrid = allItems.length > 1;

                    return (
                      <div className={`absolute inset-0 ${useGrid ? 'grid grid-cols-2 grid-rows-2 gap-0.5 p-1' : 'flex items-center justify-center'} z-10 transition-all duration-300 ease-out`}>
                        {allItems.map((item, i) => {
                          if (item.type === 'stack') {
                            // Render stacked coins as single visual with count
                            const stackCoins = item.coins;
                            const stackColor = item.color;
                            const isAnySelected = stackCoins.some(c => c.color === colors[currentPlayer] && isCoinSelected(c.coinIndex));
                            const stackSize = stackCoins.length;
                            const firstCoin = stackCoins[0];

                            return (
                              <button
                                key={`stack-${stackColor}-${i}`}
                                onClick={(e) => handleCoinClick(firstCoin.color, firstCoin.coinIndex, e)}
                                title={`Stack of ${stackSize} - ${isSafe ? 'at safe zone' : 'moves together'}`}
                                className={`relative ${colorClasses[stackColor]} rounded-full flex items-center justify-center text-white font-bold border-2 transition-all duration-300 ease-out ${
                                  useGrid ? 'w-8 h-8' : (stackSize === 2 ? 'w-9 h-9' : stackSize === 3 ? 'w-10 h-10' : 'w-11 h-11')
                                } ${
                                  isAnySelected ? 'border-white ring-2 ring-white scale-105 shadow-[0_6px_12px_rgba(0,0,0,0.5)]' : 'border-amber-100 ring-2 ring-amber-200'
                                } ${
                                  unusedRolls.length > 0 && stackColor === colors[currentPlayer] && !winner
                                    ? 'hover:scale-110 hover:shadow-[0_6px_12px_rgba(0,0,0,0.5)] cursor-pointer hover:ring-white'
                                    : ''
                                }`}
                              >
                                <span className={`${useGrid ? 'text-xs' : 'text-sm'} font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] relative z-10`}>x{stackSize}</span>
                              </button>
                            );
                          } else {
                            // Render home or board coin
                            const coin = item.coin;
                            const isSelected = coin.color === colors[currentPlayer] && isCoinSelected(coin.coinIndex);
                            const isHome = item.type === 'home';

                            return (
                              <button
                                key={`${item.type}-${coin.color}-${coin.coinIndex}`}
                                onClick={(e) => handleCoinClick(coin.color, coin.coinIndex, e)}
                                title="Shift+click to select for stacking"
                                className={`${colorClasses[coin.color]} rounded-full ${useGrid ? 'w-8 h-8' : 'w-9 h-9'} flex items-center justify-center text-white font-bold text-xs border-2 transition-all duration-300 ease-out ${
                                  isSelected ? 'border-white ring-2 ring-white scale-105 shadow-[0_5px_10px_rgba(0,0,0,0.5)]' : 'border-white'
                                } ${
                                  unusedRolls.length > 0 && coin.color === colors[currentPlayer] && !winner
                                    ? 'hover:scale-110 hover:shadow-[0_5px_10px_rgba(0,0,0,0.5)] cursor-pointer'
                                    : ''
                                }`}
                              >
                                <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{coin.coinIndex + 1}</span>
                              </button>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Desktop Only (hidden on mobile, shown above board instead) */}
        <div className="hidden lg:flex flex-col gap-2 w-auto">
          {/* Desktop Dice Control Box */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl shadow-lg p-3 w-64 border border-gray-200">
            {/* Turn indicator - compact */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold flex items-center gap-1" style={{ color: colors[currentPlayer] }}>
                {computerPlayers[colors[currentPlayer]] ? <Bot size={18} /> : onlineMode ? <Wifi size={18} /> : <User size={18} />}
                <span className="capitalize">{colors[currentPlayer]}</span>
              </div>
              <div className="flex items-center gap-1">
                <Skull size={14} className={hasKilled[colors[currentPlayer]] ? 'text-red-500' : 'text-gray-300'} />
                {onlineMode && (
                  <span className={`text-xs font-semibold ${colors[currentPlayer] === myColor ? 'text-green-600' : 'text-orange-500'}`}>
                    {colors[currentPlayer] === myColor ? 'You' : 'Wait'}
                  </span>
                )}
              </div>
            </div>

            {/* Dice display + Roll button row */}
            <div className="flex items-center gap-2 mb-2">
              {/* Dice result */}
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0 ${
                diceResult
                  ? (diceResult === 4 || diceResult === 8
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white')
                  : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-400'
              }`}>
                {diceResult || '?'}
              </div>

              {/* Roll button */}
              <button
                onClick={rollDice}
                disabled={!canRoll || winner || computerPlayers[colors[currentPlayer]] || (onlineMode && colors[currentPlayer] !== myColor)}
                className={`flex-1 px-3 py-2 rounded-lg font-bold text-white text-sm transition-all ${
                  !canRoll || winner || computerPlayers[colors[currentPlayer]] || (onlineMode && colors[currentPlayer] !== myColor)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-95'
                }`}
              >
                {canRoll ? 'ROLL' : 'USE ROLLS'}
              </button>

              {/* Stack mode toggle */}
              <button
                onClick={() => {
                  setStackMode(!stackMode);
                  if (stackMode) setSelectedCoins([]);
                }}
                className={`p-2 rounded-lg font-bold transition-all flex-shrink-0 ${
                  stackMode
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={stackMode ? 'Stack Mode ON' : 'Stack Mode OFF'}
              >
                <Layers size={18} />
              </button>
            </div>

            {/* Available rolls */}
            <div className="flex gap-1 flex-wrap items-center min-h-[32px] mb-2 p-1.5 bg-gray-100 rounded">
              {unusedRolls.length === 0 ? (
                <span className="text-gray-400 text-xs">No rolls</span>
              ) : (
                unusedRolls.map((roll, i) => (
                  <button
                    key={i}
                    draggable
                    onClick={() => handleRollClick(i)}
                    onDragStart={(e) => handleRollDragStart(e, i)}
                    onDragOver={handleRollDragOver}
                    onDrop={(e) => handleRollDrop(e, i)}
                    onDragEnd={handleRollDragEnd}
                    className={`px-2.5 py-1.5 rounded text-sm font-bold cursor-grab transition-all ${
                      selectedRollIndex === i
                        ? 'bg-blue-500 text-white ring-2 ring-blue-700 scale-110'
                        : draggedRollIndex === i
                          ? 'bg-purple-400 text-white opacity-50'
                          : draggedRollIndex !== null && draggedRollIndex !== i
                            ? 'bg-purple-200 text-purple-800 ring-2 ring-purple-400'
                            : roll === 4 || roll === 8
                              ? 'bg-green-200 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {roll}
                  </button>
                ))
              )}
            </div>

            {/* Selected coins / Stack controls */}
            {selectedCoins.length > 0 && (
              <div className="flex items-center justify-between gap-2 mb-2 p-1.5 bg-blue-50 rounded border border-blue-200">
                <span className="text-xs font-semibold text-blue-700">{selectedCoins.length} selected</span>
                <div className="flex gap-1">
                  {selectedCoins.length >= 2 && (
                    <button onClick={formStack} className="px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold">
                      Stack
                    </button>
                  )}
                  <button onClick={() => { setSelectedCoins([]); setSelectedRollIndex(null); }} className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="text-xs font-medium text-gray-600 text-center min-h-[16px]">{message}</div>

            {/* Warning for consecutive bonuses */}
            {consecutiveBonusCount >= 2 && (
              <div className="text-xs text-red-500 text-center font-semibold mt-1">
                Warning: {consecutiveBonusCount}/3 bonuses!
              </div>
            )}
          </div>

          {/* Score - Compact */}
          <div className="bg-white/90 rounded-lg shadow p-2 w-full lg:w-64 border border-gray-200">
            <div className="flex justify-between items-center">
              {colors.map(color => {
                const inHeaven = gameState[color].filter(c => c.pos === HEAVEN_POS).length;
                const isCurrentTurn = colors[currentPlayer] === color;
                return (
                  <div key={color} className={`flex flex-col items-center px-2 ${isCurrentTurn ? 'font-bold' : ''}`}>
                    <div className={`w-4 h-4 rounded-full ${color === 'yellow' ? 'bg-yellow-500' : color === 'green' ? 'bg-green-500' : color === 'blue' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs mt-0.5">{inHeaven}/4</span>
                    {hasKilled[color] && <Skull size={10} className="text-red-500" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules Section - Only on larger screens */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 rounded-lg shadow p-3 w-full lg:w-64 border border-slate-700 hidden lg:block">
            <h3 className="text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1">
              <Star size={12} className="text-amber-400" /> How to Play
            </h3>
            <div className="text-[10px] text-gray-300 space-y-1">
              <div>1. Click roll to select, click coin to move</div>
              <div>2. Drag rolls together to merge</div>
              <div>3. Use Stack button on mobile</div>
              <div>4. Capture to unlock inner circle</div>
              <div className="pt-1 border-t border-slate-600 text-amber-200/80">
                Tip: Inner circle only moves if no other moves!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
