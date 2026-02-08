"use client"
import { QuoteProps } from "@workspace/auth/utils/typescript"
import { motion } from "framer-motion"

const Quote = ({ quote }: { quote?: QuoteProps }) => {
  return (
    <div className='relative h-full w-full flex flex-col justify-center items-center overflow-hidden bg-zinc-900 border-r border-border/50'>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-50" />

      <div className="relative z-10 max-w-xl px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <svg className="mb-8 w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21L14.017 18C14.017 16.896 14.913 16 16.017 16H19.017C19.569 16 20.017 15.552 20.017 15V9C20.017 8.448 19.569 8 19.017 8H15.017C14.465 8 14.017 8.448 14.017 9V11C14.017 11.552 13.569 12 13.017 12H12.017V5H22.017V15C22.017 18.314 19.331 21 16.017 21H14.017ZM5.01697 21L5.01697 18C5.01697 16.896 5.91297 16 7.01697 16H10.017C10.569 16 11.017 15.552 11.017 15V9C11.017 8.448 10.569 8 10.017 8H6.01697C5.46497 8 5.01697 8.448 5.01697 9V11C5.01697 11.552 4.56897 12 4.01697 12H3.01697V5H13.017V15C13.017 18.314 10.331 21 7.01697 21H5.01697Z" />
          </svg>

          <blockquote className='text-3xl md:text-4xl font-bold font-serif leading-tight text-white mb-8 tracking-tight'>
            "{quote?.quote || "The real competitive advantage is not ideas — it’s speed of execution"}"
          </blockquote>

          <div className="flex flex-col gap-1">
            <cite className='not-italic text-lg font-semibold text-white/90'>
              {quote?.author || "Reid Hoffman"}
            </cite>
            <span className='text-sm text-white/50 font-medium uppercase tracking-wider'>
              {quote?.credential || "Co-founder of LinkedIn"}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Quote