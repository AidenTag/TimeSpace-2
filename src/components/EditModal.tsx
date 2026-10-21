import React from "react";
import { type Todo } from "./Timeline";

interface EditModalProps {
   todo: Todo | null;
   onClose: () => void;
   onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
   onDeleteTodo?: (id: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ todo, onClose, onUpdateTodo, onDeleteTodo }) => {
   if (!todo) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
         <div
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-2xl w-full max-w-sm flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Edit Event</h3>

            <div className="flex flex-col gap-1.5">
               <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Title</label>
               <input
                  autoFocus
                  name="todo_title_unique_field"
                  id="todo_title_unique_field"
                  type="text"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-dashlaneignore="true"
                  value={todo.title}
                  onChange={(e) => onUpdateTodo(todo.id, { title: e.target.value })}
                  onKeyDown={(e) => {
                     if (e.key === "Enter") {
                        onClose();
                     }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
               />
            </div>

            <div className="flex justify-end gap-2 mt-4">
               <button
                  className="px-4 py-2 rounded-md text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto"
                  onClick={() => {
                     onDeleteTodo?.(todo.id);
                     onClose();
                  }}>
                  Delete
               </button>
               <button className="px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-white transition-colors" onClick={onClose}>
                  Cancel
               </button>
               <button
                  className="px-4 py-2 rounded-md text-sm font-medium bg-white text-black hover:bg-zinc-200 shadow-sm transition-colors"
                  onClick={() => {
                     onClose();
                  }}>
                  Save Changes
               </button>
            </div>
         </div>
      </div>
   );
};
