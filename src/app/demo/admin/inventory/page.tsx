"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, KPI, Tag, Money } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { lowStock } from "@/lib/demo/metrics";

export default function InventoryPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const low = lowStock(state);
  const stockValue = state.inventory.reduce((s, i) => s + i.stock * i.unitCostCents, 0);
  const items = state.inventory.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Inventory" subtitle="Retail products and back-bar supplies."
        actions={<Btn variant="gold" onClick={() => setAdding(true)}><Icon.plus className="h-4 w-4" /> Add item</Btn>} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="SKUs" value={state.inventory.length} icon="inventory" hint="Tracked products" />
        <KPI label="Units on hand" value={state.inventory.reduce((s, i) => s + i.stock, 0)} icon="check" hint="Total stock" accent="#34d399" />
        <KPI label="Stock value" value={<Money cents={stockValue} />} icon="dollar" hint="At cost" accent="#38bdf8" />
        <KPI label="Low stock" value={low.length} icon="notifications" hint="Need reorder" accent={low.length ? "#ef4444" : "#34d399"} />
      </div>

      <Panel pad={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-smoke px-3 py-1.5">
            <Icon.inventory className="h-4 w-4 text-cream/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="bg-transparent text-sm text-cream outline-none placeholder:text-cream/30" />
          </div>
          <span className="text-xs text-cream/40">{items.length} items</span>
        </div>
        <div className="overflow-x-auto p-scroll">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wide text-cream/40">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">SKU</th>
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 text-center font-medium">Stock</th>
                <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                <th className="px-4 py-2.5 text-right font-medium">Retail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const isLow = i.stock <= i.reorderLevel;
                return (
                  <tr key={i.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 text-cream">{i.name} {isLow && <Tag tone="red">Low</Tag>}</div>
                      <div className="text-xs text-cream/40">{i.category}</div>
                    </td>
                    <td className="px-4 py-2.5 text-cream/50">{i.sku}</td>
                    <td className="px-4 py-2.5 text-cream/50">{i.supplier}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => actions.adjustStock(i.id, -1)} className="grid h-6 w-6 place-items-center rounded-full border border-white/12 text-cream/60 hover:border-brass/40">−</button>
                        <span className={`w-8 text-center font-medium ${isLow ? "text-red-300" : "text-cream"}`}>{i.stock}</span>
                        <button onClick={() => actions.adjustStock(i.id, 1)} className="grid h-6 w-6 place-items-center rounded-full border border-white/12 text-cream/60 hover:border-brass/40">+</button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-cream/70"><Money cents={i.unitCostCents} /></td>
                    <td className="px-4 py-2.5 text-right text-cream/70">{i.retailCents ? <Money cents={i.retailCents} /> : <span className="text-cream/30">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {low.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3">
          <span className="text-sm text-red-200">{low.length} product{low.length > 1 ? "s" : ""} below reorder level.</span>
          <Btn onClick={() => { low.forEach((i) => actions.adjustStock(i.id, i.reorderLevel * 2)); toast("Reorder placed — stock replenished"); }}>Auto-reorder all</Btn>
        </div>
      )}

      {adding && <AddItem onClose={() => setAdding(false)} />}
    </>
  );

  function AddItem({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("Styling");
    const [stock, setStock] = useState("10");
    const [reorder, setReorder] = useState("5");
    const [cost, setCost] = useState("5.00");
    const save = () => {
      if (!name.trim()) return;
      actions.addInventory({ name: name.trim(), category, sku: `NEW-${state.inventory.length + 1}`, stock: parseInt(stock || "0", 10), reorderLevel: parseInt(reorder || "0", 10), unitCostCents: Math.round(parseFloat(cost || "0") * 100), retailCents: 0, supplier: "—" });
      toast("Product added");
      onClose();
    };
    return (
      <Modal open onClose={onClose} title="Add product"
        footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="gold" onClick={save}>Add product</Btn></>}>
        <div className="space-y-4">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{["Styling", "Beard", "Shave", "Tools", "Supplies"].map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Unit cost ($)"><input className="input" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="In stock"><input className="input" type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
            <Field label="Reorder at"><input className="input" type="number" value={reorder} onChange={(e) => setReorder(e.target.value)} /></Field>
          </div>
        </div>
      </Modal>
    );
  }
}
