import {QuoteProps} from "@workspace/auth/utils/typescript"

const Quote = ({quote}:{quote?:QuoteProps}) => {
  return (
    <div className='h-screen flex justify-center items-center flex-col '>
        <div className='flex flex-col justify-center text-left mx-[10%]'>
            <div className='text-4xl font-bold '>
                {quote?.quote || "The real competitive advantage is not ideas — it’s speed of execution"}
            </div>
            <div className='max-w-md text-left text-2xl font-semibold mt-4 '>
                {quote?.author || "Reid Hoffman"}
            </div>
            <div className='max-w-md text-left text-xl text-gray-400  '>
               {quote?.credential || "Co-founder of LinkedIn"}
            </div>
        </div>
    </div>
  )
}

export default Quote