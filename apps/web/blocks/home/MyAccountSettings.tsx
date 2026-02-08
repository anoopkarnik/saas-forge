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

import SettingsHeadar from "@/components/home/SettingsHeader";
import { authClient, useSession } from "@workspace/auth/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { ResetPasswordSettingsSchema, AddPasswordSchema } from "@workspace/auth/utils/zod";
import { toast } from "sonner";
import { FormResult } from "@/components/auth/FormResult";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";


const MyAccountSettings = () => {

  const { pending, data: session } = useSession();

  const [name, setName] = useState<string>(session?.user?.name as string)
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null); // null = loading

  const router = useRouter();
  const trpc = useTRPC();

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

  // tRPC mutation for setting password (social-only accounts)
  const setPasswordMutation = useMutation(
    trpc.home.setPassword.mutationOptions({
      onSuccess: async () => {
        toast.success("Password added successfully!");
        setHasPassword(true); // Update state so form switches to change password mode
        form.reset();
      },
      onError: (error) => {
        toast.error("Failed to add password", { description: error.message });
      },
    })
  );



  const inputFileRef = useRef<HTMLInputElement>(null);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');

  const title = "My Account"
  const description = "For modifying Email, you need to verify your new email address"


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
      toast.error("Unauthorized", { description: "Session not loaded. Try again in a second." });
      return;
    }
    setPasswordError("");
    setPasswordSuccess("");
    if (session?.user?.email === process.env.NEXT_PUBLIC_GUEST_MAIL || session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_MAIL) {
      setPasswordError("Guest account cannot modify password");
      return;
    }

    // If user doesn't have a password, use setPassword mutation
    if (!hasPassword) {
      console.log("Adding password for social-only account");
      await setPasswordMutation.mutateAsync({
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
      toast.error("Error", { description: error?.statusText })
    }
    else {
      toast.success("Successfully modified password")
      form.reset();
    }
  }

  const handleDeleteAccount = async () => {
    if (session?.user?.email === process.env.NEXT_PUBLIC_GUEST_MAIL || session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_MAIL) {
      setDeleteAccountError("Guest account cannot be deleted");
      return;
    }
    if (deleteAccountConfirmation !== 'permanently delete') {
      setDeleteAccountError("Please type 'permanently delete' to confirm");
      return;
    }
    const { error } = await authClient.deleteUser({
      callbackURL: "/landing" // you can provide a callback URL to redirect after deletion
    });
    if (error) {
      toast.error("Error", { description: error })
    }
    else {
      toast.success("Successfully deleted Account")
      router.push("/landing")
    }
  }


  const handleName = async (name: string) => {
    const { error } = await authClient.updateUser({ name })
    if (error) {
      toast.error("Error", { description: error })

    }
    else {
      toast.success("Successfully modified name")
    }
  }


  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.append("file", file, file.name);


    const resp = await fetch("/api/settings/modifyAvatar", {
      method: "POST",
      body: formData,
    });
    if (!resp.ok) {
      toast.error("Upload failed");
      return;
    }

    const blob = await resp.json(); // { url, ... }

    const { error } = await authClient.updateUser({ image: blob.url });
    if (error) toast.error("Error", { description: error });
    else toast.success("Successfully Updated Image");
  }


  return (
    <SettingsHeadar title={title} description={description} >

      {/* Profile Section */}
      <div className="flex flex-col gap-6">
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Profile Picture</h3>
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer shrink-0">
              <Avatar className="h-24 w-24 rounded-full border-4 border-background shadow-lg">
                <AvatarImage src={session?.user?.image ?? ''} alt={session?.user?.name ?? ''} className="object-cover" />
                <AvatarFallback className="text-3xl bg-muted">{session?.user?.name ? session?.user?.name[0]?.toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <button onClick={handleAvatarClick} className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200">
                <CameraIcon className="w-6 h-6 text-white mb-1" />
                <span className="text-[10px] uppercase font-bold text-white tracking-wider">Upload</span>
              </button>
            </div>
            <div className="text-sm text-muted-foreground w-64">
              Click the image to upload a new photo. standard formats (JPG, PNG) are supported.
            </div>
            {/* Hidden file input */}
            <input ref={inputFileRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleAvatar(e)} />
          </div>
        </section>

        <section className="space-y-4 max-w-md">
          <h3 className="text-lg font-medium">Username</h3>
          <div className="flex gap-3 items-end">
            <div className="w-full">
              <FloatingLabelInput id="name" label="Display Name" className="w-full bg-background" defaultValue={name} onChange={(e) => { setName(e.target.value) }} />
            </div>
            <Button onClick={() => handleName(name as string)} variant="secondary" className="shrink-0 h-10 px-6 ">Update</Button>
          </div>
        </section>
      </div>

      {/* Password Section */}
      <section className="pt-8 mt-4 border-t border-border/40">
        <div className="mb-6">
          <h3 className="text-lg font-medium">Security</h3>
          <p className="text-sm text-muted-foreground mt-1">Manage your password and authentication methods.</p>
        </div>

        <div className="max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {hasPassword !== false && (
                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <FloatingLabelInput id="currentPassword" label="Current Password" type={showOldPassword ? "text" : "password"} className={`w-full pr-10 bg-background ${hasPassword === null ? 'opacity-50' : ''}`} disabled={hasPassword === null} {...field} />
                        <button type="button" onClick={() => setShowOldPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                          {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage>{(form.formState.errors as any).currentPassword?.message}</FormMessage>
                  </FormItem>
                )} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput id="password" label="New Password" type={showNewPassword ? "text" : "password"} className="w-full pr-10 bg-background" {...field} />
                        <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
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
                        <FloatingLabelInput id="confirmPassword" label="Confirm Password" type={showConfirmPassword ? "text" : "password"} className="w-full pr-10 bg-background" {...field} />
                        <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
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
                <Button type="submit" className="min-w-[140px]" disabled={hasPassword === null || setPasswordMutation.isPending}>
                  {setPasswordMutation.isPending ? "Updating..." : hasPassword ? "Update Password" : "Set Password"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="pt-8 mt-8 border-t border-destructive/20">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
          <h3 className="text-lg font-medium text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-destructive/80 mb-6">Permanently delete your account and all associated data. This action cannot be undone.</p>

          <div className="flex gap-4 items-end max-w-md">
            <div className="w-full">
              <FloatingLabelInput
                id="permanently delete"
                label="Type 'permanently delete' to confirm"
                type="text"
                className="w-full bg-background border-destructive/30 focus:border-destructive"
                onChange={(e) => { setDeleteAccountConfirmation(e.target.value) }}
              />
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount} className="shrink-0 my-2">Delete Account</Button>
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