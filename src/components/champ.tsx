import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Petits champs de formulaire réutilisés partout (select et case à cocher natifs).
export function Champ({ label, aide, ...props }: { label: string; aide?: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} {...props} />
      {aide && <p className="text-xs text-muted-foreground">{aide}</p>}
    </div>
  );
}

export function ChampSelect({
  label,
  options,
  ...props
}: { label: string; options: { value: string; label: string }[] } & React.ComponentProps<"select">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <select
        id={props.name}
        className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CaseACocher({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-primary" {...props} />
      {label}
    </label>
  );
}
