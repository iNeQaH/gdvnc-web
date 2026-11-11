'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { isStaffRole, isSuperAdminUser } from '@/lib/roles';

const GAMEMODES: Array<{ id: Gamemode; label: string }> = [
  { id: 'cube', label: 'Cube' },
  { id: 'jetpack', label: 'Jetpack' },
  { id: 'ball', label: 'Ball' },
  { id: 'ufo', label: 'UFO' },
  { id: 'wave', label: 'Wave' },
  { id: 'swing', label: 'Swing' },
];

export default function NhowstraysonPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<Gamemode>('cube');
  const selectedRoom = 'public-1';
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
          if (!isSuperAdminUser(data.user) && !data.user.isSuperAdmin) {
            router.replace('/');
          }
        } else {
          const saved = localStorage.getItem('gdvnc_user');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setCurrentUser(parsed);
              if (!isSuperAdminUser(parsed) && !parsed.isSuperAdmin) {
                router.replace('/');
              }
            } catch {
              router.replace('/');
            }
          } else {
            router.replace('/');
          }
        }
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
        router.replace('/');
      });

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
              setIsAfk(true);
              handleSetAfk(true, true);
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

  // User is permanently AFK on this page (no manual movement or activity un-AFK)
  useEffect(() => {
    if (!effectiveUserId) return;
    setIsAfk(true);
    handleSetAfk(true, true);
  }, [effectiveUserId, handleSetAfk]);

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

  const activeInRoomCount = players.filter((p) => p.isActiveInRoom && !p.isAfk).length;
  const idleInRoomCount = players.filter((p) => !p.isActiveInRoom || p.isAfk).length;
  const isOnlineConnected = connected;
  const isOwner = Boolean(currentUser && (currentUser.isSuperAdmin || isSuperAdminUser(currentUser)));

  if (!authChecked || !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

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

        {/* Controls: Compact online count badge, and static AFK badge (no disconnect button) */}
        <div className="flex items-center gap-2.5 text-xs">
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

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-xs select-none">
            <Moon className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
            <span className="font-bold tracking-wide">AFK</span>
          </div>
        </div>
      </div>

      {/* Single Common Room Badge (Chỉ duy nhất 1 phòng chung) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold bg-cyan-500/15 border border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-xs">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Phòng chung</span>
          <span
            className="ml-1 text-[11px] font-mono px-2 py-0.5 rounded-md border bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/40"
            title="Đang chơi / Idle / Tối đa"
          >
            {activeInRoomCount}/{idleInRoomCount}/{roomStats?.maxRegular || 50}
          </span>
        </div>
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

      {/* Canvas Area (Không thể chủ động click di chuyển, chỉ AFK) */}
      <PlaygroundCanvas
        roomId={selectedRoom}
        players={players}
        chats={[]}
        foods={foods}
        leaderboard={leaderboard}
        currentUserId={effectiveUserId}
        isStaff={isStaff}
        onDeleteChat={handleDeleteChat}
        onEatFood={handleEatFood}
        lastEatenFood={lastEatenFood}
        clockOffset={clockOffset}
      />

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
