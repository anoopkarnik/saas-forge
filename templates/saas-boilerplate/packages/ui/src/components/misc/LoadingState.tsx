"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Props {
  title: string;
  description: string;
}

const LoadingState = ({ title, description }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border/50 shadow-2xl">
        {/* Animated Background Gradient Blob */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-y-6">
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-full blur-md"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-primary" />
            </motion.div>
          </div>

          <div className="flex flex-col gap-y-2 text-center max-w-[250px]">
            <motion.h6
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </motion.h6>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground leading-relaxed"
            >
              {description}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingState;