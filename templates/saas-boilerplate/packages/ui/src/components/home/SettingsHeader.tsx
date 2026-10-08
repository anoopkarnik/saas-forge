
const SettingsHeadar = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => {
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 min-w-0 w-full max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

export default SettingsHeadar;