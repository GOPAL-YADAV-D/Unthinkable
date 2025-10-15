"use client"

import { useMemo } from "react"
import type { GoalsByDate } from "@/types"
import { cn } from "@/lib/utils"

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay() // 0-6, Sun-Sat
  const daysInMonth = lastDay.getDate()

  const weeks: Array<Array<Date | null>> = []
  let currentWeek: Array<Date | null> = Array(startDay).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(new Date(year, month, d))
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

export function Calendar({
  selected,
  onSelect,
  goalsByDate,
  dayKey,
}: {
  selected: Date
  onSelect: (d: Date) => void
  goalsByDate: GoalsByDate
  dayKey: (d: Date) => string
}) {
  const y = selected.getFullYear()
  const m = selected.getMonth()
  const weeks = useMemo(() => getMonthMatrix(y, m), [y, m])

  return (
    <section className="bg-card text-card-foreground rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">
          {selected.toLocaleString(undefined, { month: "long" })} {y}
        </h3>
      </div>
      <div className="grid grid-cols-7 text-xs text-muted-foreground mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, i) => (
          <div key={i} className="contents">
            {week.map((date, j) => {
              if (!date) return <div key={j} className="h-10" />
              const k = dayKey(date)
              const isSelected = dayKey(selected) === k
              const count = goalsByDate[k]?.length || 0
              return (
                <button
                  key={j}
                  onClick={() => onSelect(date)}
                  className={cn(
                    "h-10 rounded-md border text-sm flex items-center justify-center relative",
                    isSelected ? "bg-accent text-accent-foreground border-accent" : "bg-background",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Select ${date.toDateString()}`}
                >
                  {date.getDate()}
                  {count > 0 && (
                    <span
                      aria-label={`${count} goals on this day`}
                      className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
