'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const spinnerVariants = cva('flex items-center justify-center animate-spin', {
  variants: {
    size: {
      default: 'h-8 w-8',
      sm: 'h-4 w-4',
      lg: 'h-12 w-12',
      icon: 'h-5 w-5',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

interface LoadingSpinnerProps
  extends React.HTMLAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

const LoadingSpinner = React.forwardRef<SVGSVGElement, LoadingSpinnerProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <Loader2
        className={cn(spinnerVariants({ size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = 'LoadingSpinner'

export { LoadingSpinner }
