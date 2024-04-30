const fs = require("fs");
const yargs = require("yargs");
const CURRENT_VERSION = require("./package.json").version;

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
    console.error(`Error appending line to file ${filename}: ${e.message}`);
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
        .catch((error) => {
          console.error("Failed to create commit:", error.message);
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
      checkIfBranchExists(owner, repo, branch)
        .then((response) => {
          const n = response ? "a" : "no";
          console.log(
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
        .catch((error) => {
          console.error("Failed to check if branch exists:", error.message);
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
