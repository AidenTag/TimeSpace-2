import React, { useState } from "react";
import { cn } from "../lib/utils";
import { GoalCard, type Goal } from "./GoalCard";
import { type Category } from "./Timeline";

interface GoalTrackerProps {
   goals: Goal[];
   onUpdateGoal: (id: string, updates: Partial<Goal>) => void;
   onAddGoal: (goal: Omit<Goal, "id">) => string;
   onDeleteGoal: (id: string) => void;
   categories: Category[];
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
   goals,
   onUpdateGoal,
   onAddGoal,
   onDeleteGoal,
   categories,
}) => {
   const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
   const [filterCategory, setFilterCategory] = useState<string | null>(null);
   const [showCompleted, setShowCompleted] = useState(true);

   const handleAdd = (color: string) => {
      const newId = onAddGoal({
         title: "New Goal",
         description: "",
         progress: 0,
         color,
         milestones: [],
         completed: false,
         createdAt: new Date(),
         order: goals.length,
      });
      setNewlyCreatedId(newId);
   };

   // Filter and sort
   const filteredGoals = goals
      .filter((g) => {
         if (!showCompleted && g.completed) return false;
         if (filterCategory && g.color !== filterCategory) return false;
         return true;
      })
      .sort((a, b) => {
         // Active goals first, then by order
         if (a.completed !== b.completed) return a.completed ? 1 : -1;
         return a.order - b.order;
      });

   const activeCount = goals.filter((g) => !g.completed).length;
   const completedCount = goals.filter((g) => g.completed).length;
   const overallProgress =
      goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;

   return (
      <div className="w-full bg-[#0a0a0a] text-white rounded-2xl border border-zinc-900 overflow-hidden relative shadow-2xl flex flex-col">
         {/* Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-100 opacity-50">Goals</h2>
               </div>

               {/* Stats pills */}
               {goals.length > 0 && (
                  <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{activeCount} active</span>
                     </div>
                     {completedCount > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                           <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                              {completedCount} done
                           </span>
                        </div>
                     )}
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50">
                        <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{overallProgress}% avg</span>
                     </div>
                  </div>
               )}
            </div>

            <div className="flex items-center gap-3">
               {/* Show/hide completed toggle */}
               {completedCount > 0 && (
                  <button
                     onClick={() => setShowCompleted(!showCompleted)}
                     className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors px-2.5 py-1.5 rounded-lg",
                        showCompleted
                           ? "text-zinc-500 hover:text-zinc-300"
                           : "text-zinc-600 bg-zinc-800/50 hover:text-zinc-400",
                     )}>
                     {showCompleted ? "Hide Done" : "Show Done"}
                  </button>
               )}

               {/* Category filter pills */}
               <div className="flex items-center gap-1.5">
                  {categories.map((cat) => (
                     <button
                        key={cat.label}
                        onClick={() => setFilterCategory(filterCategory === cat.color ? null : cat.color)}
                        className={cn(
                           "w-5 h-5 rounded-full border-2 transition-all hover:scale-110",
                           filterCategory === cat.color
                              ? "border-white scale-110"
                              : "border-transparent opacity-60 hover:opacity-100",
                        )}
                        style={{ backgroundColor: cat.color }}
                        title={`Filter: ${cat.label}`}
                     />
                  ))}
               </div>

               {/* Add goal button */}
               <div className="relative group/add">
                  <button
                     className="px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all text-xs font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M12 5v14M5 12h14" />
                     </svg>
                     Add Goal
                  </button>

                  {/* Dropdown with category colors */}
                  <div className="absolute right-0 top-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/add:opacity-100 group-hover/add:visible transition-all z-50 min-w-[160px]">
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Select Color</p>
                     <div className="flex flex-col gap-1">
                        {categories.map((cat) => (
                           <button
                              key={cat.label}
                              onClick={() => handleAdd(cat.color)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-left">
                              <div
                                 className="w-3 h-3 rounded-full flex-none"
                                 style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-xs font-medium text-zinc-300">{cat.label}</span>
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Overall progress bar */}
         {goals.length > 0 && (
            <div className="h-[2px] bg-zinc-900 relative">
               <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                  style={{
                     width: `${overallProgress}%`,
                     background: `linear-gradient(90deg, #3B82F6, #10B981)`,
                  }}
               />
            </div>
         )}

         {/* Goal list */}
         <div className="flex-1 p-4 flex flex-col gap-3 min-h-[200px]">
            {filteredGoals.length > 0 ? (
               filteredGoals.map((goal) => (
                  <GoalCard
                     key={goal.id}
                     goal={goal}
                     onUpdate={onUpdateGoal}
                     onDelete={onDeleteGoal}
                     isNewlyCreated={newlyCreatedId === goal.id}
                     onClearNewlyCreated={() => setNewlyCreatedId(null)}
                  />
               ))
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4 select-none">
                  {/* Empty state */}
                  <div className="relative">
                     <svg
                        width="64"
                        height="64"
                        viewBox="0 0 64 64"
                        fill="none"
                        className="text-zinc-800 opacity-60">
                        {/* Target/bullseye icon */}
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="32" cy="32" r="2" fill="currentColor" />
                     </svg>
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-30" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                     <p className="text-sm font-bold text-zinc-600">
                        {filterCategory ? "No goals in this category" : "No goals yet"}
                     </p>
                     <p className="text-[10px] text-zinc-700">
                        {filterCategory
                           ? "Clear the filter or add a goal with this color"
                           : "Click \"Add Goal\" to start tracking your progress"}
                     </p>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};
