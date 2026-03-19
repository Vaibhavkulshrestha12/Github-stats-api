export interface ContributionDay {
  date: string;
  count: number;
}

export interface LanguageStat {
  color: string;
  name: string;
  percentage: number;
  size: number;
}

export interface StreakInfo {
  current: number;
  currentRangeLabel: string;
  longest: number;
  longestRangeLabel: string;
}

export interface GitHubSnapshot {
  contributions: ContributionDay[];
  contributedTo: number;
  createdAt: string;
  currentYearContributions: number;
  displayName: string;
  email: string | null;
  fetchedAt: string;
  issues: number;
  languages: LanguageStat[];
  pullRequests: number;
  totalCommits: number;
  totalContributions: number;
  totalRepos: number;
  totalStars: number;
  streak: StreakInfo;
  username: string;
}

export interface GitHubCoreGraphQLResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              contributionCount: number;
              date: string;
            }>;
          }>;
        };
        totalCommitContributions: number;
      };
      createdAt: string;
      email: string;
      issues: { totalCount: number };
      login: string;
      name: string | null;
      pullRequests: { totalCount: number };
      repositories: {
        nodes: RepositoryNode[];
        pageInfo: {
          endCursor: string | null;
          hasNextPage: boolean;
        };
        totalCount: number;
      };
      repositoriesContributedTo: {
        totalCount: number;
      };
    } | null;
  };
  errors?: Array<{ message: string; type?: string }>;
}

export interface RepositoryNode {
  languages: {
    edges: Array<{
      node: {
        color: string | null;
        name: string;
      };
      size: number;
    }>;
  };
  stargazerCount: number;
}

export interface GitHubRepoPageGraphQLResponse {
  data?: {
    user: {
      repositories: {
        nodes: RepositoryNode[];
        pageInfo: {
          endCursor: string | null;
          hasNextPage: boolean;
        };
      };
    } | null;
  };
  errors?: Array<{ message: string; type?: string }>;
}

export interface StatsCardData {
  contributedTo: number;
  currentStreak: number;
  currentStreakRangeLabel: string;
  issues: number;
  longestStreak: number;
  longestStreakRangeLabel: string;
  pullRequests: number;
  totalCommits: number;
  totalContributions: number;
  totalStars: number;
  username: string;
}

export interface LanguagesCardData {
  languages: LanguageStat[];
  username: string;
}

export interface StreakCardData {
  currentStreak: number;
  currentStreakRangeLabel: string;
  longestStreak: number;
  longestStreakRangeLabel: string;
  totalContributions: number;
  username: string;
}

export interface GraphCardData {
  contributions: ContributionDay[];
  currentYearContributions: number;
  displayName: string;
  email: string | null;
  memberSinceLabel: string;
  totalRepos: number;
  username: string;
}

export type CardData =
  | StatsCardData
  | LanguagesCardData
  | StreakCardData
  | GraphCardData;

export type Theme = "dark";

export interface SVGRenderOptions {
  theme?: Theme;
}

export type ResponseFormat = "json" | "svg";

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}
