
const SettingsHeadar = ({title,description,children}:{title:string, description:string, children: React.ReactNode}) => {
  return (
    <div className="my-10 px-10 overflow-auto scrollbar scrollbar-track-secondary scrollbar-thumb-sidebar">
        <div className="text-2xl ">{title}</div>
        <div className= "text-xs opacity-50 pb-2 border-b-2 mb-4">{description}</div>
        {children}
    </div>
  )
}

export default SettingsHeadar;