"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Control, FieldPath, FieldValues } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface PasswordInputProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function PasswordInput<T extends FieldValues>({
  control,
  name,
  label = "Password",
  placeholder = "Enter password",
  disabled,
}: PasswordInputProps<T>) {
  const [show, setShow] = useState(false)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-[13px] font-medium text-foreground/80 tracking-wide">
            {label}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                placeholder={placeholder}
                disabled={disabled}
                className="pr-12"
                {...field}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow((v) => !v)}
                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors duration-150 focus:outline-none"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show
                  ? <EyeOff className="h-[18px] w-[18px]" />
                  : <Eye className="h-[18px] w-[18px]" />
                }
              </button>
            </div>
          </FormControl>
          <FormMessage className="text-[12px] font-medium" />
        </FormItem>
      )}
    />
  )
}
