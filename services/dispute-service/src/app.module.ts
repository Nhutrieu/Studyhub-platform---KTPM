import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DisputesModule } from './disputes/disputes.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/furnimart',
      {
        serverSelectionTimeoutMS: 5000,
      },
    ),
    DisputesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
