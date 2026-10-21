import React, { useRef, useEffect, useState, useMemo } from "react";
import { cn } from "../lib/utils";

interface ZoomDialProps {
   zoom: number;
   onZoomChange: (zoom: number) => void;
   minZoom?: number;
   maxZoom?: number;
}

export const ZoomDial: React.FC<ZoomDialProps> = ({ zoom, onZoomChange, minZoom = 0.5, maxZoom = 200 }) => {
   const [isDragging, setIsDragging] = useState(false);
   const startXRef = useRef(0);
   const startZoomRef = useRef(0);
   const containerRef = useRef<HTMLDivElement>(null);

   // Pre-calculate constants
   const MIN_LOG = Math.exp(minZoom); // Wait, previous code used Math.log(minZoom). Let's keep consistency.
   const _MIN_LOG = Math.log(minZoom);

   // Visual Constants - Balanced density and performance
   const RADIUS = 140;
   const TICK_SPACING = 6; // Restored tighter look for density
   const VISIBLE_ARC = 85; // Wider arc but culled efficiently
   const ZOOM_SENSITIVITY = 20;

   // Specific zoom points for labels
   const LOG_MONTH = Math.log(1.2);
   const LOG_WEEK = Math.log(4.5);
   const LOG_DAY = Math.log(15);

   const targetIndexMonth = Math.round(((LOG_MONTH - _MIN_LOG) * ZOOM_SENSITIVITY) / TICK_SPACING);
   const targetIndexWeek = Math.round(((LOG_WEEK - _MIN_LOG) * ZOOM_SENSITIVITY) / TICK_SPACING);
   const targetIndexDay = Math.round(((LOG_DAY - _MIN_LOG) * ZOOM_SENSITIVITY) / TICK_SPACING);

   // Pre-calculate the exact Zoom levels that align with the discrete ticks
   const ALIGNED_MONTH = Math.exp((targetIndexMonth * TICK_SPACING) / ZOOM_SENSITIVITY + _MIN_LOG);
   const ALIGNED_WEEK = Math.exp((targetIndexWeek * TICK_SPACING) / ZOOM_SENSITIVITY + _MIN_LOG);
   const ALIGNED_DAY = Math.exp((targetIndexDay * TICK_SPACING) / ZOOM_SENSITIVITY + _MIN_LOG);

   const currentAngle = (Math.log(zoom) - _MIN_LOG) * ZOOM_SENSITIVITY;

   // Performance: Pre-calculate animation targets to avoid repeating Math.exp
   const targets = useMemo(
      () => ({
         day: ALIGNED_DAY,
         week: ALIGNED_WEEK,
         month: ALIGNED_MONTH,
      }),
      [ALIGNED_DAY, ALIGNED_WEEK, ALIGNED_MONTH],
   );

   const animateToZoom = (targetZoom: number) => {
      if (Math.abs(zoom - targetZoom) < 0.01) return;

      const startValue = zoom;
      const startTime = performance.now();
      const duration = 500; // Smoother mechanical settle

      const animate = (currentTime: number) => {
         const elapsed = currentTime - startTime;
         const progress = Math.min(elapsed / duration, 1);

         // Smooth decel: Quadratic Ease Out for dial rotation
         const ease = progress * (2 - progress);

         const logStart = Math.log(startValue);
         const logEnd = Math.log(targetZoom);
         const currentLog = logStart + (logEnd - logStart) * ease;

         onZoomChange(Math.exp(currentLog));

         if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
   };

   const itemsToRender = useMemo(() => {
      const items = [];
      const centerTickIndex = Math.floor(currentAngle / TICK_SPACING);
      const halfVisible = Math.ceil(VISIBLE_ARC / TICK_SPACING) + 2;

      for (let i = centerTickIndex - halfVisible; i <= centerTickIndex + halfVisible; i++) {
         const tickBaseAngle = i * TICK_SPACING;
         let relativeAngle = (tickBaseAngle - currentAngle) % 360;
         if (relativeAngle > 180) relativeAngle -= 360;
         if (relativeAngle < -180) relativeAngle += 360;

         if (relativeAngle < -VISIBLE_ARC || relativeAngle > VISIBLE_ARC) continue;

         const rad = (relativeAngle * Math.PI) / 180;
         const x = Math.sin(rad) * RADIUS;
         const z = Math.cos(rad);

         const label = i === targetIndexDay ? "DAY" : i === targetIndexWeek ? "WEEK" : i === targetIndexMonth ? "MONTH" : null;

         items.push({
            index: i,
            x: Math.round(x * 10) / 10,
            scale: Math.round(z * 100) / 100,
            opacity: Math.round(Math.pow(z, 0.8) * 100) / 100, // Shallower curve for more visible edges
            label,
            isMain: !!label,
         });
      }
      return items;
   }, [currentAngle, targetIndexDay, targetIndexWeek, targetIndexMonth]);

   useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
         if (!isDragging) return;

         const deltaX = e.clientX - startXRef.current;
         const DRAG_SENSITIVITY = 0.5;

         const newAngle = (Math.log(startZoomRef.current) - _MIN_LOG) * ZOOM_SENSITIVITY - deltaX * DRAG_SENSITIVITY;
         const newLogZ = newAngle / ZOOM_SENSITIVITY + _MIN_LOG;
         let newZoom = Math.exp(newLogZ);

         newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
         onZoomChange(newZoom);
      };

      const handleMouseUp = () => {
         setIsDragging(false);
         document.body.style.cursor = "default";
      };

      if (isDragging) {
         window.addEventListener("mousemove", handleMouseMove);
         window.addEventListener("mouseup", handleMouseUp);
      }

      return () => {
         window.removeEventListener("mousemove", handleMouseMove);
         window.removeEventListener("mouseup", handleMouseUp);
      };
   }, [isDragging, onZoomChange, minZoom, maxZoom, _MIN_LOG, ZOOM_SENSITIVITY]);

   return (
      <div ref={containerRef} className="absolute top-12 left-6 z-[200] select-none group">
         {/* The Dial Cylinder HORIZONTAL side view */}
         <div
            className="relative h-14 w-64 cursor-ew-resize overflow-visible"
            onMouseDown={(e) => {
               e.preventDefault();
               setIsDragging(true);
               startXRef.current = e.clientX;
               startZoomRef.current = zoom;
               document.body.style.cursor = "ew-resize";
            }}>
            {/* Background Plate */}
            <div className="absolute inset-x-0 bottom-0 h-full rounded-md bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-sm pointer-events-none" />

            {/* Precision Center Marker */}
            <div className="absolute left-1/2 bottom-0 w-[1px] h-full bg-blue-500/40 z-20 pointer-events-none">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            </div>

            {/* Render Engine */}
            <div className="absolute inset-x-1 bottom-0 h-full overflow-hidden">
               <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                  {itemsToRender.map((item) => (
                     <div
                        key={item.index}
                        className={cn(
                           "absolute bottom-0 flex flex-col items-center will-change-transform",
                           item.isMain ? "cursor-pointer pointer-events-auto" : "pointer-events-none",
                        )}
                        onClick={(e) => {
                           e.stopPropagation();
                           if (item.label === "DAY") animateToZoom(ALIGNED_DAY);
                           if (item.label === "WEEK") animateToZoom(ALIGNED_WEEK);
                           if (item.label === "MONTH") animateToZoom(ALIGNED_MONTH);
                        }}
                        style={{
                           transform: `translateX(${item.x}px) scaleX(${item.scale})`,
                           opacity: item.opacity,
                           zIndex: item.isMain ? 30 : 5,
                        }}>
                        {item.label ? (
                           <div className="flex flex-col items-center mb-0.5 group/label">
                              <span className="text-[10px] font-bold text-blue-400 tracking-[0.15em] mb-1 drop-shadow-sm uppercase transition-colors group-hover/label:text-blue-300">
                                 {item.label}
                              </span>
                              <div className="w-[2px] h-6.5 bg-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all group-hover/label:h-8 group-hover/label:bg-white" />
                           </div>
                        ) : (
                           <div className="w-[1px] h-4 bg-zinc-600/50 mb-0" />
                        )}
                     </div>
                  ))}
               </div>
            </div>

            {/* Edge Fog */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950/80 to-transparent z-10 pointer-events-none" />
         </div>
      </div>
   );
};
