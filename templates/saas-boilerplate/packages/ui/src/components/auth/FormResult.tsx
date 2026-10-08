import { FormResultProps } from '@workspace/auth/utils/typescript';
import { BsExclamationTriangle,BsExclamationCircle } from 'react-icons/bs';
export const FormResult = ({type,message}:FormResultProps) => {
    if (!message) return null
    if (type === 'success') return (
        <div role="status" aria-atomic="true" className=' bg-green-700/15 text-green-700 dark:text-green-400 p-3 text-success flex items-center gap-x-2 text-sm rounded-md'>
            <BsExclamationCircle aria-hidden="true" className='h-4 w-4 shrink-0'/>
            <p>{message}</p>
        </div>
    )
    else return (
        <div role="alert" aria-atomic="true" className='bg-destructive/15 p-3 text-destructive flex items-center gap-x-2 text-sm rounded-md'>
            <BsExclamationTriangle aria-hidden="true" className='h-4 w-4 shrink-0'/>
            <p>{message}</p>
        </div>
    )
}
