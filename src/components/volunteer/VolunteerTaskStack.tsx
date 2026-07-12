import React from 'react';
import { Navigation } from 'lucide-react';
import { Task } from '../../types';

interface VolunteerTaskStackProps {
  myAssignedTasks: Task[];
  otherTasks: Task[];
  onHighlightSeat: (seat: string) => void;
  onAcceptTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export default function VolunteerTaskStack({
  myAssignedTasks, otherTasks, onHighlightSeat, onAcceptTask, onCompleteTask,
}: VolunteerTaskStackProps) {
  return (
    <div className="space-y-6 flex flex-col justify-start">
      {/* Active assigned task */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">My Active Task</h3>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">SLA In-Progress</span>
        </div>

        {myAssignedTasks.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl text-center text-xs text-slate-500">
            You do not have any active assignments. Select a task below to dispatch.
          </div>
        ) : (
          <div className="space-y-3">
            {myAssignedTasks.map((task) => (
              <div key={task.id} className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 space-y-4 relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${task.type === 'Medical Emergency' ? 'text-red-400' : 'text-emerald-400'}`}>{task.type}</span>
                    <h4 className="font-bold text-base text-white mt-0.5">{task.details}</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-black ${task.priority === 'High' ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-300'}`}>
                    {task.priority} Priority
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold uppercase block">Delivery Seat</span>
                    <strong className="text-white text-sm font-mono">{task.seatNumber}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase block">Route Assist</span>
                    <button onClick={() => onHighlightSeat(task.seatNumber)}
                      className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center justify-end space-x-1 ml-auto cursor-pointer">
                      <Navigation className="h-3 w-3" />
                      <span>Show on map</span>
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button onClick={() => onCompleteTask(task.id)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md">
                    Complete Assignment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending task stack */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
          <h3 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider">Live Task Stack</h3>
          <span className="text-[10px] font-mono text-slate-500 font-bold">{otherTasks.length} pending queues</span>
        </div>

        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {otherTasks.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-600">
              Stadium operations are fully optimized. No pending alerts in stack.
            </div>
          ) : (
            otherTasks.map((task) => (
              <div key={task.id} role="button" tabIndex={0}
                aria-label={`Highlight seat ${task.seatNumber} on the stadium map for ${task.type} task: ${task.details}`}
                onClick={() => onHighlightSeat(task.seatNumber)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHighlightSeat(task.seatNumber); }
                }}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2 w-2 rounded-full ${task.type === 'Medical Emergency' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">{task.type}</span>
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{task.details}</h4>
                  <p className="text-[10px] font-mono text-slate-500">Seat location: <strong className="text-white">{task.seatNumber}</strong></p>
                </div>

                <div className="flex flex-col items-end space-y-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase font-bold ${task.priority === 'High' ? 'bg-red-950/40 text-red-400' : 'bg-slate-950 text-slate-400'}`}>
                    {task.priority}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); onAcceptTask(task.id); }}
                    disabled={myAssignedTasks.length > 0}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-400 hover:text-black font-sans font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-emerald-400 cursor-pointer">
                    Accept
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
