import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: false },
    birthDate: { type: String, required: false },
    birthHour: { type: Number, required: false, min: 0, max: 23 },
    birthMinute: { type: Number, required: false, min: 0, max: 59 },
    isProfileComplete: { type: Boolean, required: false, default: false },
    subscription: {
      status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled', 'expired', 'trial'],
        default: 'inactive',
        required: false,
      },
      startDate: { type: Date, required: false },
      endDate: { type: Date, required: false },
      type: {
        type: String,
        enum: ['monthly', 'yearly', 'trial', 'lifetime'],
        required: false,
      },
      paymentMethod: { type: String, required: false },
      autoRenew: { type: Boolean, required: false, default: true },
      cancelledAt: { type: Date, required: false },
      paymentId: { type: String, required: false },
    },
    partner: {
      birthDate: { type: String, required: false },
      birthHour: { type: Number, required: false, min: 0, max: 23 },
      birthMinute: { type: Number, required: false, min: 0, max: 59 },
      geocode: {
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
    },
    status: {
      type: String,
      enum: [
        'registered',
        'idle',
        'awaiting_name',
        'awaiting_birthdate',
        'awaiting_birthhour',
        'awaiting_birthminute',
        'awaiting_city',
      ],
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
    activeSpread: {
      type: String,
      enum: [
        'yes_no_tarot',
        'daily_horoscope',
        'compatibility',
        'natal_chart',
        'transit',
        'synastry',
        'progressed',
        'solar_return',
        'lunar_return',
        'custom',
        'romantic_personality',
        'none'
      ],
      required: false,
      default: 'none',
    },
    activeSpreadData: { type: Schema.Types.Mixed, required: false },
    activeSpreadStartedAt: { type: Date, required: false },
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


