import React, { useState, useEffect } from "react";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsImageField from "./CmsImageField";
import { View } from "react-native";
import { Label } from "@/components/common";
import type { LandingData } from "@/lib/cms-api";

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function NavbarEditor({ data, onBack, onSave, isSaving }: Props) {
    const [title, setTitle] = useState("");
    const [logo, setLogo] = useState("");
    const [darkLogo, setDarkLogo] = useState("");
    const [githubLink, setGithubLink] = useState("");
    const [githubUsername, setGithubUsername] = useState("");
    const [githubRepositoryName, setGithubRepositoryName] = useState("");
    const [donateNowLink, setDonateNowLink] = useState("");
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setTitle(data.navbarSection.title || "");
            setLogo(data.navbarSection.logo || "");
            setDarkLogo(data.navbarSection.darkLogo || "");
            setGithubLink(data.navbarSection.githubLink || "");
            setGithubUsername(data.navbarSection.githubUsername || "");
            setGithubRepositoryName(data.navbarSection.githubRepositoryName || "");
            setDonateNowLink(data.navbarSection.donateNowLink || "");
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({ title, logo, darkLogo, githubLink, githubUsername, githubRepositoryName, donateNowLink });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="Navbar"
            icon={"\uD83E\uDDED"}
            description="Configure your site name, logos, and navigation links."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <CmsFormField label="SaaS Name" value={title} onChangeText={update(setTitle)} placeholder="My SaaS" />
            <CmsImageField label="Light Logo" value={logo} onChangeText={update(setLogo)} />
            <CmsImageField label="Dark Logo" value={darkLogo} onChangeText={update(setDarkLogo)} />
            <CmsFormField label="Donate / CTA Link" value={donateNowLink} onChangeText={update(setDonateNowLink)} placeholder="https://..." />

            <View className="h-px bg-border/30 my-4" />
            <Label className="text-sm font-semibold mb-3">GitHub Integration</Label>

            <CmsFormField label="Repository URL" value={githubLink} onChangeText={update(setGithubLink)} placeholder="https://github.com/..." />
            <CmsFormField label="Username (for star count)" value={githubUsername} onChangeText={update(setGithubUsername)} placeholder="username" />
            <CmsFormField label="Repo Name (for star count)" value={githubRepositoryName} onChangeText={update(setGithubRepositoryName)} placeholder="my-repo" />
        </CmsSectionWrapper>
    );
}
