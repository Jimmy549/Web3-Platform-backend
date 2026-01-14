import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriberDocument = Subscriber & Document;

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: Date.now })
  subscribedAt: Date;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);
