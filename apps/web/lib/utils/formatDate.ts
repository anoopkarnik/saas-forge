export function formatDate (date: Date | string | number){
  return new Intl.DateTimeFormat("en-US",{
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(date))
}