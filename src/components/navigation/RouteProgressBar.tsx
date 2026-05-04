"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type RouteProgressListener = (event: "start" | "complete") => void;

const listeners = new Set<RouteProgressListener>();

export function beginRouteProgress() {
  listeners.forEach((listener) => listener("start"));
}

function completeRouteProgress() {
  listeners.forEach((listener) => listener("complete"));
}

function subscribe(listener: RouteProgressListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const activeRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );

  useEffect(() => {
    const clearTimers = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };

    const finish = () => {
      clearTimers();
      activeRef.current = false;
      setProgress(100);
      finishTimeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 180);
    };

    const start = () => {
      clearTimers();
      activeRef.current = true;
      setVisible(true);
      setProgress((current) => (current > 8 ? current : 12));

      intervalRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 84) {
            return current;
          }

          return current + Math.max(2, (86 - current) * 0.08);
        });
      }, 140);
    };

    return subscribe((event) => {
      if (event === "start") {
        start();
        return;
      }

      finish();
    });
  }, []);

  useEffect(() => {
    if (!activeRef.current) {
      return;
    }

    completeRouteProgress();
  }, [routeKey]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-primary/8"
    >
      <div
        className="h-full rounded-r-full bg-[linear-gradient(90deg,#f59e0b_0%,#ffcf3f_55%,#ffe58a_100%)] shadow-[0_0_18px_rgba(245,158,11,0.38)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
