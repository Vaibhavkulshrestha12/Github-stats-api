import { getEnv } from "../config/env.js";
import type {
  ContributionDay,
  GitHubCoreGraphQLResponse,
  GitHubRepoPageGraphQLResponse,
  GitHubSnapshot,
  LanguageStat,
  RepositoryNode,
  StreakInfo,
} from "../types/index.js";
import { getOrSetAsync } from "../utils/cache.js";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const SNAPSHOT_TTL_MS = 60 * 60 * 1000;
const GITHUB_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "github-stats-api/2.0",
} as const;

const CORE_QUERY = `
query UserSnapshot($username: String!, $from: DateTime!, $to: DateTime!, $repoCursor: String) {
  user(login: $username) {
    login
    name
    email
    createdAt
    repositories(
      first: 100
      after: $repoCursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        stargazerCount
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
      }
    }
    pullRequests(states: [OPEN, CLOSED, MERGED]) {
      totalCount
    }
    issues(states: [OPEN, CLOSED]) {
      totalCount
    }
    repositoriesContributedTo(
      contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      includeUserRepositories: true
      first: 1
    ) {
      totalCount
    }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`.trim();

const REPO_PAGE_QUERY = `
query RepoPage($username: String!, $repoCursor: String) {
  user(login: $username) {
    repositories(
      first: 100
      after: $repoCursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        stargazerCount
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
      }
    }
  }
}
`.trim();

function getDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCFullYear(from.getUTCFullYear() - 1);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function createHttpError(
  message: string,
  statusCode: number
): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function validateUsername(username: string): string {
  const normalized = username.trim();
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(normalized)) {
    throw createHttpError("Invalid GitHub username format.", 400);
  }

  return normalized;
}

async function runGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const { githubToken } = getEnv();

  let response: Response;
  try {
    response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        ...GITHUB_HEADERS,
        Authorization: `Bearer ${githubToken}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw createHttpError("GitHub API is temporarily unreachable.", 502);
  }

  if (response.status === 401) {
    throw createHttpError("Server GitHub token is invalid.", 500);
  }

  if (response.status === 403) {
    throw createHttpError("GitHub API rate limit blocked the request.", 502);
  }

  if (!response.ok) {
    throw createHttpError("GitHub API request failed.", 502);
  }

  const json = (await response.json()) as { errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    const message = json.errors.map((entry) => entry.message).join("; ");
    if (/Could not resolve to a User/i.test(message)) {
      throw createHttpError("GitHub user not found.", 404);
    }

    throw createHttpError("GitHub GraphQL query failed.", 502);
  }

  return json as T;
}

function collectLanguages(
  languages: Map<string, { color: string; size: number }>,
  repositories: RepositoryNode[]
): void {
  for (const repository of repositories) {
    for (const edge of repository.languages.edges) {
      const current = languages.get(edge.node.name);
      if (current) {
        current.size += edge.size;
        continue;
      }

      languages.set(edge.node.name, {
        color: edge.node.color ?? "#8b949e",
        size: edge.size,
      });
    }
  }
}

async function fetchRepoAggregates(
  username: string,
  initialNodes: RepositoryNode[],
  initialCursor: string | null,
  hasNextPage: boolean
): Promise<{ languages: LanguageStat[]; totalStars: number }> {
  const languages = new Map<string, { color: string; size: number }>();
  let totalStars = initialNodes.reduce(
    (sum, repository) => sum + repository.stargazerCount,
    0
  );

  collectLanguages(languages, initialNodes);

  let cursor = initialCursor;
  let nextPage = hasNextPage;

  while (nextPage) {
    const page = await runGraphQL<GitHubRepoPageGraphQLResponse>(
      REPO_PAGE_QUERY,
      {
        repoCursor: cursor,
        username,
      }
    );

    const repositories = page.data?.user?.repositories;
    if (!repositories) {
      break;
    }

    totalStars += repositories.nodes.reduce(
      (sum, repository) => sum + repository.stargazerCount,
      0
    );
    collectLanguages(languages, repositories.nodes);
    cursor = repositories.pageInfo.endCursor;
    nextPage = repositories.pageInfo.hasNextPage;
  }

  const totalLanguageBytes = [...languages.values()].reduce(
    (sum, language) => sum + language.size,
    0
  );

  const rankedLanguages: LanguageStat[] = [...languages.entries()]
    .map(([name, value]) => ({
      color: value.color,
      name,
      percentage:
        totalLanguageBytes === 0
          ? 0
          : Number(((value.size / totalLanguageBytes) * 100).toFixed(2)),
      size: value.size,
    }))
    .sort((left, right) => right.size - left.size)
    .slice(0, 6);

  return {
    languages: rankedLanguages,
    totalStars,
  };
}

function buildStreaks(days: ContributionDay[]): StreakInfo {
  const activeDays = days.filter((day) => day.count > 0);
  if (activeDays.length === 0) {
    return {
      current: 0,
      currentRangeLabel: "No active streak",
      longest: 0,
      longestRangeLabel: "No active streak",
    };
  }

  let longest = 0;
  let longestStart = "";
  let longestEnd = "";

  let currentRun = 0;
  let currentStart = "";
  let previousDate: Date | null = null;

  for (const day of days) {
    if (day.count > 0) {
      const currentDate = new Date(`${day.date}T00:00:00Z`);
      const isConsecutive =
        previousDate !== null &&
        currentDate.getTime() - previousDate.getTime() === 24 * 60 * 60 * 1000;

      if (currentRun === 0 || !isConsecutive) {
        currentRun = 1;
        currentStart = day.date;
      } else {
        currentRun += 1;
      }

      if (currentRun > longest) {
        longest = currentRun;
        longestStart = currentStart;
        longestEnd = day.date;
      }

      previousDate = currentDate;
    } else {
      currentRun = 0;
      currentStart = "";
      previousDate = null;
    }
  }

  let current = 0;
  let currentRangeStart = "";
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index]!;
    if (day.count <= 0) {
      break;
    }

    current += 1;
    currentRangeStart = day.date;
  }

  const latestDate = activeDays[activeDays.length - 1]!.date;
  const currentRangeLabel =
    current > 0 ? `${formatShortDate(currentRangeStart)} - ${formatShortDate(latestDate)}` : "No active streak";

  return {
    current,
    currentRangeLabel,
    longest,
    longestRangeLabel:
      longest > 0
        ? `${formatShortDate(longestStart)} - ${formatShortDate(longestEnd)}`
        : "No active streak",
  };
}

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function countCurrentYearContributions(days: ContributionDay[]): number {
  const currentYear = new Date().getUTCFullYear();
  return days.reduce((sum, day) => {
    return day.date.startsWith(String(currentYear)) ? sum + day.count : sum;
  }, 0);
}

function buildSnapshot(
  username: string,
  response: GitHubCoreGraphQLResponse,
  totalStars: number,
  languages: LanguageStat[]
): GitHubSnapshot {
  const user = response.data?.user;
  if (!user) {
    throw createHttpError("GitHub user not found.", 404);
  }

  const contributions = user.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) =>
      week.contributionDays.map((day) => ({
        count: day.contributionCount,
        date: day.date,
      }))
    )
    .sort((left, right) => left.date.localeCompare(right.date));

  return {
    contributions,
    contributedTo: user.repositoriesContributedTo.totalCount,
    createdAt: user.createdAt,
    currentYearContributions: countCurrentYearContributions(contributions),
    displayName: user.name?.trim() || user.login,
    email: user.email?.trim() || null,
    fetchedAt: new Date().toISOString(),
    issues: user.issues.totalCount,
    languages,
    pullRequests: user.pullRequests.totalCount,
    streak: buildStreaks(contributions),
    totalCommits: user.contributionsCollection.totalCommitContributions,
    totalContributions:
      user.contributionsCollection.contributionCalendar.totalContributions,
    totalRepos: user.repositories.totalCount,
    totalStars,
    username,
  };
}

async function fetchSnapshotFromGitHub(username: string): Promise<GitHubSnapshot> {
  const { from, to } = getDateRange();
  const response = await runGraphQL<GitHubCoreGraphQLResponse>(CORE_QUERY, {
    from,
    repoCursor: null,
    to,
    username,
  });

  const repositories = response.data?.user?.repositories;
  if (!response.data?.user || !repositories) {
    throw createHttpError("GitHub user not found.", 404);
  }

  const repoAggregates = await fetchRepoAggregates(
    username,
    repositories.nodes,
    repositories.pageInfo.endCursor,
    repositories.pageInfo.hasNextPage
  );

  return buildSnapshot(
    username,
    response,
    repoAggregates.totalStars,
    repoAggregates.languages
  );
}

export async function fetchGitHubSnapshot(
  rawUsername: string
): Promise<GitHubSnapshot> {
  const username = validateUsername(rawUsername);

  const snapshot = await getOrSetAsync(
    `snapshot:${username.toLowerCase()}`,
    SNAPSHOT_TTL_MS,
    () => fetchSnapshotFromGitHub(username)
  );

  return snapshot.value;
}
