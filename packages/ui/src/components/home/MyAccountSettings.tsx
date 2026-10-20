import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/shadcn/avatar";
import { useEffect, useRef, useState } from "react";
import { CameraIcon, Eye, EyeOff } from "lucide-react";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@workspace/ui/components/shadcn/form';
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';

import SettingsHeadar from "@workspace/ui/components/home/SettingsHeader";
import { authClient, useSession } from "@workspace/auth/better-auth/auth-client";

import { useTranslations } from "use-intl";
import { useAuthSchemas } from "@workspace/ui/hooks/useAuthSchemas";
import { toast } from "sonner";
import { FormResult } from "@workspace/ui/components/auth/FormResult";


export interface MyAccountSettingsProps {
  onNavigate?: (path: string) => void;
  onSetPassword?: (data: { newPassword: string, confirmPassword: string }) => Promise<{ error?: string }>;
  onUpdateAvatar?: (file: File) => Promise<{ url?: string, error?: string }>;
  guestMail?: string;
  adminMail?: string;
}

const MyAccountSettings = ({ onNavigate, onSetPassword, onUpdateAvatar, guestMail, adminMail }: MyAccountSettingsProps) => {

  const { pending, data: session } = useSession();
  const t = useTranslations("settings.account");
  const { ResetPasswordSettingsSchema, AddPasswordSchema } = useAuthSchemas();

  const [name, setName] = useState<string>(session?.user?.name as string)
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null); // null = loading
  const [isPendingSetPassword, setIsPendingSetPassword] = useState(false);

  // Check if user has a credential (password) account
  useEffect(() => {
    const checkHasPassword = async () => {
      try {
        const { data: accounts } = await authClient.listAccounts();
        const hasCredential = accounts?.some((acc: any) => acc.providerId === "credential");
        setHasPassword(!!hasCredential);
      } catch (error) {
        console.error("Error checking accounts:", error);
        setHasPassword(false);
      }
    };
    checkHasPassword();
  }, []);

  // Handling setPassword internally
  const handleSetPasswordLocal = async (data: { newPassword: string, confirmPassword: string }) => {
    if (!onSetPassword) return;
    setIsPendingSetPassword(true);
    try {
      const res = await onSetPassword(data);
      if (res?.error) {
        toast.error(t("toast.passwordAddFailed"), { description: res.error });
      } else {
        toast.success(t("toast.passwordAdded"));
        setHasPassword(true);
        form.reset();
      }
    } catch (error: any) {
      toast.error(t("toast.passwordAddFailed"), { description: error.message });
    } finally {
      setIsPendingSetPassword(false);
    }
  };

  const inputFileRef = useRef<HTMLInputElement>(null);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');

  const title = t("title")
  const description = t("description")


  // Use the appropriate schema based on whether user has a password
  const passwordSchema = hasPassword === false ? AddPasswordSchema : ResetPasswordSettingsSchema;

  const form = useForm<z.infer<typeof ResetPasswordSettingsSchema> | z.infer<typeof AddPasswordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      ...(hasPassword !== false && { currentPassword: '' }),
      newPassword: '',
      confirmPassword: '',
    },
  })

  const [passwordError, setPasswordError] = useState<string>("")
  const [passwordSuccess, setPasswordSuccess] = useState<string>("")
  const [deleteAccountError, setDeleteAccountError] = useState<string>("")

  const handleAvatarClick = () => {
    inputFileRef.current?.click(); // Programmatically open file input
  };

  async function handleSubmit(data: z.infer<typeof ResetPasswordSettingsSchema | typeof AddPasswordSchema>) {
    if (pending || !session?.user) {
      toast.error(t("toast.unauthorized"), { description: t("toast.sessionNotLoaded") });
      return;
    }
    setPasswordError("");
    setPasswordSuccess("");
    if (session?.user?.email === guestMail || session?.user?.email === adminMail) {
      setPasswordError(t("guestCannotChangePassword"));
      return;
    }

    // If user doesn't have a password, use setPassword callback
    if (!hasPassword) {
      console.log("Adding password for social-only account");
      await handleSetPasswordLocal({
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });
      return;
    }

    // User has password, use changePassword
    const { error } = await authClient.changePassword({
      newPassword: data.newPassword,
      currentPassword: 'currentPassword' in data ? data.currentPassword : '',
      revokeOtherSessions: true
    })
    if (error) {
      toast.error(t("toast.error"), { description: error?.statusText })
    }
    else {
      toast.success(t("toast.passwordChanged"))
      form.reset();
    }
  }

  const handleDeleteAccount = async () => {
    if (session?.user?.email === guestMail || session?.user?.email === adminMail) {
      setDeleteAccountError(t("guestCannotDelete"));
      return;
    }
    if (deleteAccountConfirmation.trim() !== t("deletePhrase")) {
      setDeleteAccountError(t("deleteConfirmError", { phrase: t("deletePhrase") }));
      return;
    }
    const { error } = await authClient.deleteUser({
      callbackURL: "/landing" // you can provide a callback URL to redirect after deletion
    });
    if (error) {
      toast.error(t("toast.error"), { description: error })
    }
    else {
      toast.success(t("toast.accountDeleted"))
      if (onNavigate) {
        onNavigate("/landing")
      }
    }
  }


  const handleName = async (name: string) => {
    const { error } = await authClient.updateUser({ name })
    if (error) {
      toast.error(t("toast.error"), { description: error.message || error.statusText || t("toast.nameUpdateFailed") })

    }
    else {
      toast.success(t("toast.nameUpdated"))
    }
  }


  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (onUpdateAvatar) {
      const { url, error } = await onUpdateAvatar(file);
      if (error) {
        toast.error(t("toast.uploadFailed"), { description: error });
        return;
      }
      if (url) {
        const { error: updateError } = await authClient.updateUser({ image: url });
        if (updateError) toast.error(t("toast.error"), { description: updateError.statusText });
        else toast.success(t("toast.imageUpdated"));
      }
    } else {
      toast.error(t("toast.avatarUnsupported"));
    }
  }


  return (
    <SettingsHeadar title={title} description={description} >

      {/* Profile Section */}
      <div className="flex flex-col gap-6">
        <section className="space-y-4">
          <h3 className="text-lg font-medium">{t("profilePicture")}</h3>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative group cursor-pointer shrink-0">
              <Avatar className="h-24 w-24 rounded-full border-4 border-background shadow-lg">
                <AvatarImage src={session?.user?.image ?? ''} alt={session?.user?.name ?? ''} className="object-cover" />
                <AvatarFallback className="text-3xl bg-muted">{session?.user?.name ? session?.user?.name[0]?.toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <button onClick={handleAvatarClick} className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring transition-all duration-200">
                <CameraIcon className="w-6 h-6 text-white mb-1" />
                <span className="text-[10px] uppercase font-bold text-white tracking-wider">{t("upload")}</span>
              </button>
            </div>
            <div className="text-sm text-muted-foreground min-w-0 flex-1">
              {t("uploadHint")}
            </div>
            {/* Hidden file input */}
            <input ref={inputFileRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleAvatar(e)} />
          </div>
        </section>

        <section className="space-y-4 max-w-md">
          <h3 className="text-lg font-medium">{t("username")}</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full">
              <FloatingLabelInput id="name" label={t("displayName")} className="w-full bg-background" defaultValue={name} onChange={(e) => { setName(e.target.value) }} />
            </div>
            <Button onClick={() => handleName(name as string)} variant="secondary" className="shrink-0 h-10 px-6 ">{t("update")}</Button>
          </div>
        </section>
      </div>

      {/* Password Section */}
      <section className="pt-8 mt-4 border-t border-border/40">
        <div className="mb-6">
          <h3 className="text-lg font-medium">{t("security")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("securityDescription")}</p>
        </div>

        <div className="max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {hasPassword !== false && (
                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <FloatingLabelInput autoComplete="current-password" id="currentPassword" label={t("currentPassword")} type={showOldPassword ? "text" : "password"} className={`w-full pr-10 bg-background ${hasPassword === null ? 'opacity-50' : ''}`} disabled={hasPassword === null} {...field} />
                        <button type="button" aria-label={showOldPassword ? t("hideCurrent") : t("showCurrent")} aria-pressed={showOldPassword} onClick={() => setShowOldPassword((v) => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring transition-colors">
                          {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage>{(form.formState.errors as any).currentPassword?.message}</FormMessage>
                  </FormItem>
                )} />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput autoComplete="new-password" id="password" label={t("newPassword")} type={showNewPassword ? "text" : "password"} className="w-full pr-10 bg-background" {...field} />
                        <button type="button" aria-label={showNewPassword ? t("hideNew") : t("showNew")} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((v) => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring transition-colors">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage>{form.formState.errors.newPassword?.message}</FormMessage>
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput autoComplete="new-password" id="confirmPassword" label={t("confirmPassword")} type={showConfirmPassword ? "text" : "password"} className="w-full pr-10 bg-background" {...field} />
                        <button type="button" aria-label={showConfirmPassword ? t("hideConfirm") : t("showConfirm")} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring transition-colors">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage>{form.formState.errors.confirmPassword?.message}</FormMessage>
                  </FormItem>
                )} />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <FormResult type="error" message={passwordError} />
                <FormResult type="success" message={passwordSuccess} />
                <Button type="submit" className="min-w-[140px]" disabled={hasPassword === null || isPendingSetPassword}>
                  {isPendingSetPassword ? t("updating") : hasPassword ? t("updatePassword") : t("setPassword")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 mt-8 border-t border-destructive/20">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
          <h3 className="text-lg font-medium text-destructive mb-2">{t("dangerZone")}</h3>
          <p className="text-sm text-destructive/80 mb-6">{t("dangerDescription")}</p>

          <div className="flex gap-4 items-end max-w-md">
            <div className="w-full">
              <FloatingLabelInput
                id="permanently delete"
                label={t("deleteConfirmLabel", { phrase: t("deletePhrase") })}
                type="text"
                className="w-full bg-background border-destructive/30 focus:border-destructive"
                onChange={(e) => { setDeleteAccountConfirmation(e.target.value) }}
              />
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount} className="shrink-0 my-2">{t("deleteAccount")}</Button>
          </div>
          {deleteAccountError && (
            <div className="mt-2 text-sm text-destructive font-medium">{deleteAccountError}</div>
          )}
        </div>
      </section>

    </SettingsHeadar>
  );
};

export default MyAccountSettings;
