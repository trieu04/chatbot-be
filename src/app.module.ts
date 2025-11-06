import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module";
import { AppConfigModule } from "./configs/app-config.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
