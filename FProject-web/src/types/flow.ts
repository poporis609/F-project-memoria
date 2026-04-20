// Flow API 관련 타입 정의

export interface FlowRequest {
  user_id: string;
  content: string;
  record_date: string;
  tags?: string[];
  s3_key?: string;
}

export interface FlowResponse {
  type: "data" | "answer" | "unknown";
  content: string;
  message: string;
  history_id?: string;
}