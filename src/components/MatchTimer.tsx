import React, { useState, useEffect, memo } from 'react';
import { MATCH_INITIAL_SECONDS } from '../constants';

interface MatchTimerProps {
  /** Starting seconds into the match (defaults to MATCH_INITIAL_SECONDS = 68:24). */
  initialSeconds?: number;
}

/**
 * Self-contained live match timer.
 * Extracted into its own component so the 1-second interval state only
 * causes this tiny subtree to re-render — not the entire FanDashboard.
 */
function MatchTimer({ initialSeconds = MATCH_INITIAL_SECONDS }: MatchTimerProps) {
  const [matchSeconds, setMatchSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setMatchSeconds(sec => sec + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins    = Math.floor(matchSeconds / 60);
  const remSecs = matchSeconds % 60;
  const display = `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;

  return (
    <div className="inline-flex items-center space-x-1.5 bg-rose-950/40 border border-rose-800/20 px-2.5 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" aria-hidden="true" />
      <span className="text-[10px] font-mono text-rose-400 font-semibold">
        <time dateTime={`PT${mins}M${remSecs}S`}>{display}</time>
        {' • LIVE'}
      </span>
    </div>
  );
}

export default memo(MatchTimer);
