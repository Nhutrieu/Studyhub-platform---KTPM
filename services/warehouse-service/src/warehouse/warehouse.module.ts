import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { Warehouse, WarehouseSchema } from './schemas/warehouse.schema';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthModule } from '../common/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Warehouse.name, schema: WarehouseSchema }]),
    AuthModule,
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService, RolesGuard],
  exports: [WarehouseService],
})
export class WarehouseModule {}

