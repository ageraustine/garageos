// Trust Score types

export interface TrustSignals {
  estimate_accuracy: number;
  verification_rate: number;
  timeliness: number;
  quality: number;
}

export interface TrustScoreResponse {
  score: number | null; // null if building (below minimum jobs)
  signals: TrustSignals;
  job_count: number;
  minimum_jobs: number;
  is_building: boolean;
}
