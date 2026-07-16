// generate-activity-card.js
// Fetches real commit/PR/issue/review counts via GitHub GraphQL
// and draws a compass/plus-style SVG card using exact numbers.

const TOKEN = process.env.METRICS_TOKEN;
const USERNAME = process.env.GH_USERNAME || "Nethmika4881";

if (!TOKEN) {
  console.error("Missing METRICS_TOKEN environment variable.");
  process.exit(1);
}

const query = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
    }
  }
}`;

async function main() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const c = json.data.user.contributionsCollection;
  const commits = c.totalCommitContributions;
  const issues = c.totalIssueContributions;
  const prs = c.totalPullRequestContributions;
  const reviews = c.totalPullRequestReviewContributions;

  const svg = buildCompassSVG({ commits, issues, prs, reviews });
  require("fs").writeFileSync("activity-compass.svg", svg);
  console.log("Wrote activity-compass.svg with:", { commits, issues, prs, reviews });
}

function buildCompassSVG({ commits, issues, prs, reviews }) {
  const values = { commits, issues, prs, reviews };
  const max = Math.max(...Object.values(values), 1);
  const maxArmLength = 130; // px from center to arm tip

  // scale each arm proportionally to its value, with a floor so tiny values are still visible
  const scale = (v) => Math.max(20, (v / max) * maxArmLength);

  const cx = 180, cy = 140;
  const armCommits = scale(commits);   // left
  const armIssues = scale(issues);     // right
  const armPRs = scale(prs);           // down
  const armReviews = scale(reviews);   // up

  const leftX = cx - armCommits;
  const rightX = cx + armIssues;
  const topY = cy - armReviews;
  const bottomY = cy + armPRs;

  const green = "#3fb950";
  const bg = "#0d1117";
  const textColor = "#c9d1d9";
  const labelColor = "#8b949e";

  return `<svg viewBox="0 0 360 280" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Helvetica, Arial, sans-serif">
  <rect width="360" height="280" fill="${bg}" rx="8"/>

  <!-- axis lines -->
  <line x1="${leftX}" y1="${cy}" x2="${rightX}" y2="${cy}" stroke="${green}" stroke-width="2"/>
  <line x1="${cx}" y1="${topY}" x2="${cx}" y2="${bottomY}" stroke="${green}" stroke-width="2"/>

  <!-- endpoint dots -->
  <circle cx="${leftX}" cy="${cy}" r="5" fill="${green}"/>
  <circle cx="${rightX}" cy="${cy}" r="5" fill="${green}"/>
  <circle cx="${cx}" cy="${topY}" r="5" fill="${green}"/>
  <circle cx="${cx}" cy="${bottomY}" r="5" fill="${green}"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="${green}"/>

  <!-- labels -->
  <text x="${cx}" y="${topY - 22}" fill="${textColor}" font-size="16" text-anchor="middle" font-weight="600">${reviews}</text>
  <text x="${cx}" y="${topY - 4}" fill="${labelColor}" font-size="12" text-anchor="middle">Code review</text>

  <text x="${rightX + 14}" y="${cy - 4}" fill="${textColor}" font-size="16" text-anchor="start" font-weight="600">${issues}</text>
  <text x="${rightX + 14}" y="${cy + 14}" fill="${labelColor}" font-size="12" text-anchor="start">Issues</text>

  <text x="${leftX - 14}" y="${cy - 4}" fill="${textColor}" font-size="16" text-anchor="end" font-weight="600">${commits}</text>
  <text x="${leftX - 14}" y="${cy + 14}" fill="${labelColor}" font-size="12" text-anchor="end">Commits</text>

  <text x="${cx}" y="${bottomY + 24}" fill="${textColor}" font-size="16" text-anchor="middle" font-weight="600">${prs}</text>
  <text x="${cx}" y="${bottomY + 42}" fill="${labelColor}" font-size="12" text-anchor="middle">Pull requests</text>
</svg>`;
}

main();
