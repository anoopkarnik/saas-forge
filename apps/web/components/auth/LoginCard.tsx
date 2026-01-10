"use client"

import { useState } from 'react'
import {z} from "zod"
import { Card, CardContent, CardFooter, CardHeader } from '@workspace/ui/components/shadcn/card';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@workspace/ui/components/shadcn/button';
import {  useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/shadcn/form'
import { Input } from '@workspace/ui/components/shadcn/input';
import { FormResult } from './FormResult';
import { useRouter } from 'next/navigation'
import LoadingButton from '@workspace/ui/components/misc/LoadingButton';
import { LoginSchema } from '@workspace/auth/utils/zod';
import { LoginCardProps } from '@workspace/auth/utils/typescript';

const LoginCard = ({showEmail,showGoogleProvider,showGithubProvider,showLinkedinProvider,onEmailSubmit,
  onGoogleProviderSubmit,onGithubProviderSubmit,onLinkedinProviderSubmit,errorMessage}
  :LoginCardProps
) => {
  const [pending, setPending] = useState(false)
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues:{
      email: '',
      password: ''
    },
  })


  const router = useRouter();

  async function handleSubmit(data: z.infer<typeof LoginSchema>) {
    setPending(true)
      await onEmailSubmit(data)
      setPending(false)
    
  }

  // async function loginAsGuest(){
  //   setPending(true)
  //   let data = {email: process.env.NEXT_PUBLIC_GUEST_MAIL, password: process.env.NEXT_PUBLIC_GUEST_PASSWORD}
  //   await onEmailSubmit(data)
  //   setPending(false)
      
  // }

  // async function loginAsAdmin(){
  //   setPending(true)
  //   let data = {email: process.env.NEXT_PUBLIC_ADMIN_MAIL, password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD}
    
  //   await onEmailSubmit(data)
  //   setPending(false)
  // }
  
  return (
    <Card className='w-[400px] shadow-xl shadow-white/20'>
      <CardHeader>
        <p className='text-4xl font-bold text-center '>Login</p>
        <div className='text-md font-extralight text-center'>Welcome Back</div>
      </CardHeader>
      {showEmail &&
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
              <div className='space-y-4'>
                <FormField control={form.control} name="email" render={({field})=>(
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input disabled={pending} type="email" placeholder='example@gmail.com'  {...field}/>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="password" render={({field})=>(
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input disabled={pending} placeholder='******' type="password"  {...field}/>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
              </div>
              <button type="button" onClick={()=>router.push('/forgot-password')} className='text-xs text-left cursor-pointer hover:underline'>Forgot Password</button>
              <FormResult type="error" message={errorMessage }/>
              <LoadingButton variant="default" pending={pending}>
                Login
              </LoadingButton>
            </form>
          </Form>
        </CardContent>}
      <CardFooter className='flex rounded-2xl gap-4 flex-col '>
        {showGoogleProvider && <Button className='w-full' onClick={onGoogleProviderSubmit} variant='secondary'> <FcGoogle/></Button>}
        {showGithubProvider && <Button className='w-full' onClick={onGithubProviderSubmit} variant='secondary'><FaGithub/></Button>}
        {showLinkedinProvider && <Button className='w-full' onClick={onLinkedinProviderSubmit} variant='secondary'><FaLinkedin/></Button>}
      </CardFooter>
      {/* <CardFooter className='flex flex-col gap-4 justify-center'>
          <LoadingButton variant="default" pending={pending} onClick={loginAsGuest}>
            Login as Guest
          </LoadingButton> 
          <LoadingButton variant="default" pending={pending} onClick={loginAsAdmin}>
            Login as Admin
          </LoadingButton>         
      </CardFooter> */}
      <CardFooter className='flex justify-center'>
        <button onClick={()=>router.push('/sign-up')} 
        className='text-xs text-center  cursor-pointer hover:underline'>
          Don't have an Account?
        </button>
      </CardFooter>
    </Card>
  )
}

export default LoginCard;