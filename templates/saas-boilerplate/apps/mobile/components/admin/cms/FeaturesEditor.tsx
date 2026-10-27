import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { Label, MutedText } from "@/components/common";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsImageField from "./CmsImageField";
import type { LandingData } from "@/lib/cms-api";
import { FEATURE_ICONS, cmsFeaturesSchema, featureGroupsSchema, type CmsFeature, type FeatureDetails, type FeatureGroup } from "@workspace/ui/lib/feature-content";

type Props = { data: LandingData | null; onBack: () => void; onSave: (values: Record<string, any>) => Promise<void>; isSaving: boolean };

function move<T>(items: T[], index: number, offset: number) {
    const next = [...items];
    if (index + offset < 0 || index + offset >= next.length) return next;
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    return next;
}
function uniqueKey(prefix: string, keys: string[]) {
    let index = 1;
    while (keys.includes(`${prefix}-${index}`)) index++;
    return `${prefix}-${index}`;
}
function Action({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
    return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} className={`min-h-12 justify-center rounded-lg border border-border px-3 py-2 ${disabled ? "opacity-40" : "bg-primary/5"}`}><Label className="text-sm">{title}</Label></TouchableOpacity>;
}
function Order({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (offset: number) => void; onRemove: () => void }) {
    return <View className="mb-4 flex-row flex-wrap gap-2"><Action title="Move up" disabled={index === 0} onPress={() => onMove(-1)} /><Action title="Move down" disabled={index === count - 1} onPress={() => onMove(1)} /><Action title="Remove" onPress={onRemove} /></View>;
}
function Choices({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
    return <View className="mb-4 gap-2"><Label>{label}</Label><View className="flex-row flex-wrap gap-2">{options.map(option => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value)} className={`min-h-12 justify-center rounded-lg border px-3 py-2 ${option.value === value ? "border-primary bg-primary/15" : "border-border"}`}><Label className="text-sm">{option.value === value ? "✓ " : ""}{option.label}</Label></TouchableOpacity>)}</View></View>;
}
function TextList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
    return <View className="my-3 gap-3"><Label>{label}</Label>{items.map((item, index) => <View key={index} className="rounded-lg border border-border p-3"><CmsFormField label={`${label} ${index + 1}`} value={item} onChangeText={value => onChange(items.map((old, i) => i === index ? value : old))} /><Order index={index} count={items.length} onMove={offset => onChange(move(items, index, offset))} onRemove={() => onChange(items.filter((_, i) => i !== index))} /></View>)}<Action title={`Add ${label.toLowerCase()}`} disabled={items.length >= 12} onPress={() => onChange([...items, ""])} /></View>;
}

export default function FeaturesEditor({ data, onBack, onSave, isSaving }: Props) {
    const [featureHeading, setFeatureHeading] = useState("");
    const [featureDescription, setFeatureDescription] = useState("");
    const [features, setFeatures] = useState<CmsFeature[]>([]);
    const [groups, setGroups] = useState<FeatureGroup[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [expanded, setExpanded] = useState<number | null>(null);

    useEffect(() => {
        if (!data) return;
        setFeatureHeading(data.featureSection.heading || "");
        setFeatureDescription(data.featureSection.description || "");
        setFeatures((data.featureSection.features || []).map(f => ({ ...f, category: f.category || "" })));
        setGroups(data.featureSection.groups || []);
        setIsDirty(false);
        setErrors([]);
    }, [data]);

    const changeFeatures = (value: CmsFeature[]) => { setFeatures(value); setIsDirty(true); };
    const changeGroups = (value: FeatureGroup[]) => { setGroups(value); setIsDirty(true); };
    const updateFeature = (index: number, patch: Partial<CmsFeature>) => changeFeatures(features.map((f, i) => i === index ? { ...f, ...patch } : f));
    const updateDetails = (index: number, patch: Partial<FeatureDetails>) => {
        const details = features[index]?.details;
        if (details) updateFeature(index, { details: { ...details, ...patch } });
    };
    const addDetails = (index: number) => {
        const groupKey = groups[0]?.key || "general";
        if (!groups.length) changeGroups([{ key: groupKey, label: "General" }]);
        updateFeature(index, { details: { key: uniqueKey("feature", features.flatMap(f => f.details ? [f.details.key] : [])), groupKey, icon: "layers", inclusion: "included", bullets: [], toolGroups: [], dependencies: [] } });
    };
    const handleSave = async () => {
        const featureResult = cmsFeaturesSchema.safeParse(features.map((f, sortOrder) => ({ ...f, category: f.category || undefined, sortOrder })));
        const groupResult = featureGroupsSchema.safeParse(groups);
        const issues = [
            ...(!featureResult.success ? featureResult.error.issues.map(i => `Feature ${i.path.join(" → ")}: ${i.message}`) : []),
            ...(!groupResult.success ? groupResult.error.issues.map(i => `Group ${i.path.join(" → ")}: ${i.message}`) : []),
            ...features.flatMap((f, i) => f.details && !groups.some(g => g.key === f.details!.groupKey) ? [`Feature ${i + 1}: choose an existing group.`] : []),
        ];
        setErrors(issues);
        if (issues.length || !featureResult.success || !groupResult.success) return;
        await onSave({ featureHeading, featureDescription, featureGroups: groupResult.data, features: featureResult.data });
        setIsDirty(false);
    };

    return <CmsSectionWrapper title="Features" icon={"\u2728"} description="Edit the feature explorer and its technology details." onBack={onBack} onSave={handleSave} isSaving={isSaving} isDirty={isDirty}>
        <CmsFormField label="Section Heading" value={featureHeading} onChangeText={value => { setFeatureHeading(value); setIsDirty(true); }} />
        <CmsFormField label="Section Description" value={featureDescription} onChangeText={value => { setFeatureDescription(value); setIsDirty(true); }} multiline />
        {errors.length > 0 && <View accessibilityRole="alert" className="mb-4 rounded-lg border border-destructive p-3">{errors.map((error, i) => <Label key={i} className="text-destructive">{error}</Label>)}</View>}
        <View className="mb-6 gap-3"><Label className="font-semibold">Feature groups</Label><MutedText>Keys stay stable when labels change. Reassign features before removing their group.</MutedText>
            {groups.map((group, index) => <View key={index} className="rounded-xl border border-border p-4"><CmsFormField label="Group label" value={group.label} onChangeText={label => changeGroups(groups.map((g, i) => i === index ? { ...g, label } : g))} /><CmsFormField label="Group key" value={group.key} onChangeText={key => {
                changeGroups(groups.map((g, i) => i === index ? { ...g, key } : g));
                changeFeatures(features.map(f => f.details?.groupKey === group.key ? { ...f, details: { ...f.details, groupKey: key } } : f));
            }} /><Order index={index} count={groups.length} onMove={offset => changeGroups(move(groups, index, offset))} onRemove={() => changeGroups(groups.filter((_, i) => i !== index))} /></View>)}
            <Action title="Add group" disabled={groups.length >= 40} onPress={() => changeGroups([...groups, { key: uniqueKey("group", groups.map(g => g.key)), label: "New group" }])} />
        </View>
        <View className="gap-4"><Label className="font-semibold">Feature items</Label>
            {features.map((feature, index) => <View key={feature.id ?? index} className="rounded-xl border border-border p-4">
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expanded === index }} className="min-h-12 justify-center" onPress={() => setExpanded(expanded === index ? null : index)}><Label className="font-semibold">{index + 1}. {feature.title || "New feature"} {expanded === index ? "−" : "+"}</Label></TouchableOpacity>
                {expanded === index && <View className="mt-3"><Order index={index} count={features.length} onMove={offset => { changeFeatures(move(features, index, offset)); setExpanded(index + offset); }} onRemove={() => { changeFeatures(features.filter((_, i) => i !== index)); setExpanded(null); }} />
                    <CmsFormField label="Title" value={feature.title} onChangeText={title => updateFeature(index, { title })} />
                    <CmsFormField label="Description / outcome" value={feature.description} onChangeText={description => updateFeature(index, { description })} multiline />
                    <CmsFormField label="Legacy category (optional)" value={feature.category ?? ""} onChangeText={category => updateFeature(index, { category })} />
                    <CmsImageField label="Legacy image (optional)" value={feature.imageUrl} onChangeText={imageUrl => updateFeature(index, { imageUrl })} />
                    {feature.details ? <View className="gap-3">
                        <CmsFormField label="Stable feature key" value={feature.details.key} onChangeText={key => updateDetails(index, { key })} />
                        <Choices label="Group" value={feature.details.groupKey} options={groups.map(g => ({ value: g.key, label: g.label }))} onChange={groupKey => updateDetails(index, { groupKey })} />
                        <Choices label="Inclusion" value={feature.details.inclusion} options={["included", "optional", "platform"].map(value => ({ value, label: value }))} onChange={value => updateDetails(index, { inclusion: value as FeatureDetails["inclusion"] })} />
                        <Choices label="Icon" value={feature.details.icon} options={FEATURE_ICONS.map(value => ({ value, label: value }))} onChange={value => updateDetails(index, { icon: value as FeatureDetails["icon"] })} />
                        <TextList label="Bullets" items={feature.details.bullets} onChange={bullets => updateDetails(index, { bullets })} />
                        <Label className="font-semibold">Tool groups</Label>
                        {feature.details.toolGroups.map((group, groupIndex) => {
                            const toolGroups = feature.details!.toolGroups;
                            const updateGroup = (patch: Partial<typeof group>) => updateDetails(index, { toolGroups: toolGroups.map((g, i) => i === groupIndex ? { ...g, ...patch } : g) });
                            return <View key={groupIndex} className="rounded-lg border border-border p-3"><Order index={groupIndex} count={toolGroups.length} onMove={offset => updateDetails(index, { toolGroups: move(toolGroups, groupIndex, offset) })} onRemove={() => updateDetails(index, { toolGroups: toolGroups.filter((_, i) => i !== groupIndex) })} /><CmsFormField label="Tool group label" value={group.label} onChangeText={label => updateGroup({ label })} /><Choices label="Relationship" value={group.relationship} options={["built-with", "choose-one", "sign-in", "compatible"].map(value => ({ value, label: value }))} onChange={value => updateGroup({ relationship: value as typeof group.relationship })} />
                                {group.tools.map((tool, toolIndex) => {
                                    const updateTool = (patch: Partial<typeof tool>) => updateGroup({ tools: group.tools.map((t, i) => i === toolIndex ? { ...t, ...patch } : t) });
                                    return <View key={toolIndex} className="my-3 rounded-lg border border-border p-3"><CmsFormField label="Tool name" value={tool.name} onChangeText={name => updateTool({ name })} /><CmsImageField label="Tool logo" value={tool.logoUrl} onChangeText={logoUrl => updateTool({ logoUrl })} /><CmsFormField label="Tool URL (optional)" value={tool.url ?? ""} onChangeText={url => updateTool({ url })} /><Order index={toolIndex} count={group.tools.length} onMove={offset => updateGroup({ tools: move(group.tools, toolIndex, offset) })} onRemove={() => updateGroup({ tools: group.tools.filter((_, i) => i !== toolIndex) })} /></View>;
                                })}<Action title="Add tool" disabled={group.tools.length >= 20} onPress={() => updateGroup({ tools: [...group.tools, { name: "", logoUrl: "" }] })} />
                            </View>;
                        })}
                        <Action title="Add tool group" disabled={feature.details.toolGroups.length >= 8} onPress={() => updateDetails(index, { toolGroups: [...feature.details!.toolGroups, { label: "", relationship: "built-with", tools: [] }] })} />
                        <TextList label="Dependencies" items={feature.details.dependencies} onChange={dependencies => updateDetails(index, { dependencies })} />
                        <CmsFormField label="Documentation URL (optional)" value={feature.details.documentationUrl ?? ""} onChangeText={documentationUrl => updateDetails(index, { documentationUrl })} />
                        <Action title="Remove detailed content" onPress={() => updateFeature(index, { details: null })} />
                    </View> : <Action title="Add detailed content" onPress={() => addDetails(index)} />}
                </View>}
            </View>)}
            <Action title="Add feature" disabled={features.length >= 100} onPress={() => { changeFeatures([...features, { title: "", description: "", category: "", imageUrl: "" }]); setExpanded(features.length); }} />
        </View>
    </CmsSectionWrapper>;
}
