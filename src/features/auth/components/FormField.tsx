import { Control, FieldPath, FieldValues } from "react-hook-form"
import {
  FormControl,
  FormField as ShadFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  placeholder?: string
  type?: string
  disabled?: boolean
  prefix?: string
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  disabled,
  prefix,
}: FormFieldProps<T>) {
  return (
    <ShadFormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-[13px] font-medium text-foreground/80 tracking-wide">
            {label}
          </FormLabel>
          <FormControl>
            {prefix ? (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground font-medium select-none pointer-events-none">
                  {prefix}
                </span>
                <Input
                  type={type}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="pl-10"
                  {...field}
                />
              </div>
            ) : (
              <Input type={type} placeholder={placeholder} disabled={disabled} {...field} />
            )}
          </FormControl>
          <FormMessage className="text-[12px] font-medium" />
        </FormItem>
      )}
    />
  )
}
