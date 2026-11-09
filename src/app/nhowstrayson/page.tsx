'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Users,
  Send,
  AlertCircle,
  Clock,
  LogIn,
  Moon,
  Plug,
  Unplug,
  Trophy,
} from 'lucide-react';
import { UserDisplayName } from '@/components/UserDisplayName';
import {
  ClientPlayer,
  ClientChat,
  PlaygroundCanvas,
} from '@/components/playground/PlaygroundCanvas';
import type { RoomStats } from '@/lib/playground';
import {
  Gamemode,
  normalizeGamemode,
  FLOOR_SURFACE_Y,
  PLAYER_RADIUS,
  getPlaygroundPhysics,
  createPlaygroundSegment,
  PlaygroundFoodItem,
  PlaygroundLeaderboardEntry,
} from '@/lib/playgroundPhysics';
import { isStaffRole } from '@/lib/roles';

const GAMEMODES: Array<{ id: Gamemode; label: string }> = [
  { id: 'cube', label: 'Cube' },
  { id: 'jetpack', label: 'Jetpack' },
  { id: 'ball', label: 'Ball' },
  { id: 'ufo', label: 'UFO' },
  { id: 'wave', label: 'Wave' },
  { id: 'swing', label: 'Swing' },
];

export default function NhowstraysonPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<Gamemode>('cube');
  const [selectedRoom, setSelectedRoom] = useState<string>('public-1');
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [chats, setChats] = useState<ClientChat[]>([]);
  const [recentChatLog, setRecentChatLog] = useState<ClientChat[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [allRoomsStats, setAllRoomsStats] = useState<Record<string, RoomStats>>({});
  const [foods, setFoods] = useState<PlaygroundFoodItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlaygroundLeaderboardEntry[]>([]);
  const [lastEatenFood, setLastEatenFood] = useState<{
    id: string;
    userId: string;
    value: number;
    x: number;
    y: number;
    timestamp: number;
  } | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [isManualDisconnected, setIsManualDisconnected] = useState<boolean>(false);
  const [disconnectCooldown, setDisconnectCooldown] = useState<number>(0);
  const [isAfk, setIsAfk] = useState<boolean>(false);

  const [chatText, setChatText] = useState<string>('');
  const [chatCooldown, setChatCooldown] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmittingChat, setIsSubmittingChat] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isManualAfkRef = useRef<boolean>(false);

  const effectiveUserId: string | null =
    currentUser?.id || currentUser?.userId || selfUserId || null;

  const effectiveUserIdRef = useRef<string | null>(effectiveUserId);
  effectiveUserIdRef.current = effectiveUserId;

  const clockOffsetRef = useRef<number>(clockOffset);
  clockOffsetRef.current = clockOffset;

  const currentModeRef = useRef<Gamemode>(currentMode);
  currentModeRef.current = currentMode;

  const autoJoinAttemptRef = useRef<string>('');

  const calibrateClock = useCallback((measuredOffset: number, force = false) => {
    if (!Number.isFinite(measuredOffset)) return;
    setClockOffset((prev) => {
      const next = force ? measuredOffset : Math.round(prev * 0.6 + measuredOffset * 0.4);
      clockOffsetRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const saved = localStorage.getItem('gdvnc_user');
        if (saved) setCurrentUser(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('gdvnc_user_update', handleUserUpdate);

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setCurrentUser(data.user);
          try {
            const prev = JSON.parse(localStorage.getItem('gdvnc_user') || '{}');
            localStorage.setItem('gdvnc_user', JSON.stringify({ ...prev, ...data.user }));
          } catch {
            /* ignore */
          }
        } else {
          const saved = localStorage.getItem('gdvnc_user');
          if (saved) {
            try {
              setCurrentUser(JSON.parse(saved));
            } catch {
              /* ignore */
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('gdvnc_user_update', handleUserUpdate);
    };
  }, []);

  const isSupporter = Boolean(
    currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'MODERATOR' ||
      (currentUser?.supporterUntil && new Date(currentUser.supporterUntil) > new Date())
  );
  const isStaff = isStaffRole(currentUser?.role);
  const myClan = currentUser?.clanMember?.clan || null;

  // Connect to SSE stream for the selected room
  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (isManualDisconnected) {
      setConnected(false);
      return;
    }

    setErrorMessage('');
    autoJoinAttemptRef.current = '';

    const es = new EventSource(`/api/playground/stream?room=${encodeURIComponent(selectedRoom)}`);
    eventSourceRef.current = es;

    if (es.readyState === EventSource.OPEN) {
      setConnected(true);
    }

    es.addEventListener('open', () => {
      setConnected(true);
    });

    es.addEventListener('init', (e: MessageEvent) => {
      try {
        setConnected(true);
        const data = JSON.parse(e.data);

        if (typeof data.serverTime === 'number') {
          const rawOffset = data.serverTime - Date.now();
          calibrateClock(rawOffset > -250 && rawOffset < 0 ? 0 : rawOffset, true);
        }

        const myId: string | null = data.selfUserId || effectiveUserIdRef.current;
        if (data.selfUserId) {
          setSelfUserId(data.selfUserId);
          effectiveUserIdRef.current = data.selfUserId;
        }

        if (data.joinError) {
          setErrorMessage(data.joinError);
        }

        if (data.stats) {
          setRoomStats(data.stats);
        }

        if (data.allRoomsStats) {
          setAllRoomsStats(data.allRoomsStats);
        }

        if (data.foods && Array.isArray(data.foods)) {
          setFoods(data.foods);
        }

        if (data.leaderboard && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }

        if (data.players && Array.isArray(data.players)) {
          const nowClient = Date.now();
          setPlayers(
            data.players.map((p: ClientPlayer) => {
              const normalized: ClientPlayer = {
                ...p,
                currentMode: normalizeGamemode(p.currentMode),
              };
              return myId && p.userId === myId
                ? { ...normalized, spawnedAt: nowClient }
                : normalized;
            })
          );

          if (myId) {
            const me = data.players.find((p: ClientPlayer) => p.userId === myId);
            if (me) {
              const normMode = normalizeGamemode(me.currentMode);
              setCurrentMode(normMode);
              currentModeRef.current = normMode;
              if (me.isAfk !== undefined) {
                setIsAfk(Boolean(me.isAfk));
              }
            }
          }
        }

        if (data.chats && Array.isArray(data.chats)) {
          setChats(data.chats);
          setRecentChatLog(data.chats.slice(-10));
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('ping', (e: MessageEvent) => {
      setConnected(true);
      try {
        const data = JSON.parse(e.data);
        if (typeof data.at === 'number') {
          calibrateClock(data.at - Date.now(), false);
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('spawn', (e: MessageEvent) => {
      setConnected(true);
      try {
        const data = JSON.parse(e.data);
        if (!data.player) return;
        const incoming: ClientPlayer = {
          ...data.player,
          currentMode: normalizeGamemode(data.player.currentMode),
          spawnedAt: Date.now(),
        };
        setPlayers((prev) => {
          const filtered = prev.filter((p) => p.userId !== incoming.userId);
          return [...filtered, incoming];
        });
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('despawn', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.userId) return;
        setPlayers((prev) => prev.filter((p) => p.userId !== data.userId));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('afk', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.userId) return;
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.userId === data.userId) {
              return {
                ...p,
                isAfk: data.isAfk,
                isActiveInRoom:
                  data.isActiveInRoom !== undefined ? data.isActiveInRoom : !data.isAfk,
              };
            }
            return p;
          })
        );
        if (data.userId === effectiveUserIdRef.current) {
          setIsAfk(Boolean(data.isAfk));
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('segment', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.userId || !data.segment) return;
        const nextMode = normalizeGamemode(data.mode || data.segment.mode);
        if (data.userId === effectiveUserIdRef.current) {
          setCurrentMode(nextMode);
          currentModeRef.current = nextMode;
        }
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.userId === data.userId) {
              return {
                ...p,
                currentMode: nextMode,
                segment: {
                  ...data.segment,
                  roomId: data.segment.roomId || selectedRoom,
                  mode: nextMode,
                },
              };
            }
            return p;
          })
        );
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('mode', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.userId || !data.mode) return;
        const nextMode = normalizeGamemode(data.mode);
        if (data.userId === effectiveUserIdRef.current) {
          setCurrentMode(nextMode);
          currentModeRef.current = nextMode;
        }
        setPlayers((prev) =>
          prev.map((p) => (p.userId === data.userId ? { ...p, currentMode: nextMode } : p))
        );
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('chat', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.id) return;
        setChats((prev) => [...prev, data]);
        setRecentChatLog((prev) => [...prev, data].slice(-10));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('chat-delete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.messageId) return;
        setChats((prev) => prev.filter((c) => c.id !== data.messageId));
        setRecentChatLog((prev) => prev.filter((c) => c.id !== data.messageId));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('room-stats', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.roomId === selectedRoom) {
          setRoomStats(data);
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('all-rooms-stats', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data && typeof data === 'object') {
          setAllRoomsStats(data);
          if (data[selectedRoom]) {
            setRoomStats(data[selectedRoom]);
          }
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('food-update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.foods && Array.isArray(data.foods)) {
          setFoods(data.foods);
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('food-eat', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.foodId) {
          setLastEatenFood({
            id: data.foodId,
            userId: data.userId,
            value: data.value,
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
          });
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('leaderboard', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.leaderboard && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('score-reset', () => {
      setLeaderboard([]);
    });

    es.addEventListener('error', () => {
      if (es.readyState === EventSource.CLOSED) {
        setConnected(false);
      }
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [selectedRoom, isManualDisconnected, calibrateClock]);

  // Safety auto-join fallback if auth resolves after SSE init
  useEffect(() => {
    if (!connected || isManualDisconnected || !effectiveUserId) return;
    const me = players.find((p) => p.userId === effectiveUserId);
    if (me && (me.isActiveInRoom || me.isAfk)) return;

    const attemptKey = `${selectedRoom}:${effectiveUserId}`;
    if (autoJoinAttemptRef.current === attemptKey) return;
    autoJoinAttemptRef.current = attemptKey;

    const t0 = Date.now();
    fetch('/api/playground/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', roomId: selectedRoom }),
    })
      .then((res) => res.json())
      .then((data) => {
        const t1 = Date.now();
        if (typeof data.serverTime === 'number' && t1 - t0 < 400) {
          calibrateClock(data.serverTime - Math.round((t0 + t1) / 2));
        }
        if (data.error) {
          setErrorMessage(data.error);
        }
      })
      .catch(() => {});
  }, [connected, isManualDisconnected, effectiveUserId, selectedRoom, players, calibrateClock]);

  // Auto scroll chat log internally without scrolling page
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [recentChatLog]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
    };
  }, []);

  const handleSetAfk = useCallback(
    (afkState: boolean, isManual = false) => {
      const uid = effectiveUserIdRef.current;
      if (!uid || isManualDisconnected) return;
      if (isManual) {
        isManualAfkRef.current = afkState;
      } else if (!afkState) {
        isManualAfkRef.current = false;
      }
      setIsAfk(afkState);

      setPlayers((prev) =>
        prev.map((p) =>
          p.userId === uid ? { ...p, isAfk: afkState, isActiveInRoom: !afkState } : p
        )
      );

      const t0 = Date.now();
      fetch('/api/playground/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setAfk', isAfk: afkState, roomId: selectedRoom }),
      })
        .then((res) => res.json())
        .then((data) => {
          const t1 = Date.now();
          if (typeof data.serverTime === 'number' && t1 - t0 < 400) {
            calibrateClock(data.serverTime - Math.round((t0 + t1) / 2));
          }
          if (data.error) {
            setErrorMessage(data.error);
          }
        })
        .catch(() => {});
    },
    [selectedRoom, isManualDisconnected, calibrateClock]
  );

  // Auto-Idle after 1 minute of inactivity
  useEffect(() => {
    if (!effectiveUserId || isManualDisconnected) return;

    const resetActivity = () => {
      lastActivityTimeRef.current = Date.now();
      if (isAfk && !isManualAfkRef.current) {
        handleSetAfk(false, false);
      }
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('touchstart', resetActivity);

    const afkCheckInterval = setInterval(() => {
      if (!isAfk && Date.now() - lastActivityTimeRef.current >= 60000) {
        handleSetAfk(true, false);
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      clearInterval(afkCheckInterval);
    };
  }, [effectiveUserId, isManualDisconnected, isAfk, handleSetAfk]);

  // Power plug Online / Offline toggle with vanish animation & 3s cooldown
  const handleToggleOnline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disconnectCooldown > 0) return;

    const uid = effectiveUserIdRef.current;

    if (connected && !isManualDisconnected) {
      if (uid) {
        const vanishAt = Date.now();
        setPlayers((prev) =>
          prev.map((p) => (p.userId === uid ? { ...p, despawnedAt: vanishAt } : p))
        );
      }

      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setConnected(false);
        setIsManualDisconnected(true);
        if (uid) {
          setPlayers((prev) => prev.filter((p) => p.userId !== uid));
          fetch('/api/playground/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'leave' }),
          }).catch(() => {});
        }
      }, 260);

      setDisconnectCooldown(3);
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = setInterval(() => {
        setDisconnectCooldown((prev) => {
          if (prev <= 1) {
            if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsManualDisconnected(false);
    }
  };

  // Click-to-move handler
  const handleMove = useCallback(
    (toX: number, toY: number) => {
      const uid = effectiveUserIdRef.current;
      if (!uid || isManualDisconnected) return;

      lastActivityTimeRef.current = Date.now();
      setErrorMessage('');

      if (isAfk) {
        isManualAfkRef.current = false;
        setIsAfk(false);
      }

      const moveTime = Math.round(Date.now() + clockOffsetRef.current);
      const seed = Math.round(Math.random() * 10000) / 10;
      const segId = `seg-${uid.slice(0, 6)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const activeMode = normalizeGamemode(currentModeRef.current);

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.userId !== uid) return p;
          const phys = getPlaygroundPhysics(
            p.segment.roomId ? p.segment : { ...p.segment, roomId: selectedRoom },
            moveTime
          );
          const nextSegment = createPlaygroundSegment(
            phys.x,
            phys.y,
            toX,
            toY,
            activeMode,
            moveTime,
            seed,
            {
              vy: phys.vy,
              isOnGround: phys.isOnGround,
              rotation: phys.rotation,
              flipY: phys.flipY,
              direction: phys.scaleX >= 0 ? 1 : -1,
              id: segId,
              roomId: selectedRoom,
            }
          );
          return {
            ...p,
            currentMode: activeMode,
            isAfk: false,
            isActiveInRoom: true,
            segment: nextSegment,
          };
        })
      );

      const t0 = Date.now();
      fetch('/api/playground/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          roomId: selectedRoom,
          toX,
          toY,
          clientTime: moveTime,
          seed,
          segId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const t1 = Date.now();
          if (typeof data.serverTime === 'number' && t1 - t0 < 400) {
            calibrateClock(data.serverTime - Math.round((t0 + t1) / 2));
          }
          if (data.error) {
            setErrorMessage(data.error);
          }
        })
        .catch(() => {});
    },
    [selectedRoom, isManualDisconnected, isAfk, calibrateClock]
  );

  // Gamemode selector
  const handleSelectMode = (mode: Gamemode) => {
    const uid = effectiveUserIdRef.current;
    if (!uid || isManualDisconnected) return;
    setCurrentMode(mode);
    currentModeRef.current = mode;
    setErrorMessage('');

    const switchTime = Math.round(Date.now() + clockOffsetRef.current);
    const seed = Math.round(Math.random() * 10000) / 10;
    const segId = `mode-${uid.slice(0, 6)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.userId !== uid) return p;
        const phys = getPlaygroundPhysics(
          p.segment.roomId ? p.segment : { ...p.segment, roomId: selectedRoom },
          switchTime
        );
        const destX = phys.isFinished ? phys.x : p.segment.toX;
        const destY = phys.isFinished ? FLOOR_SURFACE_Y - PLAYER_RADIUS : p.segment.toY;
        const nextSegment = createPlaygroundSegment(
          phys.x,
          phys.y,
          destX,
          destY,
          mode,
          switchTime,
          seed,
          {
            vy: mode === 'ball' ? phys.vy : Math.min(phys.vy, 300),
            isOnGround: mode !== 'ball' && phys.flipY ? false : phys.isOnGround,
            rotation: mode === 'cube' || mode === 'ball' ? phys.rotation : 0,
            flipY: mode === 'ball' ? phys.flipY : false,
            direction: phys.scaleX >= 0 ? 1 : -1,
            id: segId,
            roomId: selectedRoom,
          }
        );
        return {
          ...p,
          currentMode: mode,
          segment: nextSegment,
        };
      })
    );

    const t0 = Date.now();
    fetch('/api/playground/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setMode',
        mode,
        roomId: selectedRoom,
        clientTime: switchTime,
        seed,
        segId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const t1 = Date.now();
        if (typeof data.serverTime === 'number' && t1 - t0 < 400) {
          calibrateClock(data.serverTime - Math.round((t0 + t1) / 2));
        }
        if (data.error) {
          setErrorMessage(data.error);
        }
      })
      .catch(() => {});
  };

  // Chat send handler
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || chatCooldown > 0 || isSubmittingChat || isManualDisconnected) return;

    setIsSubmittingChat(true);
    setErrorMessage('');

    const t0 = Date.now();
    fetch('/api/playground/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        text: chatText.trim(),
        roomId: selectedRoom,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const t1 = Date.now();
        if (typeof data.serverTime === 'number' && t1 - t0 < 400) {
          calibrateClock(data.serverTime - Math.round((t0 + t1) / 2));
        }
        setIsSubmittingChat(false);
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setChatText('');
          setChatCooldown(3);
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = setInterval(() => {
            setChatCooldown((prev) => {
              if (prev <= 1) {
                if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      })
      .catch(() => {
        setIsSubmittingChat(false);
        setErrorMessage('Không thể gửi tin nhắn.');
      });
  };

  const handleDeleteChat = (messageId: string) => {
    if (!isStaff) return;
    fetch('/api/playground/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteChat', messageId }),
    }).catch(() => {});
  };

  const handleEatFood = useCallback(
    (foodId: string) => {
      fetch('/api/playground/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'eatFood',
          foodId,
          roomId: selectedRoom,
        }),
      }).catch(() => {});
    },
    [selectedRoom]
  );

  const roomPlayersList = React.useMemo(() => {
    const scoreMap = new Map<string, number>();
    leaderboard.forEach((entry) => {
      scoreMap.set(entry.userId, entry.score);
    });

    return [...players].sort((a, b) => {
      const scoreA = scoreMap.get(a.userId) || 0;
      const scoreB = scoreMap.get(b.userId) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const activeA = a.isActiveInRoom && !a.isAfk ? 1 : 0;
      const activeB = b.isActiveInRoom && !b.isAfk ? 1 : 0;
      if (activeB !== activeA) return activeB - activeA;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [players, leaderboard]);

  const rooms: Array<{ id: string; label: string; isClan?: boolean }> = [
    { id: 'public-1', label: 'Phòng 1' },
    { id: 'public-2', label: 'Phòng 2' },
  ];
  if (myClan) {
    rooms.push({
      id: `clan-${myClan.slug}`,
      label: `Clan [${myClan.tag}]`,
      isClan: true,
    });
  }

  const activeInRoomCount = players.filter((p) => p.isActiveInRoom && !p.isAfk).length;
  const idleInRoomCount = players.filter((p) => !p.isActiveInRoom || p.isAfk).length;
  const isOnlineConnected = connected && !isManualDisconnected;

  return (
    <div className="min-h-screen pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            random tung
          </h1>
        </div>

        {/* Controls: Power Plug connection button, compact count badge, and Idle switch */}
        <div className="flex items-center gap-2.5 text-xs">
          <button
            type="button"
            onClick={handleToggleOnline}
            disabled={disconnectCooldown > 0}
            aria-label={isOnlineConnected ? 'Disconnect' : 'Connect'}
            className={`p-2 rounded-xl border transition-all duration-200 select-none ${
              disconnectCooldown > 0
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                : isOnlineConnected
                ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white cursor-pointer shadow-md shadow-emerald-500/30'
                : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-600 dark:text-rose-400 cursor-pointer shadow-xs'
            }`}
          >
            {disconnectCooldown > 0 ? (
              <span className="font-mono text-xs font-bold px-0.5">{disconnectCooldown}s</span>
            ) : isOnlineConnected ? (
              <Plug className="w-4 h-4 transition-transform active:scale-90" />
            ) : (
              <Unplug className="w-4 h-4 transition-transform active:scale-90" />
            )}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnlineConnected
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
              {activeInRoomCount}
            </span>
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {idleInRoomCount}
            </span>
          </div>

          {effectiveUserId && (
            <div
              onClick={() => handleSetAfk(!isAfk, !isAfk)}
              role="button"
              tabIndex={0}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer select-none transition-all duration-200 ${
                isAfk
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'bg-white/90 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-xs'
              }`}
            >
              <Moon
                className={`w-3.5 h-3.5 transition-colors ${
                  isAfk
                    ? 'text-amber-500 fill-amber-500/30'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />
              <span className="font-bold tracking-wide">Idle</span>
              <div
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                  isAfk ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-slate-950 shadow-md transition-transform duration-200 ease-in-out ${
                    isAfk ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Room Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {rooms.map((r) => {
          const isActive = selectedRoom === r.id;
          const stats = r.id === selectedRoom && roomStats ? roomStats : allRoomsStats[r.id];
          const totalActive = stats?.totalActive ?? 0;
          const idleCount = stats?.idleCount ?? 0;
          const maxCount = stats
            ? isSupporter
              ? stats.maxSupporter
              : stats.maxRegular
            : isSupporter
            ? 50
            : 10;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoom(r.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 border ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs'
                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-xs'
              }`}
            >
              {r.isClan ? (
                <Users className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Gamepad2 className="w-3.5 h-3.5" />
              )}
              <span>{r.label}</span>
              <span
                className={`ml-1 text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                  isActive
                    ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title="Đang chơi / Idle / Tối đa"
              >
                {totalActive}/{idleCount}/{maxCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-500/30 text-red-800 dark:text-red-300 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="ml-auto text-xs opacity-70 hover:opacity-100 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Canvas Area */}
      <PlaygroundCanvas
        roomId={selectedRoom}
        players={players}
        chats={chats}
        foods={foods}
        leaderboard={leaderboard}
        currentUserId={effectiveUserId}
        isStaff={isStaff}
        onMove={handleMove}
        onDeleteChat={handleDeleteChat}
        onEatFood={handleEatFood}
        lastEatenFood={lastEatenFood}
        clockOffset={clockOffset}
      />

      {/* Gamemode Selector (6 modes, icon-only clean buttons) */}
      {effectiveUserId && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(() => {
            const myPlayerInRoom = players.find((p) => p.userId === effectiveUserId);
            const iconSet = currentUser?.gdIconSet || myPlayerInRoom?.iconSet || {};
            const col1 = iconSet.color1 ?? 0;
            const col2 = iconSet.color2 ?? 3;
            const glow = iconSet.glow ?? false;
            const colG = iconSet.colorGlow ?? iconSet.color3 ?? col2;

            return GAMEMODES.map((gm) => {
              const isSelected = currentMode === gm.id;
              const iconId = iconSet[gm.id] ?? 1;
              const previewUrl = `/api/gd/icon?form=${gm.id}&icon=${iconId}&col1=${col1}&col2=${col2}${glow ? `&glow=1&colG=${colG}` : ''}&size=64&v=3`;

              return (
                <button
                  key={gm.id}
                  type="button"
                  onClick={() => handleSelectMode(gm.id)}
                  aria-label={gm.label}
                  className={`flex items-center justify-center p-2.5 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-md shadow-cyan-500/10'
                      : 'bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <img
                    src={previewUrl}
                    alt={gm.label}
                    className="w-9 h-9 object-contain drop-shadow"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/api/gd/icon?form=${gm.id}&icon=1&col1=${col1}&col2=${col2}&size=64&v=3`;
                    }}
                  />
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* Clean Minimalist Chat Box (no labels, no placeholders, no counters) */}
      <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 space-y-2.5 shadow-xs">
        {recentChatLog.length > 0 && (
          <div
            ref={chatScrollContainerRef}
            className="max-h-32 overflow-y-auto space-y-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 px-3 py-2 scrollbar-thin"
          >
            {recentChatLog.map((msg) => {
              const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={msg.id}
                  className="flex items-baseline gap-2 text-xs leading-relaxed"
                >
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                    {timeStr}
                  </span>
                  <span className="font-bold shrink-0">
                    {msg.clanTag && (
                      <span className="text-amber-600 dark:text-amber-400 mr-1">
                        [{msg.clanTag}]
                      </span>
                    )}
                    <span
                      style={{ color: msg.nameColor || undefined }}
                      className={!msg.nameColor ? 'text-slate-800 dark:text-slate-200' : ''}
                    >
                      {msg.displayName || msg.username}:
                    </span>
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 break-words flex-1">
                    {msg.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {effectiveUserId ? (
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              maxLength={120}
              placeholder=""
              aria-label="Chat"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors shadow-xs"
            />
            <button
              type="submit"
              disabled={
                !chatText.trim() || chatCooldown > 0 || isSubmittingChat || !isOnlineConnected
              }
              aria-label="Send"
              className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-600/20"
            >
              {chatCooldown > 0 ? (
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 animate-spin text-cyan-200" />
                  {chatCooldown}s
                </span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        ) : (
          <div className="flex justify-center py-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          </div>
        )}
      </div>

      {/* Room Users Leaderboard (Hiển thị như trang Bảng Xếp Hạng) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 shadow-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Người chơi trong phòng
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800/60 font-semibold">
              {roomPlayersList.length}
            </span>
          </div>
        </div>

        {roomPlayersList.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            Chưa có người chơi nào trong phòng này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 w-14 text-center">Hạng</th>
                  <th className="px-4 py-3">Người chơi</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Điểm số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {roomPlayersList.map((p, idx) => {
                  const rank = idx + 1;
                  const score = leaderboard.find((l) => l.userId === p.userId)?.score ?? 0;
                  const profileHref = p.username ? `/profile/${p.username}` : null;
                  const iconSet = p.iconSet || {};
                  const col1 = iconSet.color1 ?? 0;
                  const col2 = iconSet.color2 ?? 3;
                  const glow = iconSet.glow ?? false;
                  const colG = iconSet.colorGlow ?? iconSet.color3 ?? col2;
                  const iconUrl = `/api/gd/icon?form=${p.currentMode}&icon=${iconSet[p.currentMode] ?? 1}&col1=${col1}&col2=${col2}${glow ? `&glow=1&colG=${colG}` : ''}&size=48&v=3`;

                  const isRank1 = rank === 1;
                  const isRank2 = rank === 2;
                  const isRank3 = rank === 3;
                  const rankColor = isRank1
                    ? 'text-amber-500 font-black'
                    : isRank2
                    ? 'text-slate-400 dark:text-slate-300 font-black'
                    : isRank3
                    ? 'text-amber-700 dark:text-amber-600 font-black'
                    : 'text-slate-500 dark:text-slate-400 font-semibold';

                  return (
                    <tr
                      key={p.userId}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        p.userId === effectiveUserId ? 'bg-cyan-50/50 dark:bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs ${rankColor}`}>#{rank}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {profileHref ? (
                            <Link href={profileHref} className="shrink-0 transition-transform hover:scale-110">
                              <img
                                src={iconUrl}
                                alt={p.displayName}
                                className="w-8 h-8 object-contain drop-shadow"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `/api/gd/icon?form=${p.currentMode}&icon=1&col1=${col1}&col2=${col2}&size=48&v=3`;
                                }}
                              />
                            </Link>
                          ) : (
                            <img
                              src={iconUrl}
                              alt={p.displayName}
                              className="w-8 h-8 object-contain drop-shadow shrink-0"
                            />
                          )}

                          <div className="min-w-0">
                            <div className="font-bold flex items-center gap-1.5 flex-wrap">
                              {profileHref ? (
                                <Link
                                  href={profileHref}
                                  className="hover:underline flex items-center gap-1"
                                >
                                  <UserDisplayName user={p} fallbackName={p.displayName} linkClan />
                                </Link>
                              ) : (
                                <UserDisplayName user={p} fallbackName={p.displayName} linkClan />
                              )}
                              {p.userId === effectiveUserId && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-300 dark:border-cyan-800">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">
                              {p.currentMode}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {p.isAfk ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                            💤 Idle
                          </span>
                        ) : !p.isActiveInRoom ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shadow-xs">
                            Trang khác
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang chơi
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-black text-sm text-cyan-600 dark:text-cyan-400">
                          {score} điểm
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
