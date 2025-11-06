import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";
import { CookieService } from "../services/cookie.service";

/**
 * Auth Cookie Interceptor
 * Automatically sets authentication cookies for responses that contain an accessToken
 *
 * This interceptor checks if the response contains an accessToken property
 * and automatically sets the authentication cookie with the access token.
 */
@Injectable()
export class AuthCookieInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthCookieInterceptor.name);

  constructor(private readonly cookieService: CookieService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Check if response contains accessToken (indicating an auth response)
        if (data && typeof data === "object" && "accessToken" in data && data.accessToken) {
          const cookieConfig = this.cookieService.getCookieConfig();

          if (cookieConfig) {
            // Set authentication cookie
            response.cookie(cookieConfig.name, data.accessToken, cookieConfig.options);

            this.logger.debug(`Auth cookie set: ${cookieConfig.name}`);

            // Return clean response without cookie details
            // Remove the cookie property if it exists (legacy from old implementation)
            const { cookie, ...cleanResponse } = data as any;
            return cleanResponse;
          }
          else {
            this.logger.warn("Cookie config not available, skipping cookie setting");
          }
        }

        return data;
      }),
    );
  }
}
