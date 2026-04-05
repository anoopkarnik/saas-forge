"use client"
import { LucideIcon } from 'lucide-react';
import React from 'react'
import { DialogHeader, DialogTitle } from '../shadcn/dialog';
import { cn } from '@workspace/ui/lib/utils';
import { Separator } from '../shadcn/separator';

export interface CustomDialogHeaderProps {
    title?: string;
    subTitle?: string;
    icon?: LucideIcon;

    titleClassName?: string;
    subTitleClassName?: string;
    iconClassName?: string;
}

const CustomDialogHeader = (props:CustomDialogHeaderProps) => {
  return (
    <DialogHeader className='py-6'>
        <DialogTitle asChild>
            <div className='flex flex-col items-center gap-2 mb-2'>
                {props.icon && 
                    <props.icon size={30} className={cn('stroke-primary', props.iconClassName)}/>}
                {props.title &&
                    <div className={cn("text-xl text-primary  ", props.titleClassName)}>{props.title}</div>}
                {props.subTitle &&
                    <div className={cn("text-sm text-muted-foreground ", props.subTitleClassName)}>{props.subTitle}</div>}
            </div>
        </DialogTitle>
        <Separator/>
    </DialogHeader>
  )
}

export default CustomDialogHeader