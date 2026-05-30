import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AuditLogService } from './audit-log.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuthModule } from '../common/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, AuditLogService],
  exports: [OrdersService, AuditLogService],
})
export class OrdersModule {}
