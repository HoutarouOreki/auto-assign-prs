import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';

async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    if (context.payload.pull_request === undefined) {
      throw new Error("Can't get pull_request payload. Check you trigger pull_request event");
    }
    const { assignees, number, user: { login: author, type } } = context.payload.pull_request;

    const assigneesNames = assignees
      .map(assignee => assignee.login);

    // Get additional assignees apart from the author
    const additionalAssigneesString = core.getInput('assignees', { required: false });
    const additionalAssignees = additionalAssigneesString == null ? [] : additionalAssigneesString
      .split(',')
      .map((assigneeName) => assigneeName.trim())
      .filter(assigneeName => assigneeName.length > 0);

    // don't assign people that are already assigned,
    // and don't assign the author twice (also as additional assignee)
    const peopleToAssign = [author]
      .concat(additionalAssignees
        .filter(additionalAssignee => additionalAssignee != author))
      .filter(assigneeName => !assigneesNames.includes(assigneeName))
      .filter(assigneeName => assigneeName.length > 0);

    core.info('Already assigned: ' + assigneesNames);

    const requestedReviewersString = core.getInput('reviewers', { required: false });
    const requestedReviewers = requestedReviewersString == null ? [] : requestedReviewersString
      .split(',')
      .map((reviewerName) => reviewerName.trim())
      .filter(reviewerName => reviewerName.length > 0)
      .filter(reviewerName => {
        if (reviewerName == author) {
          core.info("Cannot request a review from PR author.");
          return false;
        } else {
          return true;
        }
      });

    const octokit = getOctokit(token);

    if (peopleToAssign.length == 0) {
      core.info(`No one to assign.`);
    } else {
      const assignResult = await octokit.issues.addAssignees({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: number,
        assignees: peopleToAssign
      });
      core.debug(JSON.stringify(assignResult));
      core.info(`${peopleToAssign} were assigned to the pull request: #${number}`);
    }

    if (requestedReviewers.length == 0) {
      core.info(`No one to request for a review.`);
    } else {
      const requestReviewResult = await octokit.pulls.requestReviewers({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: number,
        reviewers: requestedReviewers
      });
      core.debug(JSON.stringify(requestReviewResult));
      core.info(`${requestedReviewers} were requested to review the pull request: #${number}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }

}

run();
