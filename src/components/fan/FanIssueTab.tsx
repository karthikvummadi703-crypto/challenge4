/**
 * Fan dashboard issue-reporting tab.
 *
 * Lets fans select a predefined category (Seat Occupancy, Harassment, etc.)
 * and add a free-text description before submitting. All state and handlers
 * are lifted to `FanDashboard`.
 */
import React from 'react';

const ISSUE_CATEGORIES = ['Seat Occupancy', 'Harassment', 'Broken Seat', 'Dirty Washroom', 'Other'] as const;

interface FanIssueTabProps {
  selectedIssueCategory: string;
  onSelectCategory: (cat: string) => void;
  issueDescription: string;
  onDescriptionChange: (v: string) => void;
  issueSuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function FanIssueTab({
  selectedIssueCategory, onSelectCategory,
  issueDescription, onDescriptionChange,
  issueSuccess, onSubmit,
}: FanIssueTabProps) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Compliance &amp; Comfort</span>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase">Log Stadium Issue</h2>
        <p className="text-xs text-slate-500">Report seating, washroom cleaning, or harassment issues</p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2">Issue Ticket details</h3>

        <div>
          <span id="issue-category-label" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Category</span>
          <div role="group" aria-labelledby="issue-category-label" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ISSUE_CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => onSelectCategory(cat)}
                className={`py-2 px-3 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                  selectedIssueCategory === cat
                    ? 'bg-emerald-500 text-black border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="issue-description" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Describe the Incident / Problem</label>
          <textarea id="issue-description" required rows={4} value={issueDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Provide precise details (e.g. Broken latch on seat, spill on steps, etc.)"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all resize-none" />
        </div>

        {issueSuccess && (
          <div role="status" aria-live="polite" className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center font-medium">
            Incident Report logged! Dispatching a volunteer.
          </div>
        )}

        <button type="submit"
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md">
          Submit Incident Pass
        </button>
      </form>
    </div>
  );
}
