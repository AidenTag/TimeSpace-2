import React, { useEffect, useRef, useState, useMemo } from "react";
import { format, startOfToday, addDays, differenceInMinutes, subDays, startOfDay, isFirstDayOfMonth, addMinutes } from "date-fns";
import { cn } from "../lib/utils";
import { ZoomDial } from "./ZoomDial";
import { TaskCard } from "./TaskCard";
import { CategoryModal } from "./CategoryModal";
import { EditModal } from "./EditModal";

export interface Todo {
   id: string;
   title: string;
   startTime: Date;
   endTime?: Date;
   color?: string;
   completed?: boolean;
   details?: string;
   order?: number; // Simplified order index within its day stack (0 = Bottom, increases UP)
}

interface TimelineProps {
   todos: Todo[];
   onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
   onAddTodo?: (todo: Omit<Todo, "id">) => string;
   onDeleteTodo?: (id: string) => void;
   categories?: Category[];
   onUpdateCategories?: (categories: Category[]) => void;
}

export interface Category {
   label: string;
   color: string;
}

const DEFAULT_CATEGORIES: Category[] = [
   { label: "Work", color: "#3B82F6" },
   { label: "Life", color: "#10B981" },
   { label: "Urgent", color: "#F43F5E" },
   { label: "Study", color: "#F59E0B" },
   { label: "Other", color: "#71717A" },
];

const TOTAL_DAYS = 365;
const ANCHOR_DATE = subDays(startOfDay(startOfToday()), 60);
const TOTAL_HOURS = TOTAL_DAYS * 24;

export const DAY_ZOOM = Math.exp((Math.round(((Math.log(15) - Math.log(0.5)) * 20) / 6) * 6) / 20 + Math.log(0.5));

export const Timeline: React.FC<TimelineProps> = ({
   todos,
   onUpdateTodo,
   onAddTodo,
   onDeleteTodo,
   categories = DEFAULT_CATEGORIES,
   onUpdateCategories,
}) => {
   const containerRef = useRef<HTMLDivElement>(null);
   const [zoom, setZoom] = useState(15);
   const zoomRef = useRef(15);

   // Sync state for components that need heavy re-renders (like the Dial)
   // We use this to throttle React's state updates while keeping the ref fresh for calculations.
   const [visualZoom, setVisualZoom] = useState(15);
   const lastUpdateRef = useRef(0);

   const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
   const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);

   // Extra height (in px) an expanded card adds beyond the normal 48px slot
   const EXPANDED_EXTRA_HEIGHT = 116; // 140px expanded - 36px normal + 12px gap = 116px extra offset

   const zoomToDate = (targetDate: Date, targetZoom: number) => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const rect = el.getBoundingClientRect();
      const centerX = rect.width / 2;

      const startZoom = zoomRef.current;
      const startScroll = el.scrollLeft;
      const startTime = performance.now();
      const duration = 750; // Cinematic duration

      // The logical "anchor" point in hours that we want to stabilize
      const targetHours = differenceInMinutes(targetDate, ANCHOR_DATE) / 60;

      const animate = (currentTime: number) => {
         const elapsed = currentTime - startTime;
         const progress = Math.min(elapsed / duration, 1);

         // Premium Quintic Ease Out
         const ease = 1 - Math.pow(1 - progress, 5);

         // 1. Calculate the Zoom for this frame (log-linear)
         const logStart = Math.log(startZoom);
         const logEnd = Math.log(targetZoom);
         const currentZoom = Math.exp(logStart + (logEnd - logStart) * ease);

         // 2. The "Glorious" Centering Physics
         // We calculate where the target point is relative to the viewport center right now
         const initialTargetX = targetHours * startZoom;
         const initialOffsetFromCenter = initialTargetX - startScroll - centerX;

         // We want precisely this offset to reach 0 (centered) at the end of the transition
         const targetXAtCurrentZoom = targetHours * currentZoom;
         const currentOffset = initialOffsetFromCenter * (1 - ease);

         // 3. Update Sync State (Instant for DOM/Animations, Throttled for React State)
         zoomRef.current = currentZoom;
         el.style.setProperty("--zoom", currentZoom.toString());

         // Only update React state occasionally to prevent rendering bottleneck
         const now = performance.now();
         if (now - lastUpdateRef.current > 16) {
            setZoom(currentZoom);
            setVisualZoom(currentZoom);
            lastUpdateRef.current = now;
         }

         // 4. Apply Scroll with synchronized offset
         el.scrollLeft = targetXAtCurrentZoom - centerX - currentOffset;

         // 5. Visibility Thresholds
         if (currentZoom < 1) el.dataset.zoom = "very-far";
         else if (currentZoom < 2.5) el.dataset.zoom = "far";
         else if (currentZoom < 18) el.dataset.zoom = "mid";
         else el.dataset.zoom = "close";

         if (progress < 1) {
            requestAnimationFrame(animate);
         }
      };

      requestAnimationFrame(animate);
   };

   const [isEditingCategories, setIsEditingCategories] = useState(false);
   const [isDraggingOverDelete, setIsDraggingOverDelete] = useState(false);
   const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
   const [dragHoverPosition, setDragHoverPosition] = useState<number | null>(null);

   const calculateHoverPosition = (draggedId: string, initialStart: Date, dragDeltaY: number) => {
      const tasksInDay = todos
         .filter((t) => format(startOfDay(t.startTime), "yyyy-MM-dd") === format(startOfDay(initialStart), "yyyy-MM-dd"))
         .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const draggedTaskIndex = tasksInDay.findIndex((t) => t.id === draggedId);
      const CARD_HEIGHT = 48;

      if (draggedTaskIndex !== -1) {
         const positionOffset = Math.round(-dragDeltaY / CARD_HEIGHT);
         return Math.max(0, Math.min(tasksInDay.length - 1, draggedTaskIndex + positionOffset));
      }

      return 0;
   };

   const getTaskOrderByPosition = (draggedId: string, initialStart: Date, targetPosition: number) => {
      const originalDayKey = format(startOfDay(initialStart), "yyyy-MM-dd");
      const tasksInDay = todos
         .filter((t) => format(startOfDay(t.startTime), "yyyy-MM-dd") === originalDayKey)
         .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (targetPosition < 0 || targetPosition >= tasksInDay.length) return 0;
      return tasksInDay[targetPosition].order ?? 0;
   };

   // Dragging state for items
   const dragRef = useRef<{ id: string; startX: number; startY: number; initialStart: Date; initialEnd?: Date; hoverPosition?: number } | null>(null);

   // Category creation state
   const categoryRef = useRef<{ type: string; color: string; startX: number; startY: number; hasMoved: boolean } | null>(null);

   // Panning state for background
   const panRef = useRef<{ isPanning: boolean; startX: number; scrollLeft: number }>({ isPanning: false, startX: 0, scrollLeft: 0 });

   const [viewportRange, setViewportRange] = useState({ start: 0, end: 100 });

   // Final polished performance engine: Hybrid state/ref model
   useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const handleScroll = () => {
         const scrollLeft = el.scrollLeft;
         const clientWidth = el.clientWidth;

         // Convert scroll dimensions to hours to know what's visible
         const startHour = (scrollLeft - clientWidth) / zoomRef.current;
         const endHour = (scrollLeft + clientWidth * 2) / zoomRef.current;

         setViewportRange({ start: startHour, end: endHour });
      };

      // Initial range
      handleScroll();

      // Initialize the CSS Variable
      el.style.setProperty("--zoom", zoomRef.current.toString());
      el.dataset.zoom = "mid";

      const todayHours = differenceInMinutes(new Date(), ANCHOR_DATE) / 60;
      el.scrollLeft = Math.max(0, todayHours * zoomRef.current - el.clientWidth / 2);

      let frameRequested = false;
      let pendingZoom: number | null = null;
      let pendingScroll: number | null = null;

      const updateUI = () => {
         if (pendingZoom !== null) {
            el.style.setProperty("--zoom", pendingZoom.toString());

            // Sync visibility flags instantly in the DOM
            if (pendingZoom < 1) el.dataset.zoom = "very-far";
            else if (pendingZoom < 2.5) el.dataset.zoom = "far";
            else if (pendingZoom < 18) el.dataset.zoom = "mid";
            else el.dataset.zoom = "close";

            // Occasional React State sync for the Dial (non-blocking)
            const now = performance.now();
            if (now - lastUpdateRef.current > 32) {
               // ~30fps for state Sync is plenty for UI indicators (ZoomDial)
               setZoom(pendingZoom);
               setVisualZoom(pendingZoom);
               lastUpdateRef.current = now;
            }
            pendingZoom = null;

            // Re-calculate viewport after zoom
            handleScroll();
         }
         if (pendingScroll !== null) {
            el.scrollLeft = pendingScroll;
            pendingScroll = null;
            handleScroll();
         }
         frameRequested = false;
      };

      const handleWheel = (e: WheelEvent) => {
         // Bypass wheel handler if nested scrollable is present
         if ((e.target as HTMLElement).closest(".overflow-y-auto")) return;

         const isPinch = e.ctrlKey || e.metaKey;
         const isVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.5;

         if (isPinch || isVerticalScroll) {
            e.preventDefault();

            const zoomDelta = -e.deltaY;
            // PRECISE CALIBRATION: Reduced multiplier from 0.008 to 0.004 for buttery control
            // This prevents the "skipping" feel on hyper-sensitive trackpads
            const zoomMultiplier = Math.exp(zoomDelta * 0.004);
            let newZoom = zoomRef.current * zoomMultiplier;
            newZoom = Math.max(0.5, Math.min(newZoom, 500)); // Higher max zoom for extreme detail

            const rect = el.getBoundingClientRect();
            const pointerX = e.clientX - rect.left;
            const currentScroll = el.scrollLeft;
            const pointerHours = (currentScroll + pointerX) / zoomRef.current;

            zoomRef.current = newZoom;
            pendingZoom = newZoom;
            pendingScroll = pointerHours * newZoom - pointerX;

            if (!frameRequested) {
               frameRequested = true;
               requestAnimationFrame(updateUI);
            }
         }
      };

      el.addEventListener("wheel", handleWheel, { passive: false });
      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
         el.removeEventListener("wheel", handleWheel);
         el.removeEventListener("scroll", handleScroll);
      };
   }, []);

   // Drag & Drop engine (zero React rendering during move to keep 120fps)
   useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
         // Category Ghost dragging
         if (categoryRef.current) {
            const { startX, startY, color } = categoryRef.current;

            // Check if pointer has moved enough to be considered a drag
            if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
               categoryRef.current.hasMoved = true;
            }

            if (!categoryRef.current.hasMoved) return;

            let ghost = document.getElementById("category-ghost");
            if (!ghost) {
               ghost = document.createElement("div");
               ghost.id = "category-ghost";
               ghost.className =
                  "fixed pointer-events-none z-[1000] px-3 py-2 rounded-lg border backdrop-blur-md shadow-2xl text-xs font-bold transition-transform";
               ghost.innerText = "New Task";
               document.body.appendChild(ghost);
            }
            ghost.style.borderColor = color;
            ghost.style.backgroundColor = `${color}33`; // 20% opacity
            ghost.style.color = color;
            ghost.style.left = `${e.clientX}px`;
            ghost.style.top = `${e.clientY}px`;
            ghost.style.transform = `translate(-50%, -50%) scale(1.1)`;
            return;
         }

         // Task item dragging vs Background Panning
         if (dragRef.current) {
            const { id, startX, startY, initialStart } = dragRef.current;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const element = document.getElementById(`todo-${id}`);

            if (element) {
               element.style.zIndex = "999";
               element.style.transform = `translate(${deltaX}px, calc(-100% + ${deltaY}px)) scale(1.05)`;
               element.style.opacity = "0.8";

               // Calculate hover position within the same day stack
               const hoverPosition = calculateHoverPosition(id, initialStart, deltaY);
               dragRef.current.hoverPosition = hoverPosition;
               setDragHoverPosition(hoverPosition);

               // Handle delete zone detection (below timeline container)
               if (containerRef.current) {
                  const scrollRect = containerRef.current.getBoundingClientRect();
                  const threshold = scrollRect.bottom - scrollRect.height * 0.08;
                  if (e.clientY > threshold) {
                     setIsDraggingOverDelete(true);
                  } else {
                     setIsDraggingOverDelete(false);
                  }
               }
            }
         } else if (panRef.current.isPanning && containerRef.current) {
            const deltaX = e.clientX - panRef.current.startX;
            containerRef.current.scrollLeft = panRef.current.scrollLeft - deltaX;
         }
      };

      const handleMouseUp = (e: MouseEvent) => {
         // Determine if we are deleting BEFORE clearing any state
         let isDeleting = false;
         if (containerRef.current) {
            const scrollRect = containerRef.current.getBoundingClientRect();
            const threshold = scrollRect.bottom - scrollRect.height * 0.08;
            if (e.clientY > threshold) {
               isDeleting = true;
            }
         }

         if (categoryRef.current) {
            const { color, hasMoved } = categoryRef.current;
            const ghost = document.getElementById("category-ghost");
            if (ghost) ghost.remove();

            const el = containerRef.current;
            if (el && onAddTodo && !isDeleting && hasMoved) {
               const rect = el.getBoundingClientRect();
               // Check if drop is within timeline bounds (or close enough vertically)
               if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom + 50) {
                  const scrollLeft = el.scrollLeft;
                  const relativeX = e.clientX - rect.left + scrollLeft;
                  const dropHours = relativeX / zoomRef.current;
                  const dropDate = startOfDay(addMinutes(ANCHOR_DATE, dropHours * 60));

                  const newId = onAddTodo({
                     title: "New Task",
                     startTime: dropDate, // Explicitly drop it into the day where the cursor is
                     color,
                     completed: false,
                     order: 99999, // Guaranteed top for now
                  });

                  // Trigger immediate interaction (edit mode) for the new task
                  if (newId) {
                     setNewlyCreatedId(newId);
                  }
               }
            }

            categoryRef.current = null;
            document.body.style.cursor = "default";
            setIsDraggingOverDelete(false);
            return;
         }

         if (panRef.current.isPanning) {
            panRef.current.isPanning = false;
            document.body.style.cursor = "default";
         }

         if (!dragRef.current) return;

         const { id, startX, initialStart, initialEnd } = dragRef.current;
         const deltaX = e.clientX - startX;

         const element = document.getElementById(`todo-${id}`);
         if (element) {
            // Reset visual drag shifts
            element.style.transform = "translateY(-100%)";
            element.style.zIndex = "";
            element.style.opacity = "";
         }

         // Handle Delete on Drop
         if (isDeleting && onDeleteTodo) {
            onDeleteTodo(id);
         } else if (Math.abs(deltaX) > 2 || Math.abs(e.clientY - dragRef.current.startY) > 2) {
            const dragDeltaY = e.clientY - dragRef.current.startY;
            const deltaHours = deltaX / zoomRef.current;
            const isTask = !initialEnd;

            // 1. Calculate the target day
            let newStart;
            if (isTask) {
               const deltaDays = Math.round(deltaHours / 24);
               newStart = startOfDay(addDays(initialStart, deltaDays));
            } else {
               const deltaMinutes = Math.round(deltaHours * 60);
               newStart = addMinutes(initialStart, deltaMinutes);
            }

            const originalDayKey = format(startOfDay(initialStart), "yyyy-MM-dd");
            const newDayKey = format(startOfDay(newStart), "yyyy-MM-dd");
            const isSameDay = originalDayKey === newDayKey;

            // Batch all updates to avoid jitter
            const updatesToApply: Array<{ id: string; updates: Partial<Todo> }> = [];

            if (Math.abs(dragDeltaY) > 5) {
               // REORDER (same day or cross-day)
               const tasksInTargetDay = todos
                  .filter((t) => format(startOfDay(t.startTime), "yyyy-MM-dd") === newDayKey)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

               const draggedTask = todos.find((t) => t.id === id);
               const targetPosition = dragRef.current!.hoverPosition;

               if (draggedTask) {
                  // Remove dragged task from target day list (if it's already there)
                  const reordered = tasksInTargetDay.filter((t) => t.id !== id);
                  const targetPos = dragRef.current!.hoverPosition ?? 0;

                  // Insert at target position
                  if (targetPos < reordered.length) {
                     reordered.splice(targetPos, 0, draggedTask);
                  } else {
                     reordered.push(draggedTask);
                  }

                  // Renumber all tasks in target day
                  reordered.forEach((task, index) => {
                     const taskUpdates: Partial<Todo> = { order: index };
                     if (task.id === id && !isSameDay) {
                        taskUpdates.startTime = newStart;
                        if (!isTask && initialEnd) {
                           taskUpdates.endTime = addMinutes(initialEnd, Math.round(deltaHours * 60));
                        }
                     }
                     updatesToApply.push({ id: task.id, updates: taskUpdates });
                  });
               }
            } else {
               // CROSS-DAY DRAG: Move to new day, place at top
               const existingTasksInDay = todos
                  .filter((t) => format(startOfDay(t.startTime), "yyyy-MM-dd") === newDayKey && t.id !== id)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

               const newOrder = existingTasksInDay.length;

               onUpdateTodo(id, {
                  startTime: newStart,
                  endTime: isTask ? undefined : initialEnd ? addMinutes(initialEnd, Math.round(deltaHours * 60)) : undefined,
                  order: newOrder,
               });
            }

            // Apply all updates
            updatesToApply.forEach(({ id: taskId, updates }) => {
               onUpdateTodo(taskId, updates);
            });
         }

         setIsDraggingOverDelete(false);
         document.body.style.cursor = "default";
         dragRef.current = null;
         setDragHoverPosition(null);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
         window.removeEventListener("mousemove", handleMouseMove);
         window.removeEventListener("mouseup", handleMouseUp);
      };
   }, [onUpdateTodo]);

   const positionedTodos = useMemo(() => {
      // 1. Group tasks by their calendar day
      const dayGroups = new Map<string, Todo[]>();

      todos.forEach((todo) => {
         const dayKey = format(startOfDay(todo.startTime), "yyyy-MM-dd");
         if (!dayGroups.has(dayKey)) dayGroups.set(dayKey, []);
         dayGroups.get(dayKey)!.push(todo);
      });

      // 2. Sort and position inside each group
      const allPositioned: any[] = [];

      dayGroups.forEach((tasks) => {
         tasks.sort((a, b) => {
            // Unbelievably simple sorting:
            // High order = High position (TOP)
            // Low order = Low position (BOTTOM)
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            return orderA - orderB;
         });

         tasks.forEach((todo, index) => {
            const isTask = !todo.endTime;
            const blockStart = isTask ? startOfDay(todo.startTime) : todo.startTime;

            // Check if this task is being dragged and calculate visual reordering
            let visualTier = index;
            if (dragRef.current && dragRef.current.id === todo.id) {
               // This is the dragged task - keep it at its original tier
               // The transform handles following the cursor
               visualTier = index;
            } else if (dragRef.current && dragHoverPosition !== null) {
               // Other tasks shift out of the way
               const dayKey = format(startOfDay(todo.startTime), "yyyy-MM-dd");
               const dragDayKey = format(startOfDay(dragRef.current.initialStart), "yyyy-MM-dd");

               if (dayKey === dragDayKey) {
                  const draggedTaskIndex = tasks.findIndex((t) => t.id === dragRef.current!.id);

                  if (draggedTaskIndex !== -1) {
                     // Adjust visual position based on drag direction
                     if (draggedTaskIndex < dragHoverPosition && index > draggedTaskIndex && index <= dragHoverPosition) {
                        // Items shift down when dragging down
                        visualTier = index - 1;
                     } else if (draggedTaskIndex > dragHoverPosition && index >= dragHoverPosition && index < draggedTaskIndex) {
                        // Items shift up when dragging up
                        visualTier = index + 1;
                     }
                  }
               }
            }

            // Calculate pixel offset, accounting for an expanded card below this one
            // Tasks stack upward: tier 0 is at bottom, higher tiers are above.
            // tierPx = -12 - (cumulative height of all tiers below)
            // Normal slot = 48px. Expanded slot = 48 + EXPANDED_EXTRA_HEIGHT.
            let tierPx = -12;
            for (let t = 0; t < visualTier; t++) {
               const taskAtTier = tasks[t];
               if (taskAtTier && taskAtTier.id === expandedTodoId) {
                  tierPx -= 36 + EXPANDED_EXTRA_HEIGHT;
               } else {
                  tierPx -= 48;
               }
            }

            allPositioned.push({
               ...todo,
               isTask,
               startHours: differenceInMinutes(blockStart, ANCHOR_DATE) / 60,
               durationHours: isTask ? 24 : differenceInMinutes(todo.endTime!, todo.startTime) / 60,
               tier: visualTier,
               tierPx,
            });
         });
      });

      return allPositioned;
   }, [todos, dragHoverPosition, dragRef.current?.id, dragRef.current?.initialStart, expandedTodoId]);

   const ticks = useMemo(() => {
      return Array.from({ length: TOTAL_DAYS }, (_, i) => {
         const d = addDays(ANCHOR_DATE, i);
         const isMonth = isFirstDayOfMonth(d);
         const isWeek = d.getDay() === 1; // 1 = Monday (make Monday the start of the week)

         return {
            id: i,
            label: format(d, "d"),
            dayOfWeek: format(d, "EEE"), // e.g., "Mon", "Tue"
            isMonth,
            isWeek,
            monthLabel: format(d, "MMM yyyy"),
            offsetHours: i * 24,
         };
      });
   }, []);

   return (
      <div className="w-full max-w-full box-border h-[80vh] bg-[#0a0a0a] text-white rounded-2xl border border-zinc-900 overflow-hidden relative shadow-2xl">
         <div className="absolute top-4 left-6 z-50 pointer-events-none select-none">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 opacity-50">Timeline</h2>
         </div>

         <div className="absolute top-4 right-6 z-50 flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 select-none">Drag to Add Task</span>
            <div className="flex items-center gap-2">
               {categories.map((cat) => (
                  <div
                     key={cat.label}
                     className="px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest cursor-grab active:cursor-grabbing select-none transition-all hover:scale-105 active:scale-95"
                     style={{
                        borderColor: cat.color,
                        backgroundColor: `${cat.color}22`, // ~13% opacity
                        color: cat.color,
                     }}
                     onMouseDown={(e) => {
                        e.stopPropagation();
                        categoryRef.current = {
                           type: cat.label,
                           color: cat.color,
                           startX: e.clientX,
                           startY: e.clientY,
                           hasMoved: false,
                        };
                        document.body.style.cursor = "grabbing";
                     }}>
                     {cat.label}
                  </div>
               ))}
               <button
                  onClick={() => setIsEditingCategories(true)}
                  className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-500 text-zinc-500 hover:text-zinc-200 transition-all"
                  title="Edit Categories">
                  <svg
                     width="16"
                     height="16"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round">
                     <circle cx="12" cy="12" r="1" />
                     <circle cx="19" cy="12" r="1" />
                     <circle cx="5" cy="12" r="1" />
                  </svg>
               </button>
            </div>
         </div>

         {/* Delete Drop Zone Visual */}
         {dragRef.current && (
            <div
               className={cn(
                  "absolute inset-x-0 bottom-0 h-16 transition-all duration-300 z-[90] flex items-center justify-center gap-3 pointer-events-none",
                  isDraggingOverDelete
                     ? "bg-red-950/60 border-t-2 border-red-500/40 backdrop-blur-md opacity-100"
                     : "bg-red-950/20 border-t border-red-500/10 backdrop-blur-sm opacity-60",
               )}>
               <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  className={cn("transition-transform duration-300", isDraggingOverDelete && "scale-110")}>
                  <path d="M3 6h18M19 6L18 20a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
               </svg>
               <span
                  className={cn(
                     "text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-300",
                     isDraggingOverDelete ? "text-red-400" : "text-red-500/40",
                  )}>
                  Drop to Delete
               </span>
            </div>
         )}

         <div className="relative w-full h-full overflow-hidden">
            <ZoomDial
               zoom={visualZoom}
               onZoomChange={(newZoom) => {
                  if (!containerRef.current) return;

                  // For the Dial's direct slider, we update instantly
                  setVisualZoom(newZoom);
                  lastUpdateRef.current = performance.now();

                  // Calculate center focus to zoom towards center of screen
                  const el = containerRef.current;
                  const centerX = el.clientWidth / 2;
                  const currentScroll = el.scrollLeft;
                  const centerHours = (currentScroll + centerX) / zoomRef.current;

                  zoomRef.current = newZoom;
                  setZoom(newZoom);
                  el.style.setProperty("--zoom", newZoom.toString());

                  // Maintain center focus
                  el.scrollLeft = centerHours * newZoom - centerX;

                  if (newZoom < 1) el.dataset.zoom = "very-far";
                  else if (newZoom < 2.5) el.dataset.zoom = "far";
                  else if (newZoom < 18) el.dataset.zoom = "mid";
                  else el.dataset.zoom = "close";
               }}
            />

            <div
               ref={containerRef}
               className={cn(
                  "timeline w-full h-full overflow-x-auto scrollbar-hide relative active:cursor-grabbing overscroll-x-contain",
                  !dragRef.current && "cursor-grab",
               )}
               style={{ willChange: "scroll-position, transform" }}
               onMouseDown={(e) => {
                  // Only start panning if we aren't clicking on a task (which has its own mousedown)
                  if ((e.target as HTMLElement).closest(".todo-wrapper")) return;

                  panRef.current = {
                     isPanning: true,
                     startX: e.clientX,
                     scrollLeft: containerRef.current?.scrollLeft || 0,
                  };
                  document.body.style.cursor = "grabbing";
               }}>
               <div
                  className="h-full relative pointer-events-none contain-layout flex"
                  style={{ width: `calc(var(--zoom) * ${TOTAL_HOURS} * 1px)`, minHeight: "400px" }}>
                  <div className="absolute top-4/5 left-0 w-full h-[1px] bg-zinc-800 z-0 pointer-events-none" />

                  {ticks
                     .filter((t) => t.offsetHours >= viewportRange.start && t.offsetHours <= viewportRange.end)
                     .map((t) => (
                        <div
                           key={t.id}
                           className="absolute top-4/5 flex flex-col items-center z-0 -translate-x-1/2 pointer-events-none content-visibility-auto"
                           style={{
                              left: `calc(var(--zoom) * ${t.offsetHours} * 1px)`,
                              containIntrinsicSize: "1px 1px",
                           }}>
                           {/* Dynamic demarcator tick marks */}
                           <div
                              className={cn(
                                 "-translate-y-1/2 rounded-full",
                                 t.isMonth ? "w-[2px] h-6 bg-zinc-300" : t.isWeek ? "w-[2px] h-4 bg-zinc-500" : "w-[1px] h-2 bg-zinc-700",
                              )}
                           />

                           {/* Day Labels - Only weeks remain when zoomed out */}
                           <div
                              className={cn(
                                 "tier-day absolute top-4 flex flex-col items-center gap-0.5 transition-opacity duration-300 select-none pointer-events-none",
                                 t.isWeek ? "is-week-start text-zinc-400 font-bold" : "text-zinc-600 font-medium",
                              )}>
                              <span className="text-[10px] uppercase tracking-wider opacity-60 line-clamp-1">{t.dayOfWeek}</span>
                              <span className="text-xs">{t.label}</span>
                           </div>

                           {/* Month Labels */}
                           {t.isMonth && (
                              <div className="tier-month absolute top-14 text-sm whitespace-nowrap text-zinc-400 font-black tracking-wide transition-all duration-300 select-none pointer-events-none">
                                 {t.monthLabel}
                              </div>
                           )}
                        </div>
                     ))}

                  <div
                     className="absolute top-4/5 w-2 h-2 rounded-full bg-red-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                     style={{
                        left: `calc(var(--zoom) * ${differenceInMinutes(new Date(), ANCHOR_DATE) / 60} * 1px)`,
                        transform: "translate(-50%, -50%)",
                     }}
                  />

                  <div className="absolute top-4/5 left-0 w-full z-20 pointer-events-auto">
                     {positionedTodos.map((todo) => (
                        <TaskCard
                           key={todo.id}
                           todo={todo as any}
                           isNewlyCreated={newlyCreatedId === todo.id}
                           onEditClick={(date) => zoomToDate(date, DAY_ZOOM)}
                           onEditingChange={(todoId, editing) => setExpandedTodoId(editing ? todoId : null)}
                           onMouseDown={(e) => {
                              if (editingTodo) return;
                              dragRef.current = {
                                 id: todo.id,
                                 startX: e.clientX,
                                 startY: e.clientY,
                                 initialStart: todo.startTime,
                                 initialEnd: todo.endTime,
                              };
                              document.body.style.cursor = "grabbing";
                           }}
                           onClick={(e) => {
                              if (newlyCreatedId === todo.id) {
                                 e.stopPropagation();
                                 return;
                              }
                              // Modal opening removed - interactions now handled via inline fields or checkboxes
                           }}
                           onUpdateTodo={onUpdateTodo}
                           onSetNewlyCreatedId={setNewlyCreatedId}
                           isDragging={dragRef.current?.id === todo.id}
                        />
                     ))}
                  </div>

                  <EditModal todo={editingTodo} onClose={() => setEditingTodo(null)} onUpdateTodo={onUpdateTodo} onDeleteTodo={onDeleteTodo} />

                  <CategoryModal
                     isOpen={isEditingCategories}
                     onClose={() => setIsEditingCategories(false)}
                     categories={categories}
                     onUpdateCategories={onUpdateCategories!}
                  />
               </div>
            </div>
         </div>
      </div>
   );
};
