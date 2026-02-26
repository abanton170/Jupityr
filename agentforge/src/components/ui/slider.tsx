"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onValueChange?: (value: number) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onValueChange?.(Number(e.target.value))
    }

    return (
      <input
        type="range"
        className={cn(
          "w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary/50 [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:transition-colors [&::-moz-range-thumb]:hover:bg-accent [&::-moz-range-thumb]:focus-visible:ring-1 [&::-moz-range-thumb]:focus-visible:ring-ring [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-primary/20 [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-primary/20 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/50 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-accent [&::-webkit-slider-thumb]:focus-visible:ring-1 [&::-webkit-slider-thumb]:focus-visible:ring-ring",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
