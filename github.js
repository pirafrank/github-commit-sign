const fs = require("fs");
const yargs = require("yargs");
const CURRENT_VERSION = require("./package.json").version;
const { info, error, debug } = require("./src/log");

const {
  init,
  checkChangedOrDeletedFiles,
  createCommitOnBranch,
  checkIfBranchExists,
} = require("./index");


const commitCommand = "commit";
const branchCommand = "branch"
const knownCommands = [commitCommand, branchCommand];

const appendLineToFile = (filename, line) => {
  try {
    fs.appendFileSync(filename, `${line}\n`);
  } catch (e) {
    error(`Error appending line to file ${filename}: ${e.message}`);
    throw e;
  }
};

const writeResultToGithubOutputFile = (results) => {
  if (!!process.env.GITHUB_OUTPUT) {
    let line = "";
    results.forEach((result) => {
      line += `${result.label}=${result.value}\n`;
    });
    appendLineToFile(process.env.GITHUB_OUTPUT, line);
  }
};

yargs
  .command(
    commitCommand,
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
      debug("Passed args:", JSON.stringify(argv, null, 2));
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
          info(`Commit created: ${response.commitUrl}`);
          writeResultToGithubOutputFile([
            {
              label: "command",
              value: commitCommand,
            },
            {
              label: "commitUrl",
              value: response.commitUrl,
            },
          ]);
        })
        .catch((err) => {
          error("Failed to create commit:", err.message);
          process.exit(1);
        });
    }
  )
  .command(
    branchCommand,
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
      debug("Passed args:", JSON.stringify(argv, null, 2));
      checkIfBranchExists(owner, repo, branch)
        .then((response) => {
          const n = response ? "a" : "no";
          info(
            `Repository ${owner}/${repo} has ${n} branch named '${branch}'`
          );
          writeResultToGithubOutputFile([
            {
              label: "command",
              value: branchCommand,
            },
            {
              label: "hasBranch",
              value: n.toString(),
            },
          ]);
        })
        .catch((err) => {
          error("Failed to check if branch exists:", err.message);
          process.exit(1);
        });
    }
  )
  .demandCommand()
  .version(CURRENT_VERSION)
  .alias({
    h: "help",
    v: "version",
  })
  .check((argv) => {
    const cmd = argv._[0];
    if (!knownCommands.includes(cmd)) {
      throw new Error(`Unknown command: ${cmd}`);
    }
    return true;
  })
  .check(() => {
    return init();
  })
  .help().argv;
