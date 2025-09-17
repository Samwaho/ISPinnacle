import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color?: string
  isClickable?: boolean
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatCard({ title, value, icon, color = "blue", isClickable = false, trend }: StatCardProps) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
    green: "text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
    orange: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400",
    red: "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400",
  }

  const iconColorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 shadow-md hover:shadow-lg",
        isClickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
      )}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm md:text-lg font-semibold text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl md:text-2xl font-bold text-foreground">{value}</h3>
              {trend && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                    trend.isPositive
                      ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950/30"
                      : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/30",
                  )}
                >
                  {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className={cn("flex items-center justify-center size-8 md:size-12 rounded-lg", iconColorClass)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
