export interface GroupRanking {
  groupId: string;
  groupName: string;
  position: number | null;
  accumulatedPoints: number;
  exactPredictionsCount: number;
  efficiencyRate: number;
  rankDelta: number;
}

export interface DashboardSummary {
  groupsCount: number;
  pendingMatchesCount: number;
  groupRankings: GroupRanking[];
  totalAccumulatedPoints: number;
}
