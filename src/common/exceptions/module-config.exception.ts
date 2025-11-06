import { HttpException, HttpStatus } from "@nestjs/common";

export class ModuleConfigException extends HttpException {
  constructor(message: string) {
    super(`Module Configuration Error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
