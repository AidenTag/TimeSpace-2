import React, { useState, useEffect } from "react";
import { Timeline, type Todo, type Category } from "./components/Timeline";
import { GoalTracker } from "./components/GoalTracker";
import { type Goal } from "./components/GoalCard";
import { addHours, addDays, startOfToday, parseISO } from "date-fns";

const STORAGE_KEY_TODOS = "timespace-todos";
const STORAGE_KEY_CATEGORIES = "timespace-categories";
const STORAGE_KEY_GOALS = "timespace-goals";

const INITIAL_TODOS: Todo[] = [
   {
      id: "1",
      title: "Design System Reveal",
      startTime: addHours(startOfToday(), 10),
      color: "#3B82F6",
      details: "Draft the reveal document for the design system updates.",
   },
];

const INITIAL_CATEGORIES: Category[] = [
   { label: "Work", color: "#3B82F6" },
   { label: "Life", color: "#10B981" },
   { label: "Urgent", color: "#F43F5E" },
   { label: "Study", color: "#F59E0B" },
   { label: "Other", color: "#71717A" },
];

function App() {
   const [todos, setTodos] = useState<Todo[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_TODOS);
      if (!saved) return INITIAL_TODOS;
      try {
         const parsed = JSON.parse(saved);
         return parsed.map((todo: any) => ({
            ...todo,
            startTime: parseISO(todo.startTime),
            endTime: todo.endTime ? parseISO(todo.endTime) : undefined,
         }));
      } catch (e) {
         console.error("Failed to parse todos from localStorage", e);
         return INITIAL_TODOS;
      }
   });

   const [categories, setCategories] = useState<Category[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (!saved) return INITIAL_CATEGORIES;
      try {
         return JSON.parse(saved);
      } catch (e) {
         console.error("Failed to parse categories from localStorage", e);
         return INITIAL_CATEGORIES;
      }
   });

   const [goals, setGoals] = useState<Goal[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_GOALS);
      if (!saved) return [];
      try {
         const parsed = JSON.parse(saved);
         return parsed.map((goal: any) => ({
            ...goal,
            createdAt: parseISO(goal.createdAt),
            dueDate: goal.dueDate ? parseISO(goal.dueDate) : undefined,
         }));
      } catch (e) {
         console.error("Failed to parse goals from localStorage", e);
         return [];
      }
   });

   useEffect(() => {
      localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(todos));
   }, [todos]);

   useEffect(() => {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
   }, [categories]);

   useEffect(() => {
      localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goals));
   }, [goals]);

   // ── Todo handlers ──
   const handleUpdateTodo = (id: string, updates: Partial<Todo>) => {
      setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo)));
   };

   const handleAddTodo = (newTodo: Omit<Todo, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      setTodos((prev) => [...prev, { ...newTodo, id }]);
      return id;
   };

   const handleDeleteTodo = (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
   };

   const handleUpdateCategories = (newCategories: Category[]) => {
      setCategories(newCategories);
   };

   // ── Goal handlers ──
   const handleAddGoal = (newGoal: Omit<Goal, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      setGoals((prev) => [...prev, { ...newGoal, id }]);
      return id;
   };

   const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
      setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)));
   };

   const handleDeleteGoal = (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
   };

   return (
      <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden box-border bg-[#0a0a0a] p-4 md:p-8 flex flex-col gap-4 selection:bg-zinc-800">
         <header className="flex flex-col px-2 pointer-events-none box-border">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">TimeSpace</h1>
            <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">Infinite continuous canvas</p>
         </header>

         <main className="flex-1 w-full min-h-[600px] relative overflow-hidden flex flex-col">
            <Timeline
               todos={todos}
               onUpdateTodo={handleUpdateTodo}
               onAddTodo={handleAddTodo}
               onDeleteTodo={handleDeleteTodo}
               categories={categories}
               onUpdateCategories={handleUpdateCategories}
            />
         </main>

         <section className="w-full">
            <GoalTracker
               goals={goals}
               onUpdateGoal={handleUpdateGoal}
               onAddGoal={handleAddGoal}
               onDeleteGoal={handleDeleteGoal}
               categories={categories}
            />
         </section>
      </div>
   );
}

export default App;
