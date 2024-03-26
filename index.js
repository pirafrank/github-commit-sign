const fs = require("fs");
const {
  createClient,
  cacheExchange,
  fetchExchange
} = require("@urql/core");

let GITHUB_GRAPHQL_URL = null;
let githubToken = null;
let client = null;

/**
 * Initialize the GitHub API client
 * @param {string} token GITHUB_TOKEN, if not provided it will be
 * read from the environment
 * @param {string} apiUrl GitHub GraphQL API URL
 */
function init(token, apiUrl) {
  githubToken = token || process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("ERROR: GITHUB_TOKEN environment variable not set.");
  }

  GITHUB_GRAPHQL_URL =
    apiUrl ||
    process.env.GITHUB_GRAPHQL_URL ||
    "https://api.github.com/graphql";

  client = createClient({
    url: GITHUB_GRAPHQL_URL,
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    },
  });
}

function arrayIsArray(array) {
  return !!array && Array.isArray(array);
}

function arrayHasElements(array) {
  return arrayIsArray(array) && array.length > 0;
}

function removeEmptysFromArray(array) {
  return array.filter((item) =>
    item !== undefined
    && item !== null
    && typeof item === "string"
    && item !== ""
  );
}

function removeDuplicatesFromArray(array) {
  return [...new Set(array)];
}

function checkChangedOrDeletedFiles(changedFiles, deletedFiles) {
  const changedFilesExist = arrayHasElements(changedFiles);
  const deletedFilesExist = arrayHasElements(deletedFiles);

  if (!changedFilesExist && !deletedFilesExist) {
    throw new Error("No files specified as changed or deleted. Quitting.");
  }

  return true;
}

function extractChangedOrDeletedFiles(changedFiles, deletedFiles) {
  changedFiles = arrayIsArray(changedFiles)
    ? removeDuplicatesFromArray(removeEmptysFromArray(changedFiles))
    : [];
  deletedFiles = arrayIsArray(deletedFiles)
    ? removeDuplicatesFromArray(removeEmptysFromArray(deletedFiles))
    : [];

  return {
    changedFiles: changedFiles,
    deletedFiles: deletedFiles
  };
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
    return response;
  } catch (error) {
    console.error(
      `Error while trying to fetching data from API: ${error.message}`
    );
    throw error;
  }
}

async function checkIfBranchExists(repoOwner, repoName, branchName) {
  const response = await fetchBranchData(repoOwner, repoName, branchName);
  // NB. if response.data.repository.ref is null the remote branch does not exist!
  return !!response?.data?.repository?.ref;
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
  const parentCommit = await getShaOfParentCommit(
    repoOwner,
    repoName,
    branchName
  );
  if (!parentCommit) {
    throw new Error(
      "Could not get SHA of parent commit. Does the branch exist? Aborting."
    );
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

  ({ changedFiles, deletedFiles } = extractChangedOrDeletedFiles(
    changedFiles,
    deletedFiles
  ));
  console.log("Changed files:", JSON.stringify(changedFiles, null, 2));
  console.log("Deleted files:", JSON.stringify(deletedFiles, null, 2));

  if (!commitMessage) {
    throw new Error("No commit message provided. Aborting.");
  }

  if (commitDescription) {
    graphqlRequest.variables.input.message.body = commitDescription;
  }

  const changedFilesGraphqlArray = changedFiles.map((file_path) => {
    const contents = fs.readFileSync(file_path, { encoding: "base64" });
    return { path: file_path, contents: contents };
  });
  if (changedFilesGraphqlArray && changedFilesGraphqlArray.length > 0) {
    graphqlRequest.variables.input.fileChanges.additions =
      changedFilesGraphqlArray;
  }

  const deletedFilesGraphqlArray = deletedFiles.map((file_path) => {
    return { path: file_path };
  });
  if (deletedFilesGraphqlArray && deletedFilesGraphqlArray.length > 0) {
    graphqlRequest.variables.input.fileChanges.deletions =
      deletedFilesGraphqlArray;
  }

  try {
    const response = await client
      .mutation(graphqlRequest.query, graphqlRequest.variables)
      .toPromise();
    return {
      data: response,
      commitUrl: response?.data?.createCommitOnBranch?.commit?.url || null
    };
  } catch (error) {
    console.error(
      `Error while performing commit action via GraphQL API: ${error.message}`
    );
    throw error;
  }
}

module.exports = {
  init,
  checkChangedOrDeletedFiles,
  extractChangedOrDeletedFiles,
  createCommitOnBranch,
  checkIfBranchExists,
  getShaOfParentCommit,
};
