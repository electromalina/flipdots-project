export interface SlackCommandData {
  command: string;
  text: string;
  user_name?: string;
  channel_name?: string;
  user_id?: string;
  channel_id?: string;
}

export interface SlackResponse {
  text: string;
  blocks?: SlackBlock[];
  response_type?: 'ephemeral' | 'in_channel';
}

export interface SlackBlock {
  type: string;
  text?: any;
  fields?: any[];
  elements?: any[];
}

