"use client";

import type { AgentTask } from "../lib/api";
import { StatusBadge } from "./ui/StatusBadge";

interface TaskNode {
  task: AgentTask;
  children: TaskNode[];
}

function buildTree(tasks: AgentTask[]): TaskNode[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const childMap = new Map<string, AgentTask[]>();

  for (const task of tasks) {
    if (task.parentTaskId) {
      const siblings = childMap.get(task.parentTaskId) ?? [];
      siblings.push(task);
      childMap.set(task.parentTaskId, siblings);
    }
  }

  function toNode(task: AgentTask): TaskNode {
    const kids = childMap.get(task.id) ?? [];
    return { task, children: kids.map(toNode) };
  }

  const roots = tasks.filter((t) => !t.parentTaskId || !byId.has(t.parentTaskId));
  return roots.map(toNode);
}

function TaskNodeView({ node, depth }: { node: TaskNode; depth: number }) {
  const { task } = node;
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className="flex items-center justify-between"
        style={{
          padding: "0.5rem 0.75rem",
          borderLeft: depth > 0 ? "2px solid var(--color-border)" : "none",
          marginBottom: 4,
        }}
      >
        <div className="flex items-center gap-2">
          {task.tier && (
            <span
              style={{
                fontSize: "0.65rem",
                padding: "1px 5px",
                borderRadius: 3,
                background: "var(--color-bg)",
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {task.tier}
            </span>
          )}
          <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>{task.role}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            {task.prompt.length > 80 ? `${task.prompt.slice(0, 80)}...` : task.prompt}
          </span>
        </div>
        <StatusBadge status={task.status} />
      </div>
      {node.children.map((child) => (
        <TaskNodeView key={child.task.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TaskTree({ tasks }: { tasks: AgentTask[] }) {
  const tree = buildTree(tasks);

  if (tree.length === 0) {
    return null;
  }

  return (
    <div>
      {tree.map((node) => (
        <TaskNodeView key={node.task.id} node={node} depth={0} />
      ))}
    </div>
  );
}
