import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { Branch, BranchSchema } from './schemas/branch.schema';
import { Order, OrderSchema } from './schemas/order.schema';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from '../common/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    HttpModule,
    AuthModule,
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
