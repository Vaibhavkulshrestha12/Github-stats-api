import type { StatsCardData } from "../types/index.js";

const MAX = {
  commits: 1000,
  contributions: 1500,
  issues: 200,
  prs: 200,
  repos: 100,
  stars: 500,
} as const;

const WEIGHTS = {
  commits: 0.2,
  contributions: 0.35,
  issues: 0.1,
  prs: 0.15,
  repos: 0.1,
  stars: 0.1,
} as const;

export interface GradeResult {
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  score: number;
}

function normalize(value: number, max: number): number {
  return Math.log(value + 1) / Math.log(max + 1);
}

function toGrade(score: number): GradeResult["grade"] {
  if (score >= 0.9) return "A+";
  if (score >= 0.8) return "A";
  if (score >= 0.7) return "B+";
  if (score >= 0.6) return "B";
  if (score >= 0.5) return "C";
  if (score >= 0.4) return "D";
  return "F";
}

export function calculateGrade(stats: StatsCardData): GradeResult {
  const score =
    normalize(stats.totalContributions, MAX.contributions) *
      WEIGHTS.contributions +
    normalize(stats.totalCommits, MAX.commits) * WEIGHTS.commits +
    normalize(stats.pullRequests, MAX.prs) * WEIGHTS.prs +
    normalize(stats.totalStars, MAX.stars) * WEIGHTS.stars +
    normalize(stats.contributedTo, MAX.repos) * WEIGHTS.repos +
    normalize(stats.issues, MAX.issues) * WEIGHTS.issues;

  return {
    grade: toGrade(score),
    score,
  };
}
