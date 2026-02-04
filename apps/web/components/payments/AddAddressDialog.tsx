"use client"

import { Button } from '@workspace/ui/components/shadcn/button'
import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/shadcn/dialog'
import { CoinsIcon, MapPinIcon } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod';
import  {Form, FormField, FormItem, FormMessage, FormControl, FormLabel} from '@workspace/ui/components/shadcn/form'
import { Input } from '@workspace/ui/components/shadcn/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {Loader2} from 'lucide-react'
import { billingAddressSchemaType, billingAddressSchema } from '@/lib/zod/billing'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/shadcn/select'
import {toast} from 'sonner'
import { useTRPC } from '@/trpc/client'
import CustomDialogHeader from '@workspace/ui/components/misc/CustomDialogHeader'
import z from 'zod'

const AddAddressDialog = () => {

    const [countryCodes, setCountryCodes] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const trpc = useTRPC()
    const [existingAddress, setExistingAddress] = useState<billingAddressSchemaType | null>(null)
    const { data } = useQuery(trpc.billing.getCountryCodes.queryOptions())
    const { data: addressData } = useQuery(trpc.billing.getBillingAddress.queryOptions())
    const queryClient = useQueryClient();

    useEffect(()=>{
      const getCountries = async () => {
        setCountryCodes(data?.sort((a,b)=>a.localeCompare(b)) || [])
      }
      getCountries()
    },[data])

    const form = useForm<billingAddressSchemaType>({
      resolver: zodResolver(billingAddressSchema),
      defaultValues: existingAddress || {}
    })

    useEffect(() => {
      if (open) {
          const fetchAddress = async () => {
            if(addressData){
              setExistingAddress(addressData)
              form.reset(addressData)
            }
          }
          fetchAddress()
      }
    }, [open,form])

    const updateAddress = useMutation(
        trpc.billing.updateBillingAddress.mutationOptions({
            onSuccess: async () => {
                 toast.success("Billing Address Updated Successfully")
            },
            onError: () => {
                toast.error("Failed to update Billing Address")
            }
        })
    )

    const isPending = updateAddress.isPending

    const onSubmit = (values: z.infer<typeof billingAddressSchema>) => {
        updateAddress.mutate(values)
    }



  return (
    <Dialog open={open} onOpenChange={(open)=>{form.reset();setOpen(open)}}>
        <DialogTrigger asChild>
            <Button className='w-full'>
              <MapPinIcon className='mr-2 h-5 w-5'/>{"Add/Edit Billing Address"} 
            </Button>
        </DialogTrigger>
        <DialogContent className='px-0 '>
          <CustomDialogHeader
            icon={CoinsIcon}
            title='Add your billing address'
            subTitle='Add your Billing Address for you transactions'
          />
          <div className='px-6'>
            <Form {...form}>
              <form className='space-y-4 w-full overflow-y-auto' onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                  control={form.control}
                  name="name"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        Name
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                        <Input className='bg-background' {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        Billing Email
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                        <Input className='bg-background' {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        Street
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                        <Input className='bg-background' {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="city"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        City
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                        <Input className='bg-background' {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="country"
                  render={() => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        Country
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                      <Controller
                        name="country"
                        control={form.control}
                        rules={{ required: 'Country is required' }}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                            <SelectContent>
                              {
                                countryCodes.map((country)=>(
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        )}
                      />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="state"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        State
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                        <Input className='bg-background' {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="zipcode"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel className='flex gap-1 items-center'>
                        Zipcode
                        <p className='text-xs text-primary'>(required)</p>
                      </FormLabel>
                      <FormControl>
                        <Input className='bg-background' {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <Button type="submit" className='w-full' disabled={isPending}>
                  {!isPending && "Proceed"}
                  {isPending && <Loader2 className='animate-spin'/>}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
    </Dialog>
  )
}

export default AddAddressDialog