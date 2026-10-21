import React from "react";
import { type Category } from "./Timeline";

interface CategoryModalProps {
   isOpen: boolean;
   onClose: () => void;
   categories: Category[];
   onUpdateCategories: (categories: Category[]) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, categories, onUpdateCategories }) => {
   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
         <div
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col gap-6 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
               <div className="flex flex-col">
                  <h3 className="text-2xl font-black text-white tracking-tight">Categories</h3>
                  <p className="text-xs text-zinc-500 font-medium">Manage and customize your task tags</p>
               </div>
               <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                     <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
               </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: "calc(60vh - 100px)" }}>
               {categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl group transition-all">
                     <div className="relative w-10 h-10 flex-none group/picker">
                        <div
                           className="w-full h-full rounded-full border-2 border-zinc-800 flex items-center justify-center overflow-hidden"
                           style={{ backgroundColor: cat.color }}>
                           <div className="w-full h-full opacity-0 group-hover/picker:opacity-40 bg-white transition-opacity flex items-center justify-center pointer-events-none">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                 <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-1.5M14 17l-1.5-1.5" />
                              </svg>
                           </div>
                        </div>
                        <input
                           type="color"
                           value={cat.color}
                           onChange={(e) => {
                              const color = e.target.value.toUpperCase();
                              const newCats = [...categories];
                              newCats[idx] = { ...cat, color };
                              onUpdateCategories(newCats);
                           }}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                     </div>

                     <input
                        type="text"
                        defaultValue={cat.label}
                        onBlur={(e) => {
                           if (e.target.value === cat.label) return;
                           const newCats = [...categories];
                           newCats[idx] = { ...cat, label: e.target.value };
                           onUpdateCategories(newCats);
                        }}
                        onKeyDown={(e) => {
                           if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                           }
                        }}
                        className="flex-1 bg-transparent border-none text-sm font-bold text-white focus:outline-none"
                        placeholder="Category Name"
                     />

                     <button
                        onClick={() => {
                           const newCats = categories.filter((_, i) => i !== idx);
                           onUpdateCategories(newCats);
                        }}
                        className="p-1.5 text-zinc-600 hover:text-red-400 transition-all">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                           <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                     </button>
                  </div>
               ))}
            </div>

            <button
               onClick={() => {
                  const newCats = [...categories, { label: "New Category", color: "#71717A" }];
                  onUpdateCategories(newCats);
               }}
               className="w-full py-3 rounded-xl border border-dashed border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all text-xs font-bold flex items-center justify-center gap-2">
               <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
               </svg>
               Add Category
            </button>

            <div className="flex justify-end pt-2">
               <button className="px-6 py-2 rounded-xl bg-white text-black text-xs font-black hover:bg-zinc-200 transition-all" onClick={onClose}>
                  Done
               </button>
            </div>
         </div>
      </div>
   );
};
