import React, { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils";
import { format, differenceInDays } from "date-fns";

export interface Milestone {
   id: string;
   title: string;
   completed: boolean;
}

export interface Goal {
   id: string;
   title: string;
   description?: string;
   progress: number; // 0–100
   color: string;
   dueDate?: Date;
   milestones: Milestone[];
   completed: boolean;
   createdAt: Date;
   order: number;
   isQuantitative?: boolean;
   targetQuantity?: number;
   currentQuantity?: number;
}

interface GoalCardProps {
   goal: Goal;
   onUpdate: (id: string, updates: Partial<Goal>) => void;
   onDelete: (id: string) => void;
   isNewlyCreated: boolean;
   onClearNewlyCreated: () => void;
}

const detectQuantity = (text: string): number | null => {
   // Find all numbers in the text
   const matches = text.match(/\b\d+\b/g);
   if (!matches) return null;

   // Try to find the first number that doesn't look like a year (1990 - 2099)
   for (const match of matches) {
      const num = parseInt(match, 10);
      if (num < 1990 || num > 2099) {
         return num;
      }
   }

   // Fallback to the first number found if all look like years
   return parseInt(matches[0], 10);
};

export const GoalCard: React.FC<GoalCardProps> = ({
   goal,
   onUpdate,
   onDelete,
   isNewlyCreated,
   onClearNewlyCreated,
}) => {
   const [isExpanded, setIsExpanded] = useState(false);
   const [isEditingTitle, setIsEditingTitle] = useState(false);
   const [isEditingDesc, setIsEditingDesc] = useState(false);
   const [showMilestoneInput, setShowMilestoneInput] = useState(false);
   const milestoneInputRef = useRef<HTMLInputElement>(null);
   const titleInputRef = useRef<HTMLInputElement>(null);

   // Quantitative derived state
   const isQuantitative = !!goal.isQuantitative;
   const targetQuantity = goal.targetQuantity ?? 10;
   const currentQuantity = goal.currentQuantity ?? 0;

   const displayProgress = isQuantitative
      ? Math.min(100, Math.max(0, Math.round((currentQuantity / targetQuantity) * 100)))
      : goal.progress;

   // Auto-expand and edit newly created goals
   useEffect(() => {
      if (isNewlyCreated) {
         setIsExpanded(true);
         setIsEditingTitle(true);
         onClearNewlyCreated();
      }
   }, [isNewlyCreated]);

   useEffect(() => {
      if (isEditingTitle && titleInputRef.current) {
         titleInputRef.current.focus();
         titleInputRef.current.select();
      }
   }, [isEditingTitle]);

   useEffect(() => {
      if (showMilestoneInput && milestoneInputRef.current) {
         milestoneInputRef.current.focus();
      }
   }, [showMilestoneInput]);

   // Auto-calculate progress from milestones when milestones change
   useEffect(() => {
      if (!isQuantitative && goal.milestones.length > 0) {
         const completedCount = goal.milestones.filter((m) => m.completed).length;
         const newProgress = Math.round((completedCount / goal.milestones.length) * 100);
         if (newProgress !== goal.progress) {
            onUpdate(goal.id, {
               progress: newProgress,
               completed: newProgress === 100,
            });
         }
      }
   }, [goal.milestones, isQuantitative]);

   // Progress ring calculations
   const RING_SIZE = 52;
   const STROKE_WIDTH = 4;
   const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
   const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
   const strokeDashoffset = CIRCUMFERENCE - (displayProgress / 100) * CIRCUMFERENCE;

   // Due date urgency
   const getUrgency = () => {
      if (!goal.dueDate) return "none";
      if (goal.completed) return "done";
      const daysLeft = differenceInDays(goal.dueDate, new Date());
      if (daysLeft < 0) return "overdue";
      if (daysLeft <= 3) return "urgent";
      if (daysLeft <= 7) return "soon";
      return "none";
   };

   const urgency = getUrgency();

   const urgencyStyles: Record<string, string> = {
      overdue: "text-red-400 goal-urgency-glow-red",
      urgent: "text-amber-400 goal-urgency-glow-amber",
      soon: "text-yellow-500/80",
      done: "text-emerald-400",
      none: "text-zinc-500",
   };

   const handleSaveTitle = (value: string) => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== goal.title) {
         const updates: Partial<Goal> = { title: trimmed };
         const detected = detectQuantity(trimmed);

         if (detected !== null) {
            updates.isQuantitative = true;
            updates.targetQuantity = detected;
            if (!isQuantitative) {
               updates.currentQuantity = 0;
               updates.progress = 0;
               updates.completed = false;
            } else {
               const curr = Math.min(detected, currentQuantity);
               const newProgress = Math.round((curr / detected) * 100);
               updates.currentQuantity = curr;
               updates.progress = newProgress;
               updates.completed = newProgress === 100;
            }
         }

         onUpdate(goal.id, updates);
      }
      setIsEditingTitle(false);
   };

   const handleAddMilestone = (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const newMilestone: Milestone = {
         id: Math.random().toString(36).substr(2, 9),
         title: trimmed,
         completed: false,
      };
      onUpdate(goal.id, { milestones: [...goal.milestones, newMilestone] });
      setShowMilestoneInput(false);
   };

   const toggleMilestone = (milestoneId: string) => {
      const updated = goal.milestones.map((m) =>
         m.id === milestoneId ? { ...m, completed: !m.completed } : m,
      );
      onUpdate(goal.id, { milestones: updated });
   };

   const deleteMilestone = (milestoneId: string) => {
      const updated = goal.milestones.filter((m) => m.id !== milestoneId);
      onUpdate(goal.id, { milestones: updated });
   };

   const handleProgressChange = (newProgress: number) => {
      onUpdate(goal.id, {
         progress: newProgress,
         completed: newProgress === 100,
      });
   };

   const handleQuantityProgressChange = (newQty: number) => {
      const nextProgress = Math.round((newQty / targetQuantity) * 100);
      onUpdate(goal.id, {
         currentQuantity: newQty,
         progress: nextProgress,
         completed: nextProgress === 100,
      });
   };

   return (
      <div
         className={cn(
            "goal-card group relative border rounded-2xl transition-all duration-300 overflow-hidden",
            goal.completed
               ? "border-zinc-800/60 bg-zinc-950/40 opacity-70"
               : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60",
            isExpanded && "goal-card-expanded",
         )}
         style={{
            borderColor: goal.completed ? undefined : `${goal.color}30`,
            boxShadow: goal.completed ? undefined : `0 0 40px ${goal.color}08`,
         }}>
         {/* Collapsed header — always visible */}
         <div
            className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
            onClick={() => setIsExpanded(!isExpanded)}>
            {/* Progress Ring */}
            <div className="relative flex-none">
               <svg
                  width={RING_SIZE}
                  height={RING_SIZE}
                  className="progress-ring -rotate-90"
                  viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                  {/* Track */}
                  <circle
                     cx={RING_SIZE / 2}
                     cy={RING_SIZE / 2}
                     r={RADIUS}
                     fill="none"
                     stroke="#27272a"
                     strokeWidth={STROKE_WIDTH}
                  />
                  {/* Fill */}
                  <circle
                     cx={RING_SIZE / 2}
                     cy={RING_SIZE / 2}
                     r={RADIUS}
                     fill="none"
                     stroke={goal.completed ? "#10B981" : goal.color}
                     strokeWidth={STROKE_WIDTH}
                     strokeLinecap="round"
                     strokeDasharray={CIRCUMFERENCE}
                     strokeDashoffset={strokeDashoffset}
                     className="progress-ring-circle"
                  />
               </svg>
               <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums"
                  style={{ color: goal.completed ? "#10B981" : goal.color }}>
                  {displayProgress}%
               </span>
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
               {isEditingTitle ? (
                  <input
                     ref={titleInputRef}
                     className="w-full bg-transparent border-none text-sm font-bold text-white focus:outline-none p-0 leading-tight"
                     defaultValue={goal.title}
                     onMouseDown={(e) => e.stopPropagation()}
                     onClick={(e) => e.stopPropagation()}
                     onBlur={(e) => handleSaveTitle(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                           e.currentTarget.value = goal.title;
                           e.currentTarget.blur();
                        }
                     }}
                  />
               ) : (
                  <h3
                     className={cn(
                        "text-sm font-bold truncate cursor-text",
                        goal.completed ? "line-through text-zinc-500" : "text-zinc-100",
                     )}
                     onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingTitle(true);
                     }}>
                     {goal.title}
                  </h3>
               )}

               <div className="flex items-center gap-3 mt-1">
                  {isQuantitative ? (
                     <span className="text-[10px] text-zinc-400 font-bold">
                        {currentQuantity} / {targetQuantity}
                     </span>
                  ) : (
                     goal.milestones.length > 0 && (
                        <span className="text-[10px] text-zinc-500 font-medium">
                           {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length} milestones
                        </span>
                     )
                  )}
                  {goal.dueDate && (
                     <span className={cn("text-[10px] font-semibold", urgencyStyles[urgency])}>
                        {urgency === "overdue"
                           ? `${Math.abs(differenceInDays(goal.dueDate, new Date()))}d overdue`
                           : urgency === "done"
                              ? "Complete"
                              : format(goal.dueDate, "MMM d")}
                     </span>
                  )}
               </div>
            </div>

            {/* Category dot */}
            <div
               className="w-2.5 h-2.5 rounded-full flex-none opacity-80"
               style={{ backgroundColor: goal.color }}
            />

            {/* Expand chevron */}
            <svg
               width="16"
               height="16"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2.5"
               strokeLinecap="round"
               strokeLinejoin="round"
               className={cn(
                  "text-zinc-600 transition-transform duration-300 flex-none",
                  isExpanded && "rotate-180",
               )}>
               <path d="M6 9l6 6 6-6" />
            </svg>
         </div>

         {/* Expanded section */}
         <div
            className={cn(
               "goal-card-body transition-all duration-300 overflow-hidden",
               isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0",
            )}>
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-zinc-800/50 pt-4">
               {/* Description and Quantitative configuration row*/}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Description */}
                  <div className="flex flex-col">
                     <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5 block">
                        Description
                     </label>
                     {isEditingDesc ? (
                        <textarea
                           autoFocus
                           className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 resize-none h-full min-h-[60px]"
                           rows={2}
                           defaultValue={goal.description || ""}
                           onMouseDown={(e) => e.stopPropagation()}
                           onBlur={(e) => {
                              const val = e.target.value;
                              const updates: Partial<Goal> = { description: val };

                              // Try auto-detecting quantity if not already quantitative
                              const detected = detectQuantity(val);
                              if (detected !== null) {
                                 updates.isQuantitative = true;
                                 updates.targetQuantity = detected;
                                 if (!isQuantitative) {
                                    updates.currentQuantity = 0;
                                    updates.progress = 0;
                                    updates.completed = false;
                                 } else {
                                    const curr = Math.min(detected, currentQuantity);
                                    const newProgress = Math.round((curr / detected) * 100);
                                    updates.currentQuantity = curr;
                                    updates.progress = newProgress;
                                    updates.completed = newProgress === 100;
                                 }
                              }

                              onUpdate(goal.id, updates);
                              setIsEditingDesc(false);
                           }}
                           onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                 (e.target as HTMLTextAreaElement).value = goal.description || "";
                                 (e.target as HTMLTextAreaElement).blur();
                              }
                           }}
                           placeholder="What's this goal about?"
                        />
                     ) : (
                        <p
                           className="text-xs text-zinc-400 cursor-text min-h-[60px] hover:text-zinc-300 transition-colors p-2 bg-zinc-900/10 border border-transparent rounded-lg"
                           onClick={() => setIsEditingDesc(true)}>
                           {goal.description || "Click to add a description..."}
                        </p>
                     )}
                  </div>
                  {/* Right Column: Goal Mode selection & configurations */}
                  <div className="flex flex-col gap-2.5 p-3 bg-zinc-900/10 border border-zinc-800/40 rounded-xl justify-center">
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                           Goal Mode
                        </label>
                        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80 w-full text-[10px]">
                           <button
                              onClick={() => {
                                 onUpdate(goal.id, {
                                    isQuantitative: false,
                                 });
                              }}
                              className={cn(
                                 "flex-1 py-1 font-black rounded transition-all text-center uppercase tracking-wider cursor-pointer",
                                 !isQuantitative
                                    ? "bg-zinc-800 text-zinc-200"
                                    : "text-zinc-500 hover:text-zinc-300"
                              )}>
                              Checklist
                           </button>
                           <button
                              onClick={() => {
                                 onUpdate(goal.id, {
                                    isQuantitative: true,
                                    targetQuantity: goal.targetQuantity ?? 10,
                                    currentQuantity: goal.currentQuantity ?? 0,
                                    progress: Math.round(((goal.currentQuantity ?? 0) / (goal.targetQuantity ?? 10)) * 100),
                                 });
                              }}
                              className={cn(
                                 "flex-1 py-1 font-black rounded transition-all text-center uppercase tracking-wider cursor-pointer",
                                 isQuantitative
                                    ? "text-zinc-200"
                                    : "text-zinc-500 hover:text-zinc-300"
                              )}
                              style={
                                 isQuantitative
                                    ? {
                                       backgroundColor: `${goal.color}22`,
                                       color: goal.color,
                                       border: `1px solid ${goal.color}33`,
                                    }
                                    : {}
                              }>
                              Quantity
                           </button>
                        </div>
                     </div>

                     {isQuantitative && (
                        <div className="flex items-center justify-center gap-1.5 mt-0.5 bg-zinc-950/40 p-2 border border-zinc-900 rounded-lg">
                           <input
                              type="number"
                              min="0"
                              max={targetQuantity}
                              value={currentQuantity}
                              onChange={(e) => {
                                 const val = Math.min(targetQuantity, Math.max(0, parseInt(e.target.value, 10) || 0));
                                 handleQuantityProgressChange(val);
                              }}
                              className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-xs text-white w-14 font-bold focus:outline-none focus:border-zinc-700 focus:bg-zinc-950"
                           />
                           <span className="text-zinc-600 text-xs font-semibold">/</span>
                           <input
                              type="number"
                              min="1"
                              value={targetQuantity}
                              onChange={(e) => {
                                 const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                 const curr = Math.min(val, currentQuantity);
                                 const nextProgress = Math.round((curr / val) * 100);
                                 onUpdate(goal.id, {
                                    targetQuantity: val,
                                    currentQuantity: curr,
                                    progress: nextProgress,
                                    completed: nextProgress === 100,
                                 });
                              }}
                              className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-xs text-white w-14 font-bold focus:outline-none focus:border-zinc-700 focus:bg-zinc-950"
                           />
                        </div>
                     )}
                  </div>
               </div>

               {/* Progress slider */}
               {isQuantitative ? (
                  <div>
                     <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                           Progress
                        </label>
                        <span
                           className="text-[10px] font-black tabular-nums"
                           style={{ color: goal.color }}>
                           {currentQuantity} / {targetQuantity} ({displayProgress}%)
                        </span>
                     </div>
                     <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                           className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                           style={{
                              width: `${displayProgress}%`,
                              background: `linear-gradient(90deg, ${goal.color}88, ${goal.color})`,
                           }}
                        />
                        <input
                           type="range"
                           min="0"
                           max={targetQuantity}
                           step="1"
                           value={currentQuantity}
                           onChange={(e) => handleQuantityProgressChange(parseInt(e.target.value, 10))}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                     </div>
                  </div>
               ) : (
                  goal.milestones.length === 0 && (
                     <div>
                        <div className="flex items-center justify-between mb-2">
                           <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                              Progress
                           </label>
                           <span
                              className="text-[10px] font-black tabular-nums"
                              style={{ color: goal.color }}>
                              {goal.progress}%
                           </span>
                        </div>
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                           <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                              style={{
                                 width: `${goal.progress}%`,
                                 background: `linear-gradient(90deg, ${goal.color}88, ${goal.color})`,
                              }}
                           />
                           <input
                              type="range"
                              min="0"
                              max="100"
                              value={goal.progress}
                              onChange={(e) => handleProgressChange(parseInt(e.target.value, 10))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           />
                        </div>
                     </div>
                  )
               )}

               {/* Due date */}
               <div>
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5 block">
                     Due Date
                  </label>
                  <input
                     type="date"
                     value={goal.dueDate ? format(goal.dueDate, "yyyy-MM-dd") : ""}
                     onChange={(e) => {
                        const val = e.target.value;
                        onUpdate(goal.id, {
                           dueDate: val ? new Date(val + "T23:59:59") : undefined,
                        });
                     }}
                     className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 w-full cursor-pointer [color-scheme:dark]"
                  />
               </div>

               {/* Milestones (Only for standard goals) */}
               {!isQuantitative && (
                  <div>
                     <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                           Milestones
                        </label>
                        <button
                           onClick={() => setShowMilestoneInput(true)}
                           className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M12 5v14M5 12h14" />
                           </svg>
                           Add
                        </button>
                     </div>

                     <div className="flex flex-col gap-1.5">
                        {goal.milestones.map((milestone) => (
                           <div
                              key={milestone.id}
                              className="flex items-center gap-2.5 group/ms py-1 px-1 rounded-lg hover:bg-zinc-800/30 transition-colors">
                              {/* Milestone checkbox */}
                              <button
                                 onClick={() => toggleMilestone(milestone.id)}
                                 className={cn(
                                    "w-4 h-4 rounded-[5px] border-2 flex-none flex items-center justify-center transition-all",
                                    milestone.completed
                                       ? "border-emerald-500 bg-emerald-500"
                                       : "border-zinc-600 hover:border-zinc-400",
                                 )}>
                                 {milestone.completed && (
                                    <svg
                                       viewBox="0 0 14 14"
                                       className="w-2.5 h-2.5 stroke-black"
                                       strokeWidth="3"
                                       strokeLinecap="round"
                                       strokeLinejoin="round"
                                       fill="none">
                                       <path d="M3 7.5L5.5 10L11 4" />
                                    </svg>
                                 )}
                              </button>
                              <span
                                 className={cn(
                                    "text-xs flex-1",
                                    milestone.completed
                                       ? "line-through text-zinc-600"
                                       : "text-zinc-300",
                                 )}>
                                 {milestone.title}
                              </span>
                              <button
                                 onClick={() => deleteMilestone(milestone.id)}
                                 className="opacity-0 group-hover/ms:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5">
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                 </svg>
                              </button>
                           </div>
                        ))}

                        {showMilestoneInput && (
                           <div className="flex items-center gap-2 mt-1">
                              <div className="w-4 h-4 rounded-[5px] border-2 border-zinc-700 flex-none" />
                              <input
                                 ref={milestoneInputRef}
                                 className="flex-1 bg-transparent border-none text-xs text-zinc-300 focus:outline-none placeholder:text-zinc-600"
                                 placeholder="Milestone name..."
                                 onBlur={(e) => {
                                    if (e.target.value.trim()) handleAddMilestone(e.target.value);
                                    setShowMilestoneInput(false);
                                 }}
                                 onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                       handleAddMilestone(e.currentTarget.value);
                                       e.currentTarget.value = "";
                                    }
                                    if (e.key === "Escape") setShowMilestoneInput(false);
                                 }}
                              />
                           </div>
                        )}

                        {goal.milestones.length === 0 && !showMilestoneInput && (
                           <p className="text-[10px] text-zinc-600 italic">No milestones yet</p>
                        )}
                     </div>
                  </div>
               )}

               {/* Actions */}
               <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                  <button
                     onClick={() => onDelete(goal.id)}
                     className="text-[10px] font-bold text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1.5">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6L18 20a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                     </svg>
                     Delete
                  </button>
                  <button
                     onClick={() =>
                        onUpdate(goal.id, {
                           completed: !goal.completed,
                           progress: goal.completed ? (isQuantitative ? Math.round((currentQuantity / targetQuantity) * 100) : goal.progress) : 100,
                           currentQuantity: goal.completed ? currentQuantity : (isQuantitative ? targetQuantity : undefined)
                        })
                     }
                     className={cn(
                        "text-[10px] font-bold transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                        goal.completed
                           ? "text-zinc-500 hover:text-zinc-300 bg-zinc-800/50"
                           : "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20",
                     )}>
                     {goal.completed ? (
                        <>
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0M9 12l2 2 4-4" />
                           </svg>
                           Reopen
                        </>
                     ) : (
                        <>
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5" />
                           </svg>
                           Mark Complete
                        </>
                     )}
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};
