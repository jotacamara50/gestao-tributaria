import { KPICards } from "@/components/dashboard/kpi-cards"
import { DashboardCharts } from "@/components/dashboard/charts"

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral da arrecadação e fiscalização do município.
        </p>
      </div>

      <KPICards />
      <DashboardCharts />
    </div>
  )
}
