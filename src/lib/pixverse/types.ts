export const PIXVERSE_BASE = "https://app-api.pixverse.ai/openapi/v2";

export type PixverseApiResponse<T> = {
  ErrCode: number;
  ErrMsg: string;
  Resp: T;
};

export type VideoStatus = 1 | 5 | 6 | 7 | 8;

export type VideoResult = {
  id: number;
  status: VideoStatus;
  url?: string;
  prompt?: string;
};

export class PixverseError extends Error {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message);
    this.name = "PixverseError";
  }
}

export async function parsePixverseJson<T>(
  res: Response
): Promise<PixverseApiResponse<T>> {
  const json = (await res.json()) as PixverseApiResponse<T>;
  if (!res.ok) {
    throw new PixverseError(
      json.ErrMsg || `PixVerse HTTP ${res.status}`,
      json.ErrCode
    );
  }
  if (json.ErrCode !== 0) {
    throw new PixverseError(
      json.ErrMsg || "PixVerse request failed",
      json.ErrCode
    );
  }
  return json;
}
