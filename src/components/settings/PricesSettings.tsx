"use client";

import { useState } from "react";
import { type MaterialRate, decideRate, overrideFxRate, useFxRates, useMaterialFreshness, usePriceProposals } from "@/lib/api/admin";
import { formatDate, formatDateTime, humanize } from "@/lib/format";
import { type Column, DataTable } from "@/components/DataTable";
import { DateInput, FormCard, INPUT, TextInput } from "@/components/forms";
import { Button, Section } from "@/components/ui";

/** A proposed material rate (from the scraper or staff): accept it (correcting it if needed) or reject it. */
function ProposalRow({ rate, canDecide }: { rate: MaterialRate; canDecide: boolean }) {
  const [corrected, setCorrected] = useState("");
  const [note, setNote] = useState("");
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {rate.material_code} · {rate.rate_per_unit} {rate.currency}
          {rate.change_pct && <span className="font-normal text-neutral-500"> ({Number(rate.change_pct) > 0 ? "+" : ""}{rate.change_pct}%)</span>}
        </p>
        <p className="text-xs text-neutral-500">
          {rate.source_url ? (
            <a href={rate.source_url} target="_blank" rel="noreferrer" className="underline hover:text-black">
              {humanize(rate.source)}
            </a>
          ) : (
            humanize(rate.source)
          )}{" "}
          · {formatDateTime(rate.proposed_at)}
          {rate.decided_at && ` · decided ${formatDateTime(rate.decided_at)}`}
        </p>
      </div>
      {canDecide && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min="0" step="any" value={corrected} onChange={(event) => setCorrected(event.target.value)} placeholder="Correct rate (optional)" aria-label="Corrected rate" className={`${INPUT} w-48`} />
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" aria-label="Note" className={`${INPUT} w-56`} maxLength={1000} />
          <Button onClick={() => void decideRate(rate, true, corrected, note)}>Approve</Button>
          <Button variant="secondary" onClick={() => void decideRate(rate, false, "", note)}>
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

/** D38: a manual rate for a day replaces that day's rate. */
function FxOverride({ onClose }: { onClose: () => void }) {
  const [currency, setCurrency] = useState("");
  const [rate, setRate] = useState("");
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <FormCard title="Set a rate" submitLabel="Save rate" canSubmit={/^[A-Z]{3}$/.test(currency) && Number(rate) > 0} onCancel={onClose} onSubmit={() => void overrideFxRate(currency, rate, asOf).then((result) => result && onClose())}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextInput label="Currency" placeholder="USD" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
        <TextInput label="1 unit = AED" type="number" min="0" step="any" value={rate} onChange={(event) => setRate(event.target.value)} />
        <DateInput label="For the day" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
      </div>
    </FormCard>
  );
}

/** §5.4 rates are stored daily by a job (source "auto:…"); a manager's rate for a day is never replaced by it. */
const fxSourceLabel = (source: string) => (source.startsWith("auto") ? "Automatic" : source === "manual" ? "Entered by manager" : humanize(source));

const FX_COLUMNS: Column<{ currency: string; rate_to_aed: string; as_of: string; source: string }>[] = [
  { label: "Currency", cell: (row) => row.currency, width: "25%" },
  { label: "1 unit in AED", cell: (row) => row.rate_to_aed, width: "25%", alignRight: true },
  { label: "Day", cell: (row) => formatDate(row.as_of), width: "25%" },
  { label: "Source", cell: (row) => fxSourceLabel(row.source), width: "25%" },
];

/** Material rates waiting for the manager, how fresh each approved rate is, and the currency rates quotes use. */
export function PricesSettings({ canDecide, canSeeFx }: { canDecide: boolean; canSeeFx: boolean }) {
  const { data: proposals } = usePriceProposals(true);
  const { data: freshness } = useMaterialFreshness(true);
  const { data: fxRates } = useFxRates(canSeeFx);
  const [isSettingFx, setIsSettingFx] = useState(false);

  return (
    <div className="space-y-4 md:space-y-5">
      <Section title="Proposed material rates">
        {!proposals ? <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" /> : proposals.length === 0 && <p className="text-sm text-neutral-400">Nothing waiting</p>}
        <ul className="divide-y divide-dashed divide-neutral-200">
          {proposals?.map((rate) => (
            <ProposalRow key={rate.id} rate={rate} canDecide={canDecide} />
          ))}
        </ul>
      </Section>

      <Section title="Approved rates">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {freshness?.map((material) => (
            <li key={material.material_code} className={`flex items-center justify-between rounded-full border px-4 py-2.5 text-sm ${material.level === "ok" ? "border-neutral-200" : "border-black font-medium"}`}>
              <span>{material.material_code}</span>
              <span className={material.level === "block" ? "rounded-full bg-black px-2.5 py-0.5 text-xs text-white" : "text-xs text-neutral-500"}>
                {material.level === "block" ? "Too old: blocks pricing" : material.days_since_approval === null ? "Never approved" : `${material.days_since_approval} days old`}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {canSeeFx && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-tight">Currency rates</h2>
            {!isSettingFx && (
              <Button variant="secondary" onClick={() => setIsSettingFx(true)}>
                Set a rate
              </Button>
            )}
          </div>
          {isSettingFx && <FxOverride onClose={() => setIsSettingFx(false)} />}
          {fxRates && <DataTable rows={fxRates} columns={FX_COLUMNS} rowKey={(row) => row.currency} minWidth={480} />}
        </div>
      )}
    </div>
  );
}
