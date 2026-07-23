"use client";

import React, { useState, useEffect } from "react";

interface NextRunCountdownProps {
  targetDate: Date | string | null;
  className?: string;
}

export function formatSecondsCountdown(targetDate: Date | string | null): string {
  if (!targetDate) return "—";

  const date = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Due Now";

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `in ${diffSecs}s`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `in ${diffMins}m ${diffSecs % 60}s`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours}h ${diffMins % 60}m`;

  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays}d ${diffHours % 24}h`;
}

export default function NextRunCountdown({ targetDate, className = "" }: NextRunCountdownProps) {
  const [displayText, setDisplayText] = useState<string>(() => formatSecondsCountdown(targetDate));
  const [isUnderMinute, setIsUnderMinute] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      if (!targetDate) {
        setDisplayText("—");
        setIsUnderMinute(false);
        return;
      }

      const date = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      setIsUnderMinute(diffSecs > 0 && diffSecs < 60);
      setDisplayText(formatSecondsCountdown(targetDate));
    };

    updateTime();
    // Update every 1s if under a minute, otherwise every 10s
    const intervalMs = isUnderMinute ? 1000 : 5000;
    const timer = setInterval(updateTime, intervalMs);

    return () => clearInterval(timer);
  }, [targetDate, isUnderMinute]);

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold transition-all ${
      displayText === "Due Now"
        ? "text-emerald-500 animate-pulse"
        : isUnderMinute
        ? "text-[#f06a55] font-extrabold animate-pulse"
        : ""
    } ${className}`}>
      {displayText}
    </span>
  );
}
