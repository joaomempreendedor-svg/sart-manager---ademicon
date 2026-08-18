import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt_0", className)} {...props} />

));

<think>Initial files ranking:

src/pages/consultor/DailyMetrics.tsx: 0.99

src/App.tsx: 0.93

src/pages/consultor/Dashboard.tsx: 0.90

src/components/gestor/DailyMetricConfigModal.tsx: 0.90

src/pages/gestor/MetricsConfig.tsx: 0.88

src/pages/secretaria/SecretariaDailyChecklist.tsx: 0.88

src/context/AppContext.tsx: 0.87

src/components/MetricCard.tsx: 0.85

src/pages/consultor/DailyChecklist.tsx: 0.85

src/components/ConsultorSidebar.tsx: 0.84

src/types.ts: 0.82

src/pages/Dashboard.tsx: 0.75

src/components/GestorSidebar.tsx: 0.71

src/components/consultor/DailyChecklistDisplay.tsx: 0.68

src/components/ConsultorLayout.tsx: 0.65

src/components/GestorLayout.tsx: 0.56

src/context/AuthContext.tsx: 0.56

src/layouts/ProtectedLayout.tsx: 0.53

src/utils/dateUtils.ts: 0.47

src/data/consultantGoals.ts: 0.47

src/pages/GoalsConfig.tsx: 0.47

src/pages/Home.tsx: 0.41

src/lib/supabase.ts: 0.41

src/pages/gestor/DailyChecklistMonitoring.tsx: 0.41

src/layouts/SecretariaLayout.tsx: 0.41

src/integrations/supabase/client.ts: 0.38

src/data/checklistData.ts: 0.35

src/components/Header.tsx: 0.32

supabase/functions/manage-daily-checklist-item/index.ts: 0.32

src/pages/gestor/DailyChecklistConfig.tsx: 0.32

src/components/CalendarView.tsx: 0.27

src/components/calendar/WeekViewGrid.tsx: 0.25

src/pages/gestor/GestorTasksPage.tsx: 0.25

src/pages/gestor/SecretariaTasksConfig.tsx: 0.22

src/lib/utils.tsx: 0.20

src/main.tsx: 0.20

src/utils/authUtils.ts: 0.18

src/pages/secretaria/SecretariaDashboard.tsx: 0.18

.gitignore: 0.18

src/components/DailyChecklistItemResourceModal.tsx: 0.18

public/favicon.svg: 0.16

src/utils/commissionUtils.ts: 0.16

README.md: 0.13

public/sounds/celebration.mp3: 0.05</think><think>Re-ranking the files. Please wait a moment...

Reasoning: undefined

</think><dyad-codebase-context files="src/pages/consultor/DailyMetrics.tsx,src/App.tsx,src/pages/consultor/Dashboard.tsx,src/components/gestor/DailyMetricConfigModal.tsx,src/pages/gestor/MetricsConfig.tsx,src/pages/secretaria/SecretariaDailyChecklist.tsx,src/context/AppContext.tsx,src/components/MetricCard.tsx,src/pages/consultor/DailyChecklist.tsx,src/components/ConsultorSidebar.tsx,src/types.ts,src/pages/Dashboard.tsx,src/components/GestorSidebar.tsx,src/components/consultor/DailyChecklistDisplay.tsx,src/components/ConsultorLayout.tsx,src/components/GestorLayout.tsx,src/context/AuthContext.tsx,src/layouts/ProtectedLayout.tsx,src/utils/dateUtils.ts,src/data/consultantGoals.ts,src/pages/GoalsConfig.tsx,src/pages/Home.tsx,src/lib/supabase.ts,src/pages/gestor/DailyChecklistMonitoring.tsx,src/layouts/SecretariaLayout.tsx,src/integrations/supabase/client.ts,src/data/checklistData.ts,src/components/Header.tsx,supabase/functions/manage-daily-checklist-item/index.ts,src/pages/gestor/DailyChecklistConfig.tsx,src/components/CalendarView.tsx,src/components/calendar/WeekViewGrid.tsx,src/pages/gestor/GestorTasksPage.tsx,src/pages/gestor/SecretariaTasksConfig.tsx,src/lib/utils.tsx,src/main.tsx,src/utils/authUtils.ts,src/pages/secretaria/SecretariaDashboard.tsx,.gitignore,src/components/DailyChecklistItemResourceModal.tsx,public/favicon.svg,src/utils/commissionUtils.ts,README.md,public/sounds/celebration.mp3"></dyad-codebase-context><think>dyad-token-savings?original-tokens=428375.75&smart-context-tokens=99668.25</think>Claro! Peço desculpas, parece que a minha resposta anterior foi cortada.

Vou finalizar a criação do arquivo `src/components/ui/card.tsx`, adicionando a parte que faltava.

<dyad-write path="src/components/ui/card.tsx" description="Finalizando a criação do componente Card.">
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }