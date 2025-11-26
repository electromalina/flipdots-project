import { SlackResponse } from '../types/slack';
import { GitHubRepoInfo } from '../types/github';

export function createSlackSuccessResponse(githubUrl: string, repoInfo: GitHubRepoInfo): SlackResponse {
  return {
    text: '🎮 Flipboard Upload Successful!',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎮 Flipboard Upload Successful!'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Repository:* ${repoInfo.owner}/${repoInfo.repo}`
          },
          {
            type: 'mrkdwn',
            text: `*Branch:* ${repoInfo.branch}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*GitHub URL:* <${githubUrl}|View Repository>`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🎮 View Doom Game'
            },
            url: githubUrl,
            style: 'primary'
          }
        ]
      }
    ]
  };
}

export function createSlackErrorResponse(message: string): SlackResponse {
  return {
    text: message,
    response_type: 'ephemeral'
  };
}

