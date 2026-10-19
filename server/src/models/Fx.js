import mongoose from 'mongoose';

/*
 * Exchange rates — always stored as "units of currency per 1 USD" (USD = 1).
 * `FxRate` keeps one document (_id: 'latest'); `FxHistory` keeps one snapshot per day for trend / change %.
 */
const fxSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'latest' },
    base: { type: String, default: 'USD' },
    rates: { type: Map, of: Number, default: {} },
    source: String, // open.er-api.com | frankfurter.app | fallback | manual
    providerUpdatedAt: Date, // when the provider last published
    fetchedAt: Date, // when we last fetched successfully
    lastError: String,
    lastErrorAt: Date,
  },
  { timestamps: true }
);
export const FxRate = mongoose.model('FxRate', fxSchema);

const fxHistorySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, unique: true }, // YYYY-MM-DD (UTC)
    rates: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);
export const FxHistory = mongoose.model('FxHistory', fxHistorySchema);
