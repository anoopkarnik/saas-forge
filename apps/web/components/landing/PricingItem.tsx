import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingPlanProps } from "@/lib/ts-types/landing";

enum PopularPlanType {
    NO = 0,
    YES = 1,
  }
  

const PricingItem = ({pricingPlan}:{pricingPlan:PricingPlanProps}) => {

  return (
    <Card
        key={pricingPlan.title}
        className={
            pricingPlan.popular === true
            ? "drop-shadow-xl shadow-black/10 dark:shadow-white/10 max-w-[400px]"
            : "max-w-[400px]"
        }
        >
            <CardHeader>
              <CardTitle className="flex item-center justify-between">
                {pricingPlan.title}
                {pricingPlan.popular === true ? (
                  <Badge
                    variant="secondary"
                    className="text-sm text-primary"
                  >
                    Most popular
                  </Badge>
                ) : null}
              </CardTitle>
              <div>
                <span className="text-3xl font-bold">{pricingPlan.price}</span>
                <span className="text-muted-foreground"> {pricingPlan.priceType}</span>
              </div>

              <CardDescription>{pricingPlan.description}</CardDescription>
            </CardHeader>
            <CardContent>

                
            </CardContent>

            <hr  />
                
            <CardFooter className="flex">
              <div className="space-y-4">
                {pricingPlan.benefitList?.map((benefit: string) => (
                  <span
                    key={benefit}
                    className="flex"
                  >
                    <Check className="text-green-500" />{" "}
                    <h3 className="ml-2">{benefit}</h3>
                  </span>
                ))}
              </div>
            </CardFooter>
        </Card>
  )
}

export default PricingItem