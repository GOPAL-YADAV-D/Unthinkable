"use client"

import { useState } from "react"
import { Plus, Send, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { Goal, Subtask } from "@/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { llmApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

type Message = { role: "user" | "assistant"; content: string; subtasks?: Subtask[] }

function simulateSubtasksFromPrompt(prompt: string): Subtask[] {
  // naive simulation: split prompt into actionable steps
  const base = ["Outline key tasks", "Assign responsibilities", "Set timeline & milestones", "Review and iterate"]
  const words = prompt.trim().split(/\s+/)
  const signal = words.slice(0, 3).join(" ")
  const picks = base.slice(0, 3)
  return picks.map((t, i) => ({
    id: `tmp-${i}`,
    title: `${t} — ${signal}`.trim(),
    done: false,
  }))
}

export function NewTaskComposer({
  defaultDateISO,
  onSave,
}: {
  defaultDateISO: string
  onSave: (goal: Goal) => void
}) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [title, setTitle] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleSend() {
    if (!input.trim()) return
    
    const userMsg: Message = { role: "user", content: input.trim() }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setIsGenerating(true)

    try {
      if (isAuthenticated) {
        // Use real LLM API
        const response = await llmApi.generateSubtasks(title || userMsg.content, userMsg.content)
        
        if (response.success && response.data.subtasks) {
          const subtasks = response.data.subtasks
          let replyContent = "Here are AI-generated subtasks for your goal:\n\n"
          
          // Convert LLM subtasks to our Subtask format
          const convertedSubtasks: Subtask[] = subtasks.map((subtask, index) => ({
            id: `gen-${index}`,
            title: subtask.title,
            done: false,
            description: subtask.description,
            estimatedHours: subtask.estimatedHours,
            category: subtask.category,
          }))
          
          subtasks.forEach((subtask, index) => {
            replyContent += `${index + 1}. ${subtask.title}`
            if (subtask.estimatedHours) {
              replyContent += ` (${subtask.estimatedHours}h)`
            }
            if (subtask.category) {
              replyContent += ` [${subtask.category}]`
            }
            replyContent += "\n"
            if (subtask.description) {
              replyContent += `   ${subtask.description}\n`
            }
          })
          
          if (response.data.estimatedTotalHours) {
            replyContent += `\nTotal estimated time: ${response.data.estimatedTotalHours} hours`
          }
          
          if (response.data.tips && response.data.tips.length > 0) {
            replyContent += "\n\n💡 Implementation Tips:\n"
            response.data.tips.forEach(tip => {
              replyContent += `• ${tip}\n`
            })
          }
          
          const reply: Message = {
            role: "assistant",
            content: replyContent,
            subtasks: convertedSubtasks
          }
          
          setMessages((m) => [...m, reply])
          toast.success("AI-powered subtasks generated!")
        } else {
          throw new Error("Failed to generate subtasks")
        }
      } else {
        // Fallback to simulation
        const subtasks = simulateSubtasksFromPrompt(userMsg.content)
        const reply: Message = {
          role: "assistant",
          content: `Here are some suggested subtasks:\n` + subtasks.map((s, i) => `${i + 1}. ${s.title}`).join("\n"),
          subtasks: subtasks
        }
        // delay for effect
        setTimeout(() => {
          setMessages((m) => [...m, reply])
          toast.info("Using offline mode - login for AI-powered suggestions")
        }, 400)
      }
    } catch (error) {
      console.error('Failed to generate subtasks:', error)
      
      // Fallback to simulation
      const subtasks = simulateSubtasksFromPrompt(userMsg.content)
      const reply: Message = {
        role: "assistant",
        content: `Here are some suggested subtasks (offline mode):\n` + subtasks.map((s, i) => `${i + 1}. ${s.title}`).join("\n"),
        subtasks: subtasks
      }
      
      setTimeout(() => {
        setMessages((m) => [...m, reply])
        toast.error("Failed to connect to AI. Using fallback suggestions.")
      }, 400)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSave() {
    const assistantMessage = messages.find((m) => m.role === "assistant" && m.subtasks)
    const subtasks: Subtask[] = assistantMessage?.subtasks || []
      
    const goal: Goal = {
      id: `g-${Date.now()}`,
      title: title || "New Goal",
      priority: "Medium",
      platformTags: [],
      dueDate: defaultDateISO,
      team: ["ME"],
      subtasks,
      status: "pending",
    }
    
    onSave(goal)
    setOpen(false)
    setMessages([])
    setTitle("")
    setInput("")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg border border-border hover:scale-105 transition-transform"
            aria-label="Create New Task"
          >
            <Plus className="h-6 w-6 mx-auto" aria-hidden />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Goal with AI Assistant
              {!isAuthenticated && (
                <span className="text-xs text-muted-foreground">(Offline Mode)</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title (e.g., Plan hackathon)"
              aria-label="Goal title"
            />
            <div className="h-56 overflow-auto rounded-md border p-3 bg-background">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Describe your goal below and I'll help you break it down into actionable subtasks!</p>
                  <p className="text-xs">
                    {isAuthenticated 
                      ? "✨ AI-powered suggestions enabled" 
                      : "💡 Login to unlock AI-powered task generation"
                    }
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "max-w-[85%] rounded-md px-3 py-2 text-sm",
                      m.role === "user"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-secondary text-secondary-foreground",
                    )}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-sm">{m.content}</pre>
                  </div>
                ))}
                {isGenerating && (
                  <div className="self-start bg-secondary text-secondary-foreground max-w-[85%] rounded-md px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating AI subtasks...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your goal or task idea..."
                aria-label="Goal description"
                className="min-h-[72px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button 
                onClick={handleSend} 
                className="self-start" 
                aria-label="Send"
                disabled={isGenerating || !input.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" aria-hidden /> 
                    Send
                  </>
                )}
              </Button>
            </div>
            <Button variant="default" onClick={handleSave} disabled={!title.trim()}>
              Save as Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
