export interface GroupRanking {
  groupId: string;
  groupName: string;
  position: number;
  accumulatedPoints: number;
}

export interface DashboardSummary {
  groupsCount: number;
  pendingMatchesCount: number;
  groupRankings: GroupRanking[];
  totalAccumulatedPoints: number;
}
