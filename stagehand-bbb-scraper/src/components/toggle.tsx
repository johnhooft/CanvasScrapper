"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface ToggleProps {
    setMode: React.Dispatch<React.SetStateAction<"LLM" | "Explicit">>;
    disabled?: boolean;
  }

  export default function Toggle({ setMode, disabled = false }: ToggleProps) {
  const [mode, setLocalMode] = useState<"LLM" | "Explicit">("LLM")

  const handleModeChange = (newMode: "LLM" | "Explicit") => {
    if (disabled || newMode === mode) return;
    setLocalMode(newMode);
    setMode(newMode);
  };

  return (
    <div className="flex items-center justify-center py-4 bg-none">
      <div className="space-y-2">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Mode Selection</h2>
          <p className="text-gray-200">
            Current mode: <span className="font-semibold">{mode}</span>
          </p>
        </div>

        <div className="w-full flex justify-center py-2">
            <div className={cn(
                "relative inline-flex border-2 border-white rounded-lg p-1",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}>
            <button
                onClick={() => handleModeChange("LLM")}
                className={cn(
                "relative px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out",
                mode === "LLM" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500= hover:text-gray-100",
                )}
            >
                LLM
            </button>
            <button
                onClick={() => handleModeChange("Explicit")}
                className={cn(
                "relative px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out",
                mode === "Explicit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-100",
                )}
            >
                Explicit
            </button>
            </div>
        </div>

        <div className="text-center max-w-md">
          <div className="p-4 bg-none rounded-lg shadow-sm border">
            <h3 className="font-semibold mb-2 text-white">{mode} Mode Active</h3>
            <p className="text-sm text-gray-400">
              {mode === "LLM"
                ? "Using Large Language Model processing for intelligent responses and natural language understanding."
                : "Using explicit rule-based processing for deterministic and predictable behavior."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
