import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DatabaseModule } from './modules/database/database.module';
import { DishesModule } from './modules/dishes/dishes.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // Local database module (SQLite by default, switch via DB_TYPE)
    DatabaseModule,

    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    DishesModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
