# GitHub GraphQL API client in Node.js

A thin wrapper to commit on a GitHub repo through their GraphQL APIs. Useful to create signed commits in CI/CD environments.

Offered as node module and CLI tool.

## Why

- Commit changes to a GitHub repository without cloning it locally
- By using the GitHub GraphQL API, we can commit multiple changes at once
- By using GitHub APIs, we can implicitly sign commits via web-flow signing, like vscode.dev does

## Use cases

- Automate the process of committing file additions, changes, or deletions to a GitHub repository without cloning it locally
- Integrate with existing CI/CD pipelines perform signed commits on behalf of the pipeline, without hard-to-setup GPG config
- Avoid storing private SSH keys in CI/CD environments (only the GITHUB_TOKEN is needed and can be easily saved as secret string passed as environment variable at pipeline runtime)
- you name it...

## ⚠️ Before you start

- Changed (or new) files must exist locally
  - for practial reasons, those files must have the same file name and file path as the ones in the repository you are replacing with your commit (or the same file name and file path you want them to have in the repository)
- Deleted files may not exist locally, and their path may just be provided as argument
- GraphQL APIs are not meant to be used to push a lot of code! If that is your case, please consider using a local clone and `git`.

## Requirements

- Node.js (18+)
- A GitHub token with the `repo` scope.
  - The token must be set in the environment variable called `GITHUB_TOKEN`.

Note: in GitHub Actions the `GITHUB_TOKEN` is automatically generated per each run and is available as an environment variable. More info [here](https://docs.github.com/en/actions/security-guides/automatic-token-authentication).

## Installation

```sh
npm install
```

## Usage examples

```sh
export GITHUB_TOKEN='your_github_token_here'
node github.js commit \
  --owner yourname \
  --repo some_repo_of_yours \
  --branch main \
  --added .gitignore \
  --commitMessage 'added .gitignore'
```

```sh
export GITHUB_TOKEN='your_github_token_here'
node github.js commit \
  --owner yourname \
  --repo some_repo_of_yours \
  --branch main \
  --deleted .gitignore \
  --commitMessage 'remove .gitignore'
```

```sh
export GITHUB_TOKEN='your_github_token_here'
node github.js commit \
  --owner yourname \
  --repo some_repo_of_yours \
  --branch main \
  --changed 'some_dir/some_file.txt' \
  --changed 'some_other_dir/some_other_file.txt' \
  --deleted 'some_dir/delete_me.txt' \
  --commitMessage 'stuff'
```

## License

MIT
