"use client";

import { useEffect, useRef } from "react";
import { timeAgo } from "../lib/utils";
import type { ActivityItem } from "../lib/activity";

interface ActivityFeedProps {
  events: ActivityItem[];
  maxItems?: number;
  connected?: boolean;
}

const EVENT_ICONS: Record<string, string> = {
  "project.created": "\u{1F680}",
  "project.planning_started": "\u{2699}\u{FE0F}",
  "project.planning_completed": "\u{2705}",
  "workstream.started": "\u{1F525}",
  "workstream.completed": "\u{2705}",
  "workstream.failed": "\u{274C}",
  "task.queued": "\u{1F4E6}",
  "task.started": "\u{26A1}",
  "task.completed": "\u{2705}",
  "task.failed": "\u{274C}",
};

const EVENT_CATEGORIES: Record<string, string> = {
  "project.created": "project",
  "project.planning_started": "project",
  "project.planning_completed": "project",
  "workstream.started": "workstream",
  "workstream.completed": "workstream",
  "workstream.failed": "workstream",
  "task.queued": "task",
  "task.started": "task",
  "task.completed": "task",
  "task.failed": "task",
};

const CATEGORY_COLORS: Record<string, string> = {
  project: "var(--color-primary)",
  workstream: "var(--color-accent)",
  task: "var(--color-success)",
};

export function ActivityFeed({ events, maxItems = 20, connected }: ActivityFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  const visible = events.slice(0, maxItems);

  useEffect(() => {
    if (events.length > prevLenRef.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevLenRef.current = events.length;
  }, [events.length]);

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Activity</h3>
        <span className={`activity-status ${connected ? "connected" : ""}`}>
          {connected ? "Live" : "Connecting\u2026"}
        </span>
      </div>

      <div className="activity-list" ref={listRef}>
        {visible.length === 0 ? (
          <div className="activity-empty">
            <p className="text-muted text-sm">No recent activity</p>
          </div>
        ) : (
          visible.map((item, i) => {
            const category = EVENT_CATEGORIES[item.type] ?? "task";
            const color = CATEGORY_COLORS[category];
            const opacity = Math.max(0.4, 1 - i * 0.04);
            return (
              <div
                key={item.id}
                className="activity-item"
                style={{ opacity }}
              >
                <span
                  className="activity-icon"
                  style={{ borderColor: color }}
                >
                  {EVENT_ICONS[item.type] ?? "\u{1F4DD}"}
                </span>
                <div className="activity-body">
                  <span className="activity-description">
                    {item.description}
                  </span>
                  <span className="activity-time">
                    {timeAgo(item.timestamp.toISOString())}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
