export type ApiErrorCode =
  | "CONFIGURATION_ERROR"
  | "DEPENDENCY_UNAVAILABLE"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

export type ApiSuccessEnvelope<TData> = {
  data: TData;
  requestId: string;
};

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function createApiError(
  code: ApiErrorCode,
  message: string,
  requestId = createRequestId(),
): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

export function createApiSuccess<TData>(
  data: TData,
  requestId = createRequestId(),
): ApiSuccessEnvelope<TData> {
  return {
    data,
    requestId,
  };
}
