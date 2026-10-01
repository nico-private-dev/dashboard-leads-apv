"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Granularite } from "@/lib/analytics";

// Couleurs validées (contrastes / daltonisme) : rouge APV pour le direct, ambre pour Leadrs
// (le jaune APV #FDCE41 est trop clair pour une barre : 1,45:1 sur fond blanc).
const DIRECT = "#C0504C";
const LEADRS = "#D9A21B";
const AXE = { fontSize: 11, fill: "#6B6B6B" };

const jourCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const moisCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "short", year: "2-digit" });

function libellePeriode(p: string, g: Granularite, long = false) {
  const d = new Date(p + "T12:00:00Z");
  if (g === "mois") return moisCourt.format(d);
  return (g === "semaine" && long ? "Semaine du " : "") + jourCourt.format(d);
}

function Infobulle({ active, payload, label, granularite }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  granularite?: Granularite;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{granularite && label ? libellePeriode(label, granularite, true) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name} : <span className="font-medium tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function CourbeLeads({ donnees, granularite }: { donnees: { periode: string; leads: number }[]; granularite: Granularite }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={donnees} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E8E4DE" />
          <XAxis dataKey="periode" tickFormatter={(p: string) => libellePeriode(p, granularite)} tick={AXE} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={AXE} tickLine={false} axisLine={false} />
          <Tooltip content={<Infobulle granularite={granularite} />} cursor={{ fill: "#F3EFE9" }} />
          <Bar dataKey="leads" name="Leads reçus" fill={DIRECT} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarresThematiques({ donnees }: { donnees: { nom: string; direct: number; leadrs: number }[] }) {
  const [avecLeadrs, setAvecLeadrs] = useState(false);
  const aDuLeadrs = donnees.some((d) => d.leadrs > 0);
  const lignes = donnees.filter((d) => d.direct || (avecLeadrs && d.leadrs));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: DIRECT }} /> Direct
        </span>
        {avecLeadrs && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: LEADRS }} /> Leadrs
          </span>
        )}
        {aDuLeadrs && (
          <label className="ml-auto inline-flex items-center gap-1.5">
            <input type="checkbox" checked={avecLeadrs} onChange={(e) => setAvecLeadrs(e.target.checked)} className="accent-primary" />
            Inclure Leadrs
          </label>
        )}
      </div>
      {lignes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun lead sur la période.</p>
      ) : (
        <div style={{ height: Math.max(120, lignes.length * 40 + 24) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lignes} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap={8}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="nom" width={120} tick={AXE} tickLine={false} axisLine={false} />
              <Tooltip content={<Infobulle />} cursor={{ fill: "#F3EFE9" }} />
              <Bar dataKey="direct" name="Direct" stackId="a" fill={DIRECT} stroke="#FFFFFF" strokeWidth={2} radius={avecLeadrs ? 0 : [0, 4, 4, 0]}>
                <LabelList dataKey="direct" position="insideRight" fill="#FFFFFF" fontSize={11} formatter={(v) => (Number(v) > 0 ? v : "")} />
              </Bar>
              {avecLeadrs && (
                <Bar dataKey="leadrs" name="Leadrs" stackId="a" fill={LEADRS} stroke="#FFFFFF" strokeWidth={2} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="leadrs" position="right" fill="#1F1F1F" fontSize={11} formatter={(v) => (Number(v) > 0 ? v : "")} />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
