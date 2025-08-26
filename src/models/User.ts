import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: false },
    birthDate: { type: String, required: false },
    status: {
      type: String,
      enum: ['registered', 'idle', 'awaiting_name', 'awaiting_birthdate', 'awaiting_city'],
      default: 'registered',
      required: false,
    },
    statusUpdatedAt: { type: Date, required: false },
    lastGeocode: {
      provider: { type: String, enum: ['yandex'], required: false },
      query: { type: String, required: false },
      lat: { type: Number, required: false },
      lon: { type: Number, required: false },
      name: { type: String, required: false },
      precision: { type: String, required: false },
      address: { type: String, required: false },
      timeZone: { type: String, required: false },
      tzone: { type: Number, required: false },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

userSchema.pre('save', function updateTimestamp(next) {
  this.set('updatedAt', new Date());
  next();
});

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: unknown };
export const UserModel = model('User', userSchema);


