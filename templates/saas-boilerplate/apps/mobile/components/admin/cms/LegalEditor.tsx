import React, { useState, useEffect } from "react";
import { View } from "react-native";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import { Label } from "@/components/common";
import type { LandingData } from "@/lib/cms-api";

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function LegalEditor({ data, onBack, onSave, isSaving }: Props) {
    const [creator, setCreator] = useState("");
    const [creatorLink, setCreatorLink] = useState("");
    const [supportEmailAddress, setSupportEmailAddress] = useState("");
    const [companyLegalName, setCompanyLegalName] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [country, setCountry] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [address, setAddress] = useState("");
    const [version, setVersion] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setCreator(data.footerSection.creator || "");
            setCreatorLink(data.footerSection.creatorLink || "");
            setSupportEmailAddress(data.contactUs.supportEmailAddress || "");
            setCompanyLegalName(data.contactUs.companyLegalName || "");
            setWebsiteUrl(data.termsOfService.websiteUrl || "");
            setCountry(data.termsOfService.country || "");
            setContactNumber(data.contactUs.contactNumber || "");
            setAddress(data.contactUs.address || "");
            setVersion(data.termsOfService.version || "");
            setLastUpdated(data.termsOfService.lastUpdated || "");
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({
            creator, creatorLink, supportEmailAddress, companyLegalName,
            websiteUrl, country, contactNumber, address, version, lastUpdated,
        });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="Legal & Footer"
            icon={"\uD83D\uDEE1\uFE0F"}
            description="Company info, contact details, and legal compliance."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <Label className="text-sm font-semibold mb-3">Company Details</Label>
            <CmsFormField label="Creator Name" value={creator} onChangeText={update(setCreator)} placeholder="John Doe" />
            <CmsFormField label="Creator Link" value={creatorLink} onChangeText={update(setCreatorLink)} placeholder="https://..." />
            <CmsFormField label="Company Legal Name" value={companyLegalName} onChangeText={update(setCompanyLegalName)} placeholder="Acme Inc." />
            <CmsFormField label="Website URL" value={websiteUrl} onChangeText={update(setWebsiteUrl)} placeholder="https://example.com" />

            <View className="h-px bg-border/30 my-4" />
            <Label className="text-sm font-semibold mb-3">Contact Information</Label>
            <CmsFormField label="Support Email" value={supportEmailAddress} onChangeText={update(setSupportEmailAddress)} placeholder="support@example.com" />
            <CmsFormField label="Contact Number" value={contactNumber} onChangeText={update(setContactNumber)} placeholder="+1 (555) 000-0000" />
            <CmsFormField label="Address" value={address} onChangeText={update(setAddress)} placeholder="123 Main St, City, State" multiline numberOfLines={2} />
            <CmsFormField label="Country" value={country} onChangeText={update(setCountry)} placeholder="United States" />

            <View className="h-px bg-border/30 my-4" />
            <Label className="text-sm font-semibold mb-3">Terms of Service</Label>
            <CmsFormField label="Terms Version" value={version} onChangeText={update(setVersion)} placeholder="1.0.0" />
            <CmsFormField label="Last Updated Date" value={lastUpdated} onChangeText={update(setLastUpdated)} placeholder="YYYY-MM-DD" />
        </CmsSectionWrapper>
    );
}
