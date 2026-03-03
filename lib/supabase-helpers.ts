export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export function createResponse<T>(
  data: T, 
  status: number = 200
): APIResponse<T> {
  return {
    ok: status >= 200 && status < 300,
    data,
    status
  };
}

export function createErrorResponse(
  error: string, 
  status: number = 500
): APIResponse {
  return {
    ok: false,
    error,
    status
  };
}

export function createSuccessResponse<T>(data: T): APIResponse<T> {
  return createResponse(data, 200);
}

// Clase para crear respuestas HTTP con métodos estáticos
export class ResponseHelper {
  static success<T>(data: T, status: number = 200) {
    return new Response(JSON.stringify({
      ok: true,
      data,
      status
    }), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  static error(message: string, status: number = 500, details?: any) {
    const response = {
      ok: false,
      error: message,
      status,
      ...(details && { details })
    };
    
    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}