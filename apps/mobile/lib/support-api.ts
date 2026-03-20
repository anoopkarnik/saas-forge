const baseURL = process.env.EXPO_PUBLIC_API_URL;

type SupportMessageInput = {
    subject: string;
    email: string;
    message: string;
};

export async function sendSupportMessage(input: SupportMessageInput) {
    const res = await fetch(`${baseURL}/api/trpc/support.sendSupportMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(
            error?.error?.json?.message ?? "Failed to send message"
        );
    }

    return res.json();
}
