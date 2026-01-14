import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true })
  googleId: string;

  @Prop({ required: true, unique: true, sparse: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  picture: string;

  @Prop()
  password: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
