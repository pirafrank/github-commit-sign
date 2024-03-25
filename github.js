const fs = require("fs");
const yargs = require("yargs");
const CURRENT_VERSION = require("./package.json").version;

const {
  init,
  checkChangedOrDeletedFiles,
  createCommitOnBranch,
  checkIfBranchExists,
} = require("./index");

const appendLineToFile = (filename, line) => {
  fs.appendFile(filename, `${line}\n`, function (err) {
    if (err) throw err;
    console.log(`Saved data to ${filename}.`);
  });
};

yargs
  .command(
    "commit",
    "Create a commit on a branch",
    (yargs) => {
      yargs
        .option("owner", {
          describe: "Owner of the repository",
          demandOption: true,
          alias: "o",
          type: "string",
        })
        .option("repo", {
          describe: "Name of the repository",
          demandOption: true,
          alias: "r",
          type: "string",
        })
        .option("branch", {
          describe: "Name of the branch to commit to",
          demandOption: true,
          alias: "b",
          type: "string",
        })
        .option("changed", {
          describe: "Paths of new or modified files",
          alias: "c",
          type: "array",
        })
        .option("deleted", {
          describe: "Paths of tracked deleted files",
          alias: "d",
          type: "array",
        })
        .option("commitMessage", {
          describe: "Mandatory commit message",
          demandOption: true,
          alias: "m",
          type: "string",
        })
        .option("commitDescription", {
          describe: "Optional commit description",
          type: "string",
        })
        .check((argv) => {
          if (!argv.changed && !argv.deleted) {
            throw new Error(
              "Missing required argument: either specify changed or deleted files."
            );
          }
          return checkChangedOrDeletedFiles(argv.changed, argv.deleted);
        });
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

      init();
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
          console.log(`Commit created: ${response.commitUrl}`);
          if (!!process.env.GITHUB_OUTPUT) {
            appendLineToFile(
              process.env.GITHUB_OUTPUT,
              `commitUrl=${response.commitUrl}`
            );
          }
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
          alias: "o",
          type: "string",
        })
        .option("repo", {
          describe: "Name of the repository",
          demandOption: true,
          alias: "r",
          type: "string",
        })
        .option("branch", {
          describe: "Name of the branch to check for existence",
          demandOption: true,
          alias: "b",
          type: "string",
        });
    },
    (argv) => {
      const { owner, repo, branch } = argv;
      init();
      checkIfBranchExists(owner, repo, branch)
        .then((response) => {
          const n = response ? "a" : "no";
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
  .alias({
    h: "help",
    v: "version"
  })
  .help().argv;
