import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/shadcn/avatar";
import { useEffect, useRef, useState } from "react";
import { CameraIcon,Eye, EyeOff } from "lucide-react";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";
import { Button } from "@workspace/ui/components/shadcn/button";
import {   Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage, } from '@workspace/ui/components/shadcn/form';
import { useForm } from 'react-hook-form';
import {z} from "zod"
import { zodResolver } from '@hookform/resolvers/zod';

import SettingsHeadar from "@/components/home/SettingsHeader";
import { authClient, useSession} from "@workspace/auth/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { ResetPasswordSchema } from "@workspace/auth/utils/zod";
import { toast } from "sonner";
import { FormResult } from "@/components/auth/FormResult";

  
  const MyAccountSettings = () => {

    const { pending, data:session } = useSession();
    
    const [user, setUser] = useState<any>(null)
    const [name, setName] = useState<string>(session?.user?.name as string)
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const router = useRouter();

    

    const inputFileRef = useRef<HTMLInputElement>(null);
    const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');

    const title = "My Account"
    const description = "For modifying Email, you need to verify your new email address"


    const form = useForm<z.infer<typeof ResetPasswordSchema>>({
      resolver: zodResolver(ResetPasswordSchema),
      defaultValues:{
        oldPassword: '',
        password: '',
        confirmPassword: '',
      },
    })

    const [passwordError, setPasswordError] = useState<string>("")
    const [passwordSuccess, setPasswordSuccess] = useState<string>("")
    const [deleteAccountError, setDeleteAccountError] = useState<string>("")

    const handleAvatarClick = () => {
      inputFileRef.current?.click(); // Programmatically open file input
    };

    async function handleSubmit(data: z.infer<typeof ResetPasswordSchema>) {
      if (pending || !session?.user) {
        toast.error("Unauthorized", { description: "Session not loaded. Try again in a second." });
        return;
      }
      setPasswordError("");
      setPasswordSuccess("");
      if(session?.user?.email === process.env.NEXT_PUBLIC_GUEST_MAIL || session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_MAIL){
        setPasswordError("Guest account cannot modify password");
      }
      else if(!data.confirmPassword){
        setPasswordError("Please confirm your password");
      }
      else if (data.password !== data.confirmPassword) {
        setPasswordError("Passwords do not match");
      }
      else if(data.password){
        const {error} = await authClient.changePassword({
          newPassword: data.password,
          currentPassword: data.oldPassword,
          revokeOtherSessions: true
        })
        if (error){
          toast.error("Error",{description: error?.statusText} )
  
        }
        else {
          toast.success("Successfully modified password")
        }

      }
    }

    const handleDeleteAccount = async () => {
      if(session?.user?.email === process.env.NEXT_PUBLIC_GUEST_MAIL || session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_MAIL){
        setDeleteAccountError("Guest account cannot be deleted");
        return;
      }
      if(deleteAccountConfirmation !== 'permanently delete'){
        setDeleteAccountError("Please type 'permanently delete' to confirm");
        return;
      }
      const {error} = await authClient.deleteUser({
        callbackURL: "/landing" // you can provide a callback URL to redirect after deletion
      });
      if (error){
        toast.error("Error",{description: error} )
      }
      else{
        toast.success("Successfully deleted Account")
        router.push("/landing")
      }
    }


    const handleName = async (name:string)=>{
      const {error} = await authClient.updateUser({name})
      if (error){
        toast.error("Error",{description: error})

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
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center ">
                <div className="text-xs opacity-50">Profile Pic</div>
                <div className="relative group cursor-pointer">
                  <Avatar className="h-20 w-20 rounded-full border-2 bg-secondary hover:bg-accent2">
                    <AvatarImage src={session?.user?.image?? ''} alt={session?.user?.name?? ''} className="object-cover" />
                    <AvatarFallback className="text-3xl">{session?.user?.name?session?.user?.name[0]?.toUpperCase() :'U'}</AvatarFallback>
                  </Avatar>
                  <button onClick={handleAvatarClick} className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <div><CameraIcon/></div>
                    <div className="text-xs">Upload Photo</div>
                  </button>
                </div>
                    {/* Hidden file input */}
                <input
                  ref={inputFileRef}
                  type="file"
                  className="hidden"
                  accept="image/*" // Accept only images
                  onChange={(e)=>handleAvatar(e)} // Handle file selection
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 mt-4">
              <FloatingLabelInput id="name" label="Username" className="w-full my-2" defaultValue={name} 
              onChange={(e)=>{setName(e.target.value)}}/>
              <Button onClick={()=>handleName(name as string)} className="w-1/4 text-wrap">Update Username</Button>
            </div>
            {/* <div className="flex items-center justify-between gap-4 mt-4">
              <FloatingLabelInput id="email" label="Email" className="flex-grow-1 my-2" defaultValue={email} type="email"
              onChange={(e)=>{setCurrentEmail(e.target.value)}}/>
              <Button onClick={()=>{}} className="w-1/4 text-wrap" >Verify New Email Address</Button>
            </div> */}
            <div className="text-md font-bold mt-10"> Add / Change Password</div>
            <div className= "text-xs opacity-50 pb-2 border-b-2">Add Password if not assigned for Accounts with Social Accounts or change password if already assigned</div>
            <div className="flex flex-col gap-4 mt-4 w-1/2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField control={form.control} name="oldPassword" render={({field})=>(
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <FloatingLabelInput
                            id="currentPassword"
                            label="Current Password"
                            type={showOldPassword ? "text" : "password"}
                            className="w-full my-2 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showOldPassword ? "Hide password" : "Show password"}
                          >
                            {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage>{form.formState.errors.password?.message}</FormMessage>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="password" render={({field})=>(
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <FloatingLabelInput
                            id="password"
                            label="Password"
                            type={showNewPassword ? "text" : "password"}
                            className="w-full my-2 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage>{form.formState.errors.password?.message}</FormMessage>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="confirmPassword" render={({field})=>(
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <FloatingLabelInput
                            id="confirmPassword"
                            label="Confirm Password"
                            type={showConfirmPassword ? "text" : "password"}
                            className="w-full my-2 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage>{form.formState.errors.confirmPassword?.message}</FormMessage>
                    </FormItem>
                  )}/>
                   <FormResult type="error" message={passwordError }/>
                   <FormResult type="success" message={passwordSuccess}/> 
                  <Button type="submit" className="w-1/2 text-wrap my-4" >
                  Modify Password
                  </Button>
                </form>
              </Form>
            </div>
            <div className="text-md font-bold mt-10"> Delete Account</div>
            <div className= "text-xs opacity-50 pb-2 border-b-2">Once you delete your account and account data, there is no going back.</div>
            <div className="flex flex-col gap-4 mt-4 w-1/2">
              <FloatingLabelInput id="permanently delete" label="Type 'permanently delete'" type="name" className="w-full my-2"
              onChange={(e)=>{setDeleteAccountConfirmation(e.target.value)}}/>
              <FormResult type="error" message={deleteAccountError }/>
              <Button variant="destructive" onClick={handleDeleteAccount} className="w-1/2 text-wrap">Delete Account</Button>
            </div>
            <div className="text-md font-bold border-b-2 pb-4 mt-10"> Account Security</div>
        </SettingsHeadar>
    );
  };

  export default MyAccountSettings;