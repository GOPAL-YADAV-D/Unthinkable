"use client"

import type { Goal } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.round(value)}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        role="progressbar"
      />
    </div>
  )
}

export function GoalCard({
  goal,
  onToggleSubtask,
}: {
  goal: Goal
  onToggleSubtask: (subtaskId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const progress = useMemo(() => {
    const total = goal.subtasks.length || 1
    const done = goal.subtasks.filter((s) => s.done).length
    return (done / total) * 100
  }, [goal.subtasks])

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between">
          <CardTitle className={cn("text-pretty", goal.status === 'completed' && "line-through text-muted-foreground")}>
            {goal.title}
          </CardTitle>
          {goal.status === 'completed' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              ✓ Completed
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {goal.project && (
            <Badge variant="outline" className="border-border">
              {goal.project}
            </Badge>
          )}
          <Badge
            className={cn(
              "border-0",
              goal.priority === "High" && "bg-destructive text-destructive-foreground",
              goal.priority === "Medium" && "bg-accent text-accent-foreground",
              goal.priority === "Low" && "bg-secondary text-secondary-foreground",
            )}
          >
            {goal.priority}
          </Badge>
          {goal.platformTags?.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">Due: {goal.dueDate}</span>
          <div className="flex -space-x-2">
            {(goal.team || []).map((initials) => (
              <div
                key={initials}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] text-secondary-foreground border border-border"
                aria-label={`Team member ${initials}`}
              >
                {initials}
              </div>
            ))}
          </div>
        </div>
        <ProgressBar value={progress} />
      </CardHeader>
      <CardContent>
        <button
          className="text-xs text-muted-foreground underline mb-3"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide subtasks" : "Show subtasks"}
        </button>
        {expanded && (
          <ul className="space-y-2">
            {goal.subtasks.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                <Checkbox
                  checked={s.done}
                  onCheckedChange={() => onToggleSubtask(s.id)}
                  aria-label={`Toggle ${s.title}`}
                />
                <span className={cn("text-sm", s.done && "line-through text-muted-foreground")}>{s.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
