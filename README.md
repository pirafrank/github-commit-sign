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
- Avoid storing private SSH keys in CI/CD environments (only the `GITHUB_TOKEN` is needed and can be easily saved as secret string passed as environment variable at pipeline runtime)
- you name it...

I have actually written this to get signed commits in GitHub Actions running [here](https://github.com/pirafrank/fpiracom).

## ⚠️ Before you start

- `GITHUB_TOKEN` must be set as environment variable. It must have write access to the repository you want to commit to
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

## CLI

### Usage examples

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

Multi-file commit is also possible:

- `--changed` and `--deleted` may have multiple file paths, as a single string with space-separated values, or by repeating the option per each file path. All file paths must be relative to the repository root.

```sh
export GITHUB_TOKEN='your_github_token_here'
node github.js commit \
  --owner yourname \
  --repo some_repo_of_yours \
  --branch main \
  --changed 'some_dir/some_file.txt' 'some_other_dir/some_other_file.txt' \
  --deleted 'some_dir/delete_me.txt' \
  --deleted 'some_dir/subdir/delete_me_too.txt' \
  --commitMessage 'stuff'
```

Use `--help` for a full list of available commands and options.

## `npm` module

The module exports the following functions:

- `createCommitOnBranch`
- `checkIfBranchExists`
- `getShaOfParentCommit`

Before using any of them, you must call the `init` function with the `GITHUB_TOKEN` and the GitHub GraphQL URL as arguments.

```js
init("your_github_token_here", "https://api.github.com/graphql");
```

If called without arguments, it will use the `GITHUB_TOKEN` and `GITHUB_GRAPHQL_URL` environment variables.

```js
init();
```

Please refer to `index.js` for the function signatures.

## GitHub Action usage

You can use this module as a GitHub Action. It is a Docker-based action.

### Print help

```yaml
    # Print help
    - name: Print graphQL client help
      uses: pirafrank/github-commit-sign@v0
      with:
        args: "--help"
```

### Commit changes

Requirements when running in a GitHub Actions workflow:

- `--changed` and `--deleted` may have multiple file paths, as a single string with space-separated values, or by repeating the option per each file path. All file paths must be relative to the repository root.
- `GITHUB_TOKEN` must be set in the environment variables with write access to the repository. Go to *Repository Settings > Actions > General > Workflow permissions*, and set `Read and write permissions`.

To commit to other repositories, you may need to override the default `GITHUB_TOKEN` with a personal access token with the `repo` scope. Go to *Profile > Settings > Developer settings > Personal access tokens > Token (classic)*, and Generate new token (classic) with the full-control over `repo` scope. Tip: store the generated token in repository secrets.

```yaml
    # Commit changes...
    - name: Commit changes
      id: commit_changes
      uses: pirafrank/github-commit-sign@v0
      if: ${{ vars.RUN_COMMIT_CHANGES == 'true' }}
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        args: "commit --owner=${{ github.repository_owner }} --repo=${{ github.event.repository.name }} --branch=${{ github.ref_name }} --commitMessage='this is a webflow signed commit' --changed new.txt dummy/subdir/changed.txt --deleted dummy/delete_me.txt another_deleted.txt"
    # ...then use output details in another step
    - name: Print git commit output
      if: ${{ vars.RUN_COMMIT_CHANGES == 'true' }}
      run: |
        echo "Run command: ${{ steps.commit_changes.outputs.command }}"
        echo "Commit URL: ${{ steps.commit_changes.outputs.commitUrl }}"

```

Tip: you may create the strings with the list of added and changed files from a previous step in your workflow.

### Other commands

The action accepts the same commands you can provied to the CLI. Pass them as a single string to the `args` input.

## Tests

Create a `.env` file with your `repo`-scoped `GITHUB_TOKEN`, then run:

```sh
npm test
```

## License

MIT
