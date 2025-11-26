export interface Upload {
  id: string;
  timestamp: string;
  github_url: string;
  repository: string;
  branch: string;
  path: string;
  slack_user: string;
  slack_channel: string;
}

export interface SlackData {
  user_name?: string;
  channel_name?: string;
}

