
const SettingsHeadar = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => {
  return (
    <div className="py-8 px-10 overflow-auto scrollbar-none h-full w-full max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

export default SettingsHeadar;