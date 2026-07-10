import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Save, X, ToggleLeft, ToggleRight, Sparkles, AlertCircle } from 'lucide-react';
import { SystemConfig } from '../types';

interface WebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: SystemConfig) => void;
}

export default function WebhookSettingsModal({ isOpen, onClose, onSave }: WebhookSettingsModalProps) {
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [n8nAiAssistantUrl, setN8nAiAssistantUrl] = useState('');
  const [useMockAI, setUseMockAI] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => {
          setN8nWebhookUrl(data.n8nWebhookUrl || '');
          setN8nAiAssistantUrl(data.n8nAiAssistantUrl || '');
          setUseMockAI(data.useMockAI !== false);
        })
        .catch((err) => {
          console.error("Failed to load webhook configuration:", err);
          setErrorMessage("Failed to load server configuration.");
        });
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n8nWebhookUrl,
          n8nAiAssistantUrl,
          useMockAI
        })
      });

      if (!response.ok) throw new Error("Failed to update config");
      
      const data = await response.json();
      setSuccessMessage("n8n Webhook configuration updated successfully!");
      if (onSave) {
        onSave(data.config);
      }
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      setErrorMessage("Error saving configuration to server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="webhook-settings-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)]"
          >
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-emerald-400 animate-spin-slow" />
                <h3 className="font-sans font-bold text-base text-white tracking-wide">Nexus AI Integration Center</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Info panel */}
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4 flex items-start space-x-3 text-xs text-emerald-300">
                <Sparkles className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-emerald-200">Abstracted Webhook Routing:</span> The Nexus platform maps AI assistant commands, alert triggers, and logistics flow directly to your **n8n.io** triggers. When disabled or empty, a powerful local simulated engine takes over.
                </div>
              </div>

              {/* Webhook URLs Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                    n8n Dispatch Orchestration Webhook
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://primary-n8n.yourdomain.com/webhook/..."
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/35 text-sm text-white font-mono placeholder:text-slate-600 transition-all outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Triggers workflow automation when matches are scheduled or published.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                    n8n AI Command Assistant Webhook
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://ai-n8n.yourdomain.com/webhook-ai/..."
                    value={n8nAiAssistantUrl}
                    onChange={(e) => setN8nAiAssistantUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/35 text-sm text-white font-mono placeholder:text-slate-600 transition-all outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Handles command requests inside the Nexus AI Command Center chat module.
                  </p>
                </div>
              </div>

              {/* Mock fallback toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-xs font-semibold text-white">Rule-based Telemetry Fallback</span>
                  <span className="text-[10px] text-slate-500">Enable local simulated intelligence if n8n is offline or unconfigured.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseMockAI(!useMockAI)}
                  className="text-emerald-400 focus:outline-none transition-transform active:scale-95"
                >
                  {useMockAI ? (
                    <ToggleRight className="h-9 w-9 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-9 w-9 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Message displays */}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-400 font-medium flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-sans text-xs font-bold tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-sans text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{isLoading ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
