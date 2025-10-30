import { ApplicationConfig, APP_INITIALIZER } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { Observable } from "rxjs";

import { routes } from "./app.routes";
import { ConfigService } from "./services/config.service";

export function initializeApp(configService: ConfigService) {
  return (): Observable<void> => {
    return configService.loadConfigFromBackend();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true,
    },
  ],
};
