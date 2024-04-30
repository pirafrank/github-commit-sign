const { exec } = require("child_process");
const {
  repoOwner,
  repoName,
  correctBranch,
  wrongBranch,
} = require("./test.common.js");

describe("github.js", () => {
  describe("commit command", () => {
    test("commit command, good branch", (done) => {
      exec(
        `node github.js commit -o ${repoOwner} -r ${repoName} -b ${correctBranch} -c dummy/file1.txt -m "this is a commit msg"`,
        (error, stdout, stderr) => {
          expect(error).toBeNull();
          expect(stdout).toContain(
            `Commit created: https://github.com/${repoOwner}/${repoName}/commit`
          );
          done();
        }
      );
    }, 10000);

    test("commit command, BAD branch", (done) => {
      exec(
        `node github.js commit -o ${repoOwner} -r ${repoName} -b ${wrongBranch} -c dummy/file1.txt -m "this is a commit msg"`,
        (error, stdout, stderr) => {
          expect(error).not.toBeNull();
          expect(stderr).toMatch(/Failed to create commit:/);
          done();
        }
      );
    }, 10000);
  });

  describe("branch command", () => {
    test("branch command, good branch", (done) => {
      exec(
        `node github.js branch -o ${repoOwner} -r ${repoName} -b ${correctBranch}`,
        (error, stdout, stderr) => {
          expect(error).toBeNull();
          expect(stdout).toContain(
            `Repository ${repoOwner}/${repoName} has a branch named '${correctBranch}'`
          );
          done();
        }
      );
    }, 10000);

    test("branch command, BAD branch", (done) => {
      exec(
        `node github.js branch -o ${repoOwner} -r ${repoName} -b ${wrongBranch}`,
        (error, stdout, stderr) => {
          expect(error).toBeNull();
          expect(stdout).toContain(
            `Repository ${repoOwner}/${repoName} has no branch named '${wrongBranch}'`
          );
          done();
        }
      );
    }, 10000);
  });
});
