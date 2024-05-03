const {
  repoOwner,
  repoName,
  correctBranch,
  wrongBranch,
} = require("./test.common.js");

const {
  init,
  createCommitOnBranch,
  checkIfBranchExists,
  getShaOfParentCommit,
} = require("./index");

init();

describe("createCommitOnBranch", () => {
  test("createCommitOnBranch, good branch", async () => {
    const result = await createCommitOnBranch(
      repoOwner,
      repoName,
      correctBranch,
      ["dummy/file1.txt", "dummy/file2.txt"], // added files
      [], // deleted files
      "this is a commit msg",
      "the description of the commit"
    );
    //console.log(JSON.stringify(result, null, 2));
    const commitUrl = result?.commitUrl || "";
    expect(commitUrl).toMatch(
      new RegExp(
        "^https://github.com/" +
          repoOwner +
          "/" +
          repoName +
          "/commit/[a-fA-F0-9]{40}$"
      )
    );
  });
  test("createCommitOnBranch, BAD branch", async () => {
    expect(async () => {
      await createCommitOnBranch(
        repoOwner,
        repoName,
        wrongBranch,
        ["dummy/file1.txt", "dummy/file1.txt"], // added files
        [], // deleted files
        "this is a commit msg",
        "the description of the commit"
      );
    }).rejects.toThrow(Error);
  });
});

describe("checkIfBranchExists", () => {
  test("checkIfBranchExists, good branch", async () => {
    const result = await checkIfBranchExists(repoOwner, repoName, correctBranch);
    expect(result).toBeTruthy();
  });
  test("checkIfBranchExists, BAD branch", async () => {
    const result = await checkIfBranchExists(repoOwner, repoName, wrongBranch);
    expect(result).toBeFalsy();
  });
});

describe("getShaOfParentCommit", () => {
  test("getShaOfParentCommit, good branch", async () => {
    const result = await getShaOfParentCommit(repoOwner, repoName, correctBranch);
    expect(result).toMatch(/[a-f0-9]{40}/);  // commit hash is 40 characters long
  });
  test("getShaOfParentCommit, BAD branch", async () => {
    const result = await getShaOfParentCommit(repoOwner, repoName, wrongBranch);
    expect(result).toBeNull();
  });
});
