"use client";

import React, { useId } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { ImageUploadField } from "@workspace/ui/components/admin/ImageUploadField";
import { FeatureIcon } from "@workspace/ui/components/features/FeatureIcon";
import { FEATURE_ICONS, type CmsFeature, type FeatureDetails, type FeatureGroup } from "@workspace/ui/lib/feature-content";

function move<T>(items: T[], index: number, offset: number): T[] {
    const next = [...items];
    const target = index + offset;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
}

function uniqueKey(prefix: string, keys: string[]) {
    let n = 1;
    while (keys.includes(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
}

function TextField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
    const id = useId();
    return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{multiline ? <Textarea id={id} value={value} onChange={e => onChange(e.target.value)} /> : <Input id={id} value={value} onChange={e => onChange(e.target.value)} />}</div>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
    const id = useId();
    return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><select id={id} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function OrderActions({ index, count, onMove, onRemove, label }: { index: number; count: number; onMove: (offset: number) => void; onRemove: () => void; label: string }) {
    return <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>Move up</Button><Button type="button" variant="outline" size="sm" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>Move down</Button><Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${label}`}>Remove</Button></div>;
}

function TextList({ label, items, onChange, limit = 12 }: { label: string; items: string[]; onChange: (items: string[]) => void; limit?: number }) {
    return <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">{label}</legend>{items.map((item, index) => <div key={index} className="space-y-2 rounded-md border p-3"><TextField label={`${label} ${index + 1}`} value={item} onChange={value => onChange(items.map((old, i) => i === index ? value : old))} /><OrderActions label={`${label} ${index + 1}`} index={index} count={items.length} onMove={offset => onChange(move(items, index, offset))} onRemove={() => onChange(items.filter((_, i) => i !== index))} /></div>)}<Button type="button" variant="outline" size="sm" disabled={items.length >= limit} onClick={() => onChange([...items, ""])}>Add {label.toLowerCase()}</Button></fieldset>;
}

export function FeatureContentEditor({ features, groups, onFeaturesChange, onGroupsChange, uploadUrl }: { features: CmsFeature[]; groups: FeatureGroup[]; onFeaturesChange: (features: CmsFeature[]) => void; onGroupsChange: (groups: FeatureGroup[]) => void; uploadUrl?: string }) {
    const updateFeature = (index: number, patch: Partial<CmsFeature>) => onFeaturesChange(features.map((feature, i) => i === index ? { ...feature, ...patch } : feature));
    const updateDetails = (index: number, patch: Partial<FeatureDetails>) => {
        const details = features[index]?.details;
        if (details) updateFeature(index, { details: { ...details, ...patch } });
    };
    const addDetails = (index: number) => {
        let groupKey = groups[0]?.key;
        if (!groupKey) {
            groupKey = "general";
            onGroupsChange([{ key: groupKey, label: "General" }]);
        }
        updateFeature(index, { details: { key: uniqueKey("feature", features.flatMap(f => f.details ? [f.details.key] : [])), groupKey, icon: "layers", inclusion: "included", bullets: [], toolGroups: [], dependencies: [] } });
    };
    return <div className="space-y-6">
        <fieldset className="space-y-4 rounded-xl border p-4"><legend className="px-2 font-semibold">Feature groups</legend><p className="text-sm text-muted-foreground">Group labels and order appear in the feature explorer. Keys remain stable when labels change.</p>
            {groups.map((group, index) => <div key={index} className="space-y-3 rounded-lg border p-4"><div className="grid gap-4 md:grid-cols-2"><TextField label="Group label" value={group.label} onChange={label => onGroupsChange(groups.map((g, i) => i === index ? { ...g, label } : g))} /><TextField label="Group key" value={group.key} onChange={key => {
                onGroupsChange(groups.map((g, i) => i === index ? { ...g, key } : g));
                onFeaturesChange(features.map(f => f.details?.groupKey === group.key ? { ...f, details: { ...f.details, groupKey: key } } : f));
            }} /></div><OrderActions label={`group ${group.label || index + 1}`} index={index} count={groups.length} onMove={offset => onGroupsChange(move(groups, index, offset))} onRemove={() => onGroupsChange(groups.filter((_, i) => i !== index))} />{features.some(f => f.details?.groupKey === group.key) && <p className="text-xs text-muted-foreground">If you remove this group, choose another group for its features before saving.</p>}</div>)}
            <Button type="button" variant="outline" disabled={groups.length >= 40} onClick={() => onGroupsChange([...groups, { key: uniqueKey("group", groups.map(g => g.key)), label: "New group" }])}>Add group</Button>
        </fieldset>
        <div className="space-y-4"><h3 className="font-semibold">Feature items</h3>
            {features.map((feature, index) => <details key={feature.id ?? index} className="rounded-xl border p-4" open={features.length === 1 || undefined}>
                <summary className="cursor-pointer font-medium">{index + 1}. {feature.title || "New feature"}</summary>
                <div className="mt-5 space-y-5"><OrderActions label={`feature ${feature.title || index + 1}`} index={index} count={features.length} onMove={offset => onFeaturesChange(move(features, index, offset))} onRemove={() => onFeaturesChange(features.filter((_, i) => i !== index))} />
                    <div className="grid gap-4 md:grid-cols-2"><TextField label="Title" value={feature.title} onChange={title => updateFeature(index, { title })} /><TextField label="Legacy category (optional)" value={feature.category ?? ""} onChange={category => updateFeature(index, { category })} /></div>
                    <TextField label="Description / outcome" value={feature.description} onChange={description => updateFeature(index, { description })} multiline />
                    <div className="space-y-2"><p className="text-sm font-medium">Legacy image (optional)</p><ImageUploadField value={feature.imageUrl} onChange={imageUrl => updateFeature(index, { imageUrl })} uploadUrl={uploadUrl} /></div>
                    {feature.details ? <div className="space-y-5 border-t pt-5">
                        <div className="grid gap-4 md:grid-cols-2"><TextField label="Stable feature key" value={feature.details.key} onChange={key => updateDetails(index, { key })} /><SelectField label="Group" value={feature.details.groupKey} options={[...(!groups.some(g => g.key === feature.details?.groupKey) ? [{ value: feature.details.groupKey, label: "Choose a valid group" }] : []), ...groups.map(g => ({ value: g.key, label: g.label }))]} onChange={groupKey => updateDetails(index, { groupKey })} /><SelectField label="Inclusion" value={feature.details.inclusion} options={[{ value: "included", label: "Included" }, { value: "optional", label: "Optional" }, { value: "platform", label: "Platform" }]} onChange={inclusion => updateDetails(index, { inclusion: inclusion as FeatureDetails["inclusion"] })} /><div className="flex items-end gap-3"><div className="flex-1"><SelectField label="Icon" value={feature.details.icon} options={FEATURE_ICONS.map(icon => ({ value: icon, label: icon }))} onChange={icon => updateDetails(index, { icon: icon as FeatureDetails["icon"] })} /></div><FeatureIcon name={feature.details.icon} className="mb-2 h-6 w-6" /></div></div>
                        <TextList label="Bullets" items={feature.details.bullets} onChange={bullets => updateDetails(index, { bullets })} />
                        <fieldset className="space-y-4"><legend className="mb-2 font-semibold">Tool groups</legend>{feature.details.toolGroups.map((group, groupIndex) => {
                            const toolGroups = feature.details!.toolGroups;
                            const updateGroup = (patch: Partial<typeof group>) => updateDetails(index, { toolGroups: toolGroups.map((g, i) => i === groupIndex ? { ...g, ...patch } : g) });
                            return <div key={groupIndex} className="space-y-4 rounded-lg border p-4"><OrderActions label={`tool group ${groupIndex + 1}`} index={groupIndex} count={toolGroups.length} onMove={offset => updateDetails(index, { toolGroups: move(toolGroups, groupIndex, offset) })} onRemove={() => updateDetails(index, { toolGroups: toolGroups.filter((_, i) => i !== groupIndex) })} /><TextField label="Tool group label" value={group.label} onChange={label => updateGroup({ label })} /><SelectField label="Relationship" value={group.relationship} options={[{ value: "built-with", label: "Built with" }, { value: "choose-one", label: "Choose one" }, { value: "sign-in", label: "Sign in with" }, { value: "compatible", label: "Compatible with" }]} onChange={relationship => updateGroup({ relationship: relationship as typeof group.relationship })} />
                                {group.tools.map((tool, toolIndex) => {
                                    const updateTool = (patch: Partial<typeof tool>) => updateGroup({ tools: group.tools.map((t, i) => i === toolIndex ? { ...t, ...patch } : t) });
                                    return <div key={toolIndex} className="space-y-3 rounded-lg border p-3"><TextField label="Tool name" value={tool.name} onChange={name => updateTool({ name })} /><div className="space-y-2"><p className="text-sm font-medium">Tool logo</p><ImageUploadField value={tool.logoUrl} onChange={logoUrl => updateTool({ logoUrl })} uploadUrl={uploadUrl} /></div><TextField label="Tool URL (optional)" value={tool.url ?? ""} onChange={url => updateTool({ url })} /><OrderActions label={`tool ${tool.name || toolIndex + 1}`} index={toolIndex} count={group.tools.length} onMove={offset => updateGroup({ tools: move(group.tools, toolIndex, offset) })} onRemove={() => updateGroup({ tools: group.tools.filter((_, i) => i !== toolIndex) })} /></div>;
                                })}<Button type="button" variant="outline" disabled={group.tools.length >= 20} onClick={() => updateGroup({ tools: [...group.tools, { name: "", logoUrl: "" }] })}>Add tool</Button>
                            </div>;
                        })}<Button type="button" variant="outline" disabled={feature.details.toolGroups.length >= 8} onClick={() => updateDetails(index, { toolGroups: [...feature.details!.toolGroups, { label: "", relationship: "built-with", tools: [] }] })}>Add tool group</Button></fieldset>
                        <TextList label="Dependencies" items={feature.details.dependencies} onChange={dependencies => updateDetails(index, { dependencies })} />
                        <TextField label="Documentation URL (optional)" value={feature.details.documentationUrl ?? ""} onChange={documentationUrl => updateDetails(index, { documentationUrl })} />
                        <Button type="button" variant="ghost" onClick={() => updateFeature(index, { details: null })}>Remove detailed content</Button>
                    </div> : <Button type="button" variant="outline" onClick={() => addDetails(index)}>Add detailed content</Button>}
                </div>
            </details>)}
            <Button type="button" variant="outline" disabled={features.length >= 100} onClick={() => onFeaturesChange([...features, { title: "", description: "", category: "", imageUrl: "" }])}>Add feature</Button>
        </div>
    </div>;
}
