import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { FooterSectionProps } from "@/lib/ts-types/landing";
import { FooterLinkProps } from "@/lib/ts-types/landing";

const FooterSection = ({footerSection}:{footerSection:FooterSectionProps}) => {
    const [footerTypes, setFooterTypes] = useState<any>([]);
    const {theme} = useTheme();

    useEffect(()=>{
        const types = footerSection.links?.map((footer:FooterLinkProps)=>footer.type);
        setFooterTypes(new Set(types));
    },[theme,footerSection.links])

    
  return (
    <div id="footer" className="w-full container  ">
        <hr className="w-full mx-auto" />
        <div className="w-full flex flex-wrap items-start justify-around gap-4 my-10 ">
            <section className="hidden lg:flex w-1/2 font-cyberdyne">
                <a
                  rel="noreferrer noopener"
                  href="/"
                  className="ml-2 font-bold text-xl flex items-center gap-2"
                >
                  {theme === "dark" ?
                  <Image src={footerSection.darkLogo} alt={footerSection.title} width={30} height={30} /> : 
                  <Image src={footerSection.logo} alt={footerSection.title} width={30} height={30} />}
                  <div className="hidden lg:flex">{footerSection.title}</div>
                </a>
               
            </section>
            {[...footerTypes]?.map((type:string)=>(
                <div key={type} className="flex flex-col gap-2">
                    <h3 className="text-paragraph">{type}</h3>
                    {footerSection.links?.filter(footer => footer.type===type)?.map((item)=>(
                        <div key={item.label}>
                            <a
                                rel="noreferrer noopener"
                                href={item.href}
                                className="opacity-60 hover:opacity-100 text-xs"
                            >
                            {item.label}
                            </a>
                        </div>
                    ))}
                </div>
            ))}
        </div>


        <section className="container pb-14 text-center text-sm opacity-80">
            <h3>
            &copy; 2024 Made by {" "}
            <a
                rel="noreferrer noopener"
                target="_blank"
                href={footerSection.creatorLink}
                className="text-primary transition-all border-primary hover:border-b-2"
            >
                {footerSection.creator}
            </a>
            </h3>
        </section>
    </div>
  );
};

export default FooterSection;