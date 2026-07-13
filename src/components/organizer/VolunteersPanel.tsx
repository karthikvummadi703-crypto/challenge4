/**
 * Organizer dashboard volunteers panel.
 *
 * Left column: a form for adding new volunteers (name, email, gate, password).
 * Right column: a table listing all registered volunteers with their IDs,
 * status badges, and delete buttons. Also contains the "Publish Event" button.
 * All state is managed by `OrganizerDashboard`.
 */
import React from 'react';
import { Trash2, Loader2, Rocket, Copy } from 'lucide-react';
import { Volunteer } from '../../types';

interface VolunteersPanelProps {
  volunteersList: Volunteer[];
  newVolunteerName: string;
  setNewVolunteerName: (v: string) => void;
  newVolunteerEmail: string;
  setNewVolunteerEmail: (v: string) => void;
  newVolunteerPassword: string;
  setNewVolunteerPassword: (v: string) => void;
  newVolunteerGate: string;
  setNewVolunteerGate: (v: string) => void;
  passwordAcknowledged: boolean;
  setPasswordAcknowledged: (v: boolean) => void;
  isCreatingVolunteer: boolean;
  isPublished: boolean;
  onAddVolunteer: (e: React.FormEvent) => void;
  onRemoveVolunteer: (id: string) => void;
  onPublishEvent: () => void;
}

export default function VolunteersPanel({
  volunteersList,
  newVolunteerName, setNewVolunteerName,
  newVolunteerEmail, setNewVolunteerEmail,
  newVolunteerPassword,
  newVolunteerGate, setNewVolunteerGate,
  passwordAcknowledged, setPasswordAcknowledged,
  isCreatingVolunteer, isPublished, onAddVolunteer, onRemoveVolunteer, onPublishEvent,
}: VolunteersPanelProps) {
  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newVolunteerPassword);
    } catch {
      // Clipboard API can be unavailable (e.g. non-secure context) — copy is
      // a convenience, not a requirement, so failing silently here is safe.
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Logistics Dispatch</span>
          <h2 className="text-2xl font-black text-white tracking-wide uppercase">Volunteer Coordination</h2>
          <p className="text-xs text-slate-500">Register new volunteers dynamically and dispatch them instantly</p>
        </div>
        <button
          onClick={onPublishEvent}
          disabled={isPublished}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-700 text-black font-sans font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0"
        >
          <Rocket className="h-4 w-4" aria-hidden="true" />
          <span>{isPublished ? 'Event is Live' : 'Publish Event'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Volunteer Form */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 h-fit">
          <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2">Add Volunteer</h3>

          <form onSubmit={onAddVolunteer} className="space-y-4">
            <div>
              <label htmlFor="vol-new-name" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Full Name</label>
              <input id="vol-new-name" type="text" required placeholder="e.g. Karthik"
                value={newVolunteerName} onChange={(e) => setNewVolunteerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div>
              <label htmlFor="vol-new-email" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Email Address</label>
              <input id="vol-new-email" type="email" required placeholder="e.g. karthik@nexusai.com"
                value={newVolunteerEmail} onChange={(e) => setNewVolunteerEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div>
              <label htmlFor="vol-new-gate" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Assigned Gate</label>
              <select id="vol-new-gate" value={newVolunteerGate} onChange={(e) => setNewVolunteerGate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none transition-all">
                <option value="Gate A">Gate A</option>
                <option value="Gate B">Gate B</option>
                <option value="Gate C">Gate C</option>
                <option value="Gate D">Gate D</option>
              </select>
            </div>

            <div>
              <label htmlFor="vol-new-password" className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Auto-Generated Password</label>
              <div className="flex items-center gap-2">
                <input id="vol-new-password" type="text" readOnly value={newVolunteerPassword}
                  aria-describedby="vol-new-password-hint"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 outline-none" />
                <button type="button" onClick={handleCopyPassword} aria-label="Copy generated password to clipboard"
                  className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer shrink-0">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p id="vol-new-password-hint" className="text-[10px] text-slate-500 mt-1.5">
                Securely share this password with the volunteer — it won't be shown again after registration.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <input id="vol-password-ack" type="checkbox" checked={passwordAcknowledged}
                onChange={(e) => setPasswordAcknowledged(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
              <label htmlFor="vol-password-ack" className="text-[10px] text-slate-400 leading-snug cursor-pointer">
                I have copied this password and will share it securely with the volunteer.
              </label>
            </div>

            <button type="submit" disabled={isCreatingVolunteer || !passwordAcknowledged}
              className="w-full py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 disabled:bg-slate-900 text-emerald-400 disabled:text-emerald-800 font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2">
              {isCreatingVolunteer ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>Registering...</span></>
              ) : (
                <span>+ Register Volunteer</span>
              )}
            </button>
          </form>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 text-[10px] text-slate-500 space-y-1">
            <p className="font-mono text-emerald-400 font-bold uppercase">Security Guard Note:</p>
            <p>Nexus automatically hashes volunteer ID tokens (e.g. VOL-4821) as secure entrance credentials to unlock terminal devices.</p>
          </div>
        </div>

        {/* Volunteer table */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-sans font-bold text-sm text-white uppercase">Security Enlist Table</h3>
            <span className="text-[10px] text-slate-400 font-semibold">{volunteersList.length} volunteers cataloged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                  <th scope="col" className="py-3 px-2">#</th>
                  <th scope="col" className="py-3 px-2">Volunteer Name</th>
                  <th scope="col" className="py-3 px-2">Unique Volunteer ID</th>
                  <th scope="col" className="py-3 px-2">Role Status</th>
                  <th scope="col" className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {volunteersList.map((vol, index) => (
                  <tr key={vol.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-2 text-slate-500 font-mono">{index + 1}</td>
                    <td className="py-3 px-2 font-bold text-white">{vol.name}</td>
                    <td className="py-3 px-2">
                      <span className="font-mono bg-slate-950 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-md text-[10px]">
                        {vol.volunteerId}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase ${vol.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {vol.status === 'active' ? 'Active' : 'Pending Publish'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => onRemoveVolunteer(vol.id)} aria-label={`Remove volunteer ${vol.name}`}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-all cursor-pointer">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {volunteersList.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-6">No volunteers added to the roster yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
