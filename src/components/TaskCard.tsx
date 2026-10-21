import React, { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils";
import { type Todo } from "./Timeline";

interface TaskCardProps {
   todo: Todo & { isTask: boolean; startHours: number; durationHours: number; tier: number };
   isNewlyCreated: boolean;
   onMouseDown: (e: React.MouseEvent) => void;
   onClick: (e: React.MouseEvent) => void;
   onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
   onSetNewlyCreatedId: (id: string | null) => void;
   onEditClick?: (date: Date) => void;
   isDragging: boolean;
   onEditingChange?: (todoId: string, isEditing: boolean) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
   todo,
   isNewlyCreated,
   onMouseDown,
   onClick,
   onUpdateTodo,
   onSetNewlyCreatedId,
   onEditClick,
   isDragging,
   onEditingChange,
}) => {
   const [isEditing, setIsEditing] = useState(false);
   const clickStartRef = useRef<{ x: number; y: number } | null>(null);

   useEffect(() => {
      if (isNewlyCreated) {
         setIsEditing(true);
         onEditingChange?.(todo.id, true);
         onEditClick?.(todo.startTime); // Automatically zoom to the new task
      }
   }, [isNewlyCreated]);

   const handleSave = (newTitle: string) => {
      if (newTitle.trim() !== todo.title) {
         onUpdateTodo(todo.id, { title: newTitle });
      }
      setIsEditing(false);
      onEditingChange?.(todo.id, false);
      if (isNewlyCreated) {
         onSetNewlyCreatedId(null);
      }
   };

   return (
      <div
         id={`todo-${todo.id}`}
         onMouseDown={onMouseDown}
         onClick={onClick}
         className={cn(
            "todo-wrapper absolute group origin-left",
            isDragging ? "cursor-grabbing opacity-80" : "cursor-pointer",
            isEditing ? "z-50" : "",
         )}
         style={
            {
               "--start-hours": todo.startHours,
               "--tier": todo.tier,
               left: `calc(var(--zoom) * ${todo.startHours} * 1px)`,
               width: todo.isTask
                  ? `calc(max(var(--zoom) * 24 * 1px, 60px) - 15px)`
                  : `calc(max(var(--zoom) * ${todo.durationHours} * 1px, 60px) - 15px)`,
               top: `${(todo as any).tierPx != null ? (todo as any).tierPx : -12 - todo.tier * 48}px`,
               transform: "translateY(-100%)",
               willChange: "left, width, transform, height",
               transition: "top 0.2s ease-out, height 0.2s ease-out",
               height: isEditing ? "140px" : "36px",
            } as React.CSSProperties
         }>
         <div
            className={cn(
               "todo-block w-full h-full border bg-zinc-950/95 backdrop-blur-md rounded-lg flex pl-5 pr-3 shadow-lg",
               todo.completed ? "opacity-60 grayscale" : "",
               isEditing ? "flex-col pt-2 pb-3 gap-2" : "h-full items-center",
            )}
            style={{
               borderColor: todo.completed ? "#3F3F46" : todo.color || "#27272A",
               color: todo.completed ? "#71717A" : "#FAFAFA",
               backgroundColor: todo.completed ? "#09090B" : todo.color ? `${todo.color}11` : undefined,
            }}>
            <div className="todo-content flex flex-col w-full relative z-10">
               <div className="flex items-center gap-2 max-w-full">
                  {isEditing ? (
                     <input
                        autoFocus
                        className="w-full bg-transparent border-none text-xs font-bold focus:outline-none p-0 leading-tight focus:text-white"
                        defaultValue={todo.title}
                        onFocus={(e) => e.target.select()}
                        // Stop propagation on mousedown so we can select text without dragging the card
                        onMouseDown={(e) => e.stopPropagation()}
                        onBlur={(e) => handleSave(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === "Enter") {
                              e.currentTarget.blur();
                           }
                        }}
                     />
                  ) : (
                     <div
                        className={cn(
                           "todo-title font-bold text-xs select-none leading-tight truncate cursor-text w-full",
                           todo.completed ? "line-through opacity-70" : "",
                        )}
                        onMouseDown={(e) => {
                           clickStartRef.current = { x: e.clientX, y: e.clientY };
                           // Allow propagation so drag works
                        }}
                        onClick={(e) => {
                           // Heuristic: If mouse hasn't moved much, it's a click to edit.
                           // If it moved, it was a drag, so ignore.
                           if (clickStartRef.current) {
                              const dist = Math.hypot(e.clientX - clickStartRef.current.x, e.clientY - clickStartRef.current.y);
                              if (dist < 5) {
                                 e.stopPropagation();
                                 onEditClick?.(todo.startTime);
                                 setIsEditing(true);
                                 onEditingChange?.(todo.id, true);
                              }
                           }
                        }}>
                        {todo.title}
                     </div>
                  )}
               </div>

               {isEditing && (
                  <div className="flex flex-col gap-2 w-full mt-2">
                     <label className="text-xs text-zinc-500 font-semibold">Details</label>
                     <textarea
                        className="text-xs bg-zinc-950 border border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-zinc-500 text-zinc-300 resize-none"
                        rows={3}
                        defaultValue={todo.details || ""}
                        onMouseDown={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                           if (e.target.value !== (todo.details || "")) {
                              onUpdateTodo(todo.id, { details: e.target.value });
                           }
                        }}
                        placeholder="Add notes..."
                     />
                  </div>
               )}
            </div>
            {!isEditing && <div className="todo-underline absolute bottom-0 left-0 w-full h-[1px] opacity-20 bg-white z-0" />}
         </div>

         <div
            onMouseDown={(e) => {
               e.stopPropagation();
            }}
            onClick={(e) => {
               // In Small Mode (zoomed out far), we zoom in instead of checking off
               const el = document.querySelector(".timeline") as HTMLElement;
               const currentZoom = el ? parseFloat(el.style.getPropertyValue("--zoom")) : 15;

               if (currentZoom < 5) {
                  e.stopPropagation();
                  onEditClick?.(todo.startTime);
               } else {
                  e.stopPropagation();
                  onUpdateTodo(todo.id, { completed: !todo.completed });
               }
            }}
            className={cn(
               "todo-checkbox absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-none border-2 transition-all cursor-pointer box-border flex items-center justify-center",
            )}
            style={{
               width: "20px",
               height: "20px",
               minWidth: "20px",
               minHeight: "20px",
               borderRadius: "50%",
               backgroundColor: todo.completed ? todo.color || "#ffffff" : "#18181b",
               borderColor: todo.completed ? todo.color || "#ffffff" : todo.color || "#52525b",
               color: todo.completed ? "#09090b" : todo.color || "#fafafa",
            }}>
            {todo.completed && (
               <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 stroke-[#0a0a0a]"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M3 7.5L5.5 10L11 4" />
               </svg>
            )}
         </div>
      </div>
   );
};
