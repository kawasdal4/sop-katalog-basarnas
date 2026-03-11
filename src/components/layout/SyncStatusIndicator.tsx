'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useConnectivity } from '@/hooks/useConnectivity';
import { syncService } from '@/lib/sync/syncService';
import { motion, AnimatePresence } from 'framer-motion';

export const SyncStatusIndicator = () => {
  const { isOnline } = useConnectivity();
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'processing' | 'error'>('synced');

  useEffect(() => {
    const checkQueue = async () => {
      try {
        const pendingCount = await syncService.getPendingCount();
        if (pendingCount > 0) {
          setSyncStatus('pending');
        } else {
          setSyncStatus('synced');
        }
      } catch (err) {
        console.error('Failed to check sync queue', err);
      }
    };

    checkQueue();
    
    const interval = setInterval(checkQueue, 10000);
    return () => clearInterval(interval);
  }, [isOnline]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300">
      <AnimatePresence mode="wait">
        {!isOnline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-amber-400"
          >
            <CloudOff className="w-4 h-4" />
            <span className="text-xs font-medium">Offline</span>
          </motion.div>
        ) : syncStatus === 'processing' ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-blue-400"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Syncing...</span>
          </motion.div>
        ) : syncStatus === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-red-400"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Sync Error</span>
          </motion.div>
        ) : syncStatus === 'pending' ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-amber-400"
          >
            <Cloud className="w-4 h-4" />
            <span className="text-xs font-medium">Pending Sync</span>
          </motion.div>
        ) : (
          <motion.div
            key="synced"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-emerald-400"
          >
            <Cloud className="w-4 h-4" />
            <span className="text-xs font-medium">Synced</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
