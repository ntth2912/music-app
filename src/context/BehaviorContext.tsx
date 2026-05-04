import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export interface BehaviorData {
  songId: string;
  action: 'play' | 'like' | 'dislike' | 'skip' | 'replay' | 'favorite' | 'add_to_playlist';
  timestamp: number;
  duration?: number;
}

interface BehaviorContextType {
  trackBehavior: (data: Omit<BehaviorData, 'timestamp'>) => void;
  getBehaviorData: () => BehaviorData[];
  getSongScore: (songId: string) => number;
  getRecommendedSongs: () => string[];
}

const BehaviorContext = createContext<BehaviorContextType>({
  trackBehavior: () => {},
  getBehaviorData: () => [],
  getSongScore: () => 0,
  getRecommendedSongs: () => [],
});

export function BehaviorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [behaviors, setBehaviors] = useState<BehaviorData[]>([]);

  const userId = useMemo(() => {
    if (!user) return undefined;
    return String((user as any).id || (user as any)._id || '');
  }, [user]);

  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`behaviors_${userId}`);
      if (saved) {
        try {
          setBehaviors(JSON.parse(saved));
        } catch (e) {
          setBehaviors([]);
        }
      }
    } else {
      setBehaviors([]); 
    }
  }, [userId]);

  const calculateRecommendations = useCallback((allBehaviors: BehaviorData[]) => {
    if (!userId) return;
    const songScores = new Map<string, number>();
    allBehaviors.forEach(b => {
      const current = songScores.get(b.songId) || 0;
      let points = 0;
      switch (b.action) {
        case 'play': points = 1; break;
        case 'favorite': case 'like': points = 10; break;
        case 'replay': points = 5; break;
        case 'add_to_playlist': points = 8; break;
        case 'skip': points = -3; break;
        case 'dislike': points = -10; break;
      }
      songScores.set(b.songId, current + points);
    });

    const topSongs = Array.from(songScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    localStorage.setItem(`recommended_${userId}`, JSON.stringify(topSongs));
  }, [userId]);

  const trackBehavior = useCallback((data: Omit<BehaviorData, 'timestamp'>) => {
    if (!userId) return;
    const newEntry: BehaviorData = { ...data, timestamp: Date.now() };
    setBehaviors(prev => {
      const updated = [...prev, newEntry];
      localStorage.setItem(`behaviors_${userId}`, JSON.stringify(updated));
      calculateRecommendations(updated);
      return updated;
    });
  }, [userId, calculateRecommendations]);

  const getBehaviorData = () => behaviors;
  const getSongScore = (songId: string) => {
    return behaviors
      .filter(b => b.songId === songId)
      .reduce((score, b) => {
        if (b.action === 'play') return score + 1;
        if (['like', 'favorite'].includes(b.action)) return score + 10;
        if (b.action === 'add_to_playlist') return score + 8;
        if (b.action === 'skip') return score - 3;
        if (b.action === 'dislike') return score - 10;
        return score;
      }, 0);
  };

  const getRecommendedSongs = () => {
    if (!userId) return [];
    const saved = localStorage.getItem(`recommended_${userId}`);
    return saved ? JSON.parse(saved) : [];
  };

  return (
    <BehaviorContext.Provider value={{ trackBehavior, getBehaviorData, getSongScore, getRecommendedSongs }}>
      {children}
    </BehaviorContext.Provider>
  );
}

export const useBehavior = () => useContext(BehaviorContext);