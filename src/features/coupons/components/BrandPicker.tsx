import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronDown } from 'lucide-react';
import { useGetBrandsQuery } from '@/api/brandApi';
import { brandIcon } from '@/lib/brandIcons';

export function BrandPicker({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string }) {
  const { data } = useGetBrandsQuery();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const brands = data?.data ?? [];
  const selected = brands.find((b) => b.id === value);

  const filtered = useMemo(
    () => brands.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())),
    [brands, query]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`input-field flex items-center justify-between text-left ${error ? 'border-stamp-dark' : ''}`}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="text-lg leading-none">{brandIcon(selected.slug)}</span>
            {selected.name}
          </span>
        ) : (
          <span className="text-ink-soft/60">Select a brand — Swiggy, Zomato, BigBasket…</span>
        )}
        <ChevronDown size={16} className={`text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border-2 border-line bg-white shadow-xl"
          >
            <div className="relative border-b border-line/60 p-2">
              <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-soft" size={15} />
              <input
                autoFocus
                type="text"
                placeholder="Search brands…"
                className="w-full rounded-lg border-none bg-paper py-2 pl-8 pr-3 text-sm focus:outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-ink-soft">No brands match "{query}"</p>
              )}
              {filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onChange(b.id); setOpen(false); setQuery(''); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-brand-light ${
                    b.id === value ? 'bg-brand-light font-semibold text-brand-dark' : 'text-ink'
                  }`}
                >
                  <span className="shrink-0 text-lg leading-none">{brandIcon(b.slug)}</span>
                  <span className="flex-1">{b.name}</span>
                  {b.id === value && <Check size={15} className="shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
