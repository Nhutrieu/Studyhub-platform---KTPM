import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BranchModule } from './branch/branch.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://admin:admin123@mongodb:27017/furnimart?authSource=admin',
      {
        serverSelectionTimeoutMS: 5000,
      },
    ),
    BranchModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

