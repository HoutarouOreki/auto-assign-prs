import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';

async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    if (context.payload.pull_request === undefined) {
      throw new Error("Can't get pull_request payload. Check you trigger pull_request event");
    }
    const { assignees, number, user: { login: author, type } } = context.payload.pull_request;

    // Get additional assignees apart from the author
    const additionalAssigneesString = core.getInput('assignees', { required: true });
    const additionalAssignees = additionalAssigneesString
      .split(',')
      .map((assigneeName) => assigneeName.trim());

    // don't assign people that are already assigned,
    // and don't assign the author twice (also as additional assignee)
    const peopleToAssign = [author]
      .concat(additionalAssignees
        .filter(additionalAssignee => additionalAssignee != author))
      .filter(assigneeName => !assignees.includes(assigneeName));

    if (peopleToAssign.length == 0) {
      core.info(`No one to assign.`);
      return;
    }

    const octokit = getOctokit(token);
    const result = await octokit.issues.addAssignees({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: number,
      assignees: peopleToAssign
    });
    core.debug(JSON.stringify(result));
    core.info(`@${peopleToAssign} were assigned to the pull request: #${number}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
