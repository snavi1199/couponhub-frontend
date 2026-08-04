import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import { useCreateCouponsBulkMutation } from '@/api/couponApi';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/Spinner';
import type { CouponCreatePayload } from '@/lib/types';

const EXAMPLE = JSON.stringify(
  [
    {
      title: 'Example — Flat 10% off',
      brandId: '<brand-uuid-from-GET-/brands>',
      categoryId: '<category-uuid-from-GET-/categories>',
      couponCode: 'EXAMPLE10',
      type: 'FREE',
      sellingPrice: 0,
      availableQuantity: 999,
      description: 'Paste a JSON array like this one — each object is one coupon.',
    },
  ],
  null,
  2
);

export function BulkImportPanel() {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [bulkCreate, { isLoading, data }] = useCreateCouponsBulkMutation();
  const toast = useToast();

  const handleSubmit = async () => {
    setParseError(null);
    let payload: CouponCreatePayload[];
    try {
      payload = JSON.parse(text);
      if (!Array.isArray(payload)) throw new Error('Expected a JSON array of coupon objects');
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
      return;
    }

    try {
      const result = await bulkCreate(payload).unwrap();
      toast.show(`${result.data.succeededCount} of ${result.data.totalRequested} coupons created`, result.data.failedCount > 0 ? 'error' : 'success');
    } catch {
      toast.show('Bulk import failed', 'error');
    }
  };

  return (
    <div className="ticket-card p-5">
      <p className="mb-1 flex items-center gap-2 font-display text-lg text-ink">
        <UploadCloud size={18} /> Bulk import coupons
      </p>
      <p className="mb-4 text-sm text-ink-soft">
        Paste a JSON array — same fields as the "List a coupon" form. Get brand/category IDs from
        <code className="mx-1 rounded bg-line/30 px-1">GET /brands</code> and
        <code className="mx-1 rounded bg-line/30 px-1">GET /categories</code> in Swagger. One bad row won't block the rest.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={EXAMPLE}
        className="input-field min-h-48 font-mono text-xs"
        spellCheck={false}
      />
      {parseError && <p className="error-text">{parseError}</p>}

      <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={isLoading || !text.trim()} className="btn-primary mt-3">
        {isLoading ? <Spinner className="h-4 w-4" /> : 'Import'}
      </motion.button>

      {data && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold text-ink">
            {data.data.succeededCount} created, {data.data.failedCount} failed (of {data.data.totalRequested})
          </p>
          {data.data.created.map((c) => (
            <p key={c.id} className="flex items-center gap-2 text-sm text-brand-dark">
              <CheckCircle2 size={14} /> {c.title}
            </p>
          ))}
          {data.data.failures.map((f) => (
            <p key={f.index} className="flex items-center gap-2 text-sm text-stamp-dark">
              <XCircle size={14} /> Row {f.index + 1} ({f.title || 'untitled'}): {f.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
