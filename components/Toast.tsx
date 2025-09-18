'use client'
import { createContext, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastItem = { id:string; message:string };
const ToastCtx = createContext<{push:(m:string)=>void}>({ push: ()=>{} });

export function ToastProvider({ children }:{children:React.ReactNode}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = (message:string)=> {
    const id = Math.random().toString(36).slice(2);
    setItems(prev => [...prev, { id, message }]);
    setTimeout(()=> setItems(prev => prev.filter(i=> i.id !== id)), 2500);
  };
  const ctx = useMemo(()=>({ push }), []);
  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        <AnimatePresence>
          {items.map(i => (
            <motion.div key={i.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="card px-4 py-2 text-sm shadow-soft">{i.message}</motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(){ return useContext(ToastCtx); }
