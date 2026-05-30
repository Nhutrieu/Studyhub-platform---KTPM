import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : {};
    
    // Extract message from different exception formats
    let message = exception.message || 'Internal Server Error';
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      // If exceptionResponse has a message, use it
      if ('message' in exceptionResponse) {
        const responseMessage = (exceptionResponse as any).message;
        if (Array.isArray(responseMessage)) {
          // Validation errors are arrays
          message = responseMessage.join(', ');
        } else if (typeof responseMessage === 'string') {
          message = responseMessage;
        }
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      data: null,
      ...(typeof exceptionResponse === 'object' && exceptionResponse && !('message' in exceptionResponse) ? exceptionResponse : {}),
    });
  }
}


