const fs = require("fs");
const { createClient, cacheExchange, fetchExchange } = require("@urql/core");
const yargs = require("yargs");
const CURRENT_VERSION = require("./package.json").version;

const GITHUB_GRAPHQL_URL =
  process.env.GITHUB_GRAPHQL_URL || "https://api.github.com/graphql";

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  throw new Error("ERROR: GITHUB_TOKEN environment variable not set.");
}

const client = createClient({
  url: GITHUB_GRAPHQL_URL,
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  },
});

function arrayHasElements(array) {
  return (array && Array.isArray(array) && array.length > 0)
}

function extractChangedOrDeletedFiles(changedFiles, deletedFiles) {
  const changedFilesExist = arrayHasElements(changedFiles);
  const deletedFilesExist = arrayHasElements(deletedFiles);

  if (!changedFilesExist && !deletedFilesExist) {
    throw new Error("No files specified as changed or deleted. Quitting.");
  }

  return {
    changedFiles: changedFilesExist ? changedFiles : [],
    deletedFiles: deletedFilesExist ? deletedFiles : [],
  }
}

async function fetchBranchData(repoOwner, repoName, branchName) {
  const query = `
    query($owner: String!, $repo: String!, $branch: String!) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $branch) {
          name,
          target {
            oid
          }
        }
      }
    }
  `;

  const variables = {
    owner: repoOwner,
    repo: repoName,
    branch: branchName,
  };

  try {
    const response = await client.query(query, variables);
    return response
  } catch (error) {
    console.error(`Error while trying to fetching data from API: ${error.message}`);
    throw error;
  }
}

async function checkIfBranchExists(repoOwner, repoName, branchName) {
  const response = await fetchBranchData(repoOwner, repoName, branchName);
  // NB. if response.data.repository.ref is null the remote branch does not exist!
  return response?.data?.repository?.ref || null;
}

async function getShaOfParentCommit(repoOwner, repoName, branchName) {
  const response = await fetchBranchData(repoOwner, repoName, branchName);
  return response?.data?.repository?.ref?.target?.oid || null;
}

async function createCommitOnBranch(
  repoOwner, // Owner of the repository
  repoName, // Name of the repository
  branchName, // Name of the branch to commit to
  changedFiles, // Array of paths of new or modified files
  deletedFiles, // Array of paths of tracked deleted files
  commitMessage, // Mandatory commit message
  commitDescription = null // Optional commit description
) {

  const parentCommit = await getShaOfParentCommit(repoOwner, repoName, branchName);
  if (!parentCommit) {
    throw new Error("Could not get SHA of parent commit. Does the branch exist? Aborting.");
  }

  const graphqlRequest = {
    query: `mutation ($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { url } } }`,
    variables: {
      input: {
        branch: {
          repositoryNameWithOwner: repoOwner + "/" + repoName,
          branchName: branchName,
        },
        message: {
          headline: commitMessage,
        },
        fileChanges: {},
        expectedHeadOid: parentCommit,
      },
    },
  };

  ({ changedFiles, deletedFiles } = extractChangedOrDeletedFiles(changedFiles, deletedFiles));
  console.log("Changed files:", JSON.stringify(changedFiles, null, 2));
  console.log("Deleted files:", JSON.stringify(deletedFiles, null, 2));

  if (!commitMessage) { throw new Error("No commit message provided. Aborting."); }

  if (commitDescription) {
    graphqlRequest.variables.input.message.body = commitDescription;
  }

  const changedFilesGraphqlArray = changedFiles.map((file_path) => {
    const contents = fs.readFileSync(file_path, { encoding: "base64" });
    return { path: file_path, contents: contents };
  });
  if (changedFilesGraphqlArray && changedFilesGraphqlArray.length > 0) {
    graphqlRequest.variables.input.fileChanges.additions = changedFilesGraphqlArray;
  }

  const deletedFilesGraphqlArray = deletedFiles.map((file_path) => {
    return { path: file_path };
  });
  if (deletedFilesGraphqlArray && deletedFilesGraphqlArray.length > 0) {
    graphqlRequest.variables.input.fileChanges.deletions = deletedFilesGraphqlArray;
  }

  try {
    const response = await client
      .mutation(graphqlRequest.query, graphqlRequest.variables)
      .toPromise();
    return response;
  } catch (error) {
    console.error(`Error while performing commit action via GraphQL API: ${error.message}`);
    throw error;
  }
}

module.exports = createCommitOnBranch;

yargs
  .command(
    "commit",
    "Create a commit on a branch",
    (yargs) => {
      yargs
        .option("owner", {
          describe: "Owner of the repository",
          demandOption: true,
          type: "string",
        })
        .option("repo", {
          describe: "Name of the repository",
          demandOption: true,
          type: "string",
        })
        .option("branch", {
          describe: "Name of the branch to commit to",
          demandOption: true,
          type: "string",
        })
        .option("changed", {
          describe: "Paths of new or modified files",
          alias: "added",
          type: "array",
        })
        .option("deleted", {
          describe: "Paths of tracked deleted files",
          type: "array",
        })
        .option("commitMessage", {
          describe: "Mandatory commit message",
          demandOption: true,
          type: "string",
        })
        .option("commitDescription", {
          describe: "Optional commit description",
          type: "string",
        })
        .check((argv) => {
          if (!argv.changed && !argv.deleted) {
            throw new Error("Missing required argument: either specify changed or deleted files.");
          }
          extractChangedOrDeletedFiles(argv.changed, argv.deleted);
          return true;
        })
        ;
    },
    (argv) => {
      const {
        owner,
        repo,
        branch,
        changed,
        deleted,
        commitMessage,
        commitDescription,
      } = argv;

      createCommitOnBranch(
        owner,
        repo,
        branch,
        changed,
        deleted,
        commitMessage,
        commitDescription
      )
        .then((response) => {
          console.log(JSON.stringify(response, null, 2));
        })
        .catch((error) => {
          console.error("Failed to create commit:", error.message);
        });
    }
  )
  .command(
    "branch",
    "Check if a branch exists",
    (yargs) => {
      yargs
        .option("owner", {
          describe: "Owner of the repository",
          demandOption: true,
          type: "string",
        })
        .option("repo", {
          describe: "Name of the repository",
          demandOption: true,
          type: "string",
        })
        .option("branch", {
          describe: "Name of the branch to check for existence",
          demandOption: true,
          type: "string",
        });
    },
    (argv) => {
      const { owner, repo, branch } = argv;
      checkIfBranchExists(owner, repo, branch)
        .then((response) => {
          const n = response ? "a" : "no";
          //console.log(JSON.stringify(response, null, 2));
          console.log(
            `Repository ${owner}/${repo} has ${n} branch named '${branch}'`
          );
        })
        .catch((error) => {
          console.error("Failed to check if branch exists:", error.message);
        });
    }
  )
  .demandCommand()
  .version(CURRENT_VERSION)
  .help().argv;
