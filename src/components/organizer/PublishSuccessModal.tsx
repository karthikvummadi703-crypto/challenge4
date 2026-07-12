/**
 * Publish-success confirmation modal shown after an organizer publishes an event.
 *
 * Displays a checklist of what was activated (AI assistant, volunteer roster,
 * fan portal) and a "Go to Dashboard" button that calls `onClose`. The dialog
 * is hidden (`visible=false`) until the organizer completes the publish action.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface PublishSuccessModalProps {
  visible: boolean;
  volunteerCount: number;
  onClose: () => void;
}

export default function PublishSuccessModal({ visible, volunteerCount, onClose }: PublishSuccessModalProps) {
  const modalRef = useModalA11y<HTMLDivElement>(visible, onClose);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="gpu-blur-layer absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-success-title"
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="gpu-blur-foreground w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
          >
            <div className="h-16 w-16 bg-emerald-400 text-black rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h3 id="publish-success-title" className="font-sans font-black text-2xl text-white uppercase tracking-wider">Event Published Successfully!</h3>
              <p className="text-xs text-slate-400">The stadium intelligence nodes are fully synchronized.</p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl text-left border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Portugal vs Argentina match is now live for fans.</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>All volunteer accounts ({volunteerCount}) are now ACTIVE.</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Ticket bookings are active on all public portals.</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-sm uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              Go to Dashboard
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
