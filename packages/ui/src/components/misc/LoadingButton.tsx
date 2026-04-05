import React from 'react'
import { Button } from '../shadcn/button'
import { cn } from '../../lib/utils'
import { ButtonProps } from '../shadcn/button';

interface LoadingButtonProps {
  pending: boolean;
  children: React.ReactNode;
  variant?: ButtonProps['variant'];
  className?: string;
  disabled?: boolean;
}

const LoadingButton = ({ variant, pending, children, className, ...props }: LoadingButtonProps) => {
  return (
    <Button
      variant={variant}
      disabled={pending || props.disabled}
      type="submit"
      className={cn('w-full', className)}
      {...props}
    >
      {pending ? (
        <div className='flex items-center justify-center'>
          <svg
            className="animate-spin h-5 w-5 mr-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (children)}
    </Button>
  )
}

export default LoadingButton