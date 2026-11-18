import type { MeterwiseOverview, MeterwiseProject, MeterwiseProviderAccount, MeterwiseSyncLog } from "./client";

export function widgetSnapshot(overview: MeterwiseOverview, projects: MeterwiseProject[], accounts: MeterwiseProviderAccount[], logs: MeterwiseSyncLog[]) {
  const recent = [...logs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 8);
  return {
    updatedAt: new Date().toISOString(),
    mtdCost: overview.mtdCost,
    projectedMonthlyCost: overview.projectedMonthlyCost,
    connectedProviders: accounts.length,
    activeProjects: projects.filter(p => p.mtdCost > 0).length,
    averageDailySpend: overview.mtdCost / Math.max(overview.daysElapsed, 1),
    recentSyncIssues: recent.filter(log => log.errorCount > 0).length,
    providers: [...overview.providerBreakdown].sort((a, b) => b.mtdCost - a.mtdCost)
      .map(p => ({ name: p.providerName, cost: p.mtdCost })),
    syncActivity: recent.map(log => ({
      id: log.id, provider: log.provider.name, account: log.account.displayName,
      status: log.status, startedAt: log.startedAt, completedAt: log.completedAt,
      recordsIngested: log.recordsIngested, errorCount: log.errorCount,
    })),
  };
}
