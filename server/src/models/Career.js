import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/* ---------- Open positions shown on /careers (managed in Admin → Careers) ---------- */
const openingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true }, // Sourcing, Sales, Operations, Technology, Finance …
    location: { type: String, trim: true }, // e.g. "Jaipur, India" or "Remote"
    type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
    workMode: { type: String, enum: ['On-site', 'Hybrid', 'Remote'], default: 'On-site' },
    experience: String, // e.g. "2–4 years"
    summary: String,
    responsibilities: [String],
    requirements: [String],
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const JobOpening = mongoose.model('JobOpening', openingSchema);

/* ---------- Applications / CVs sent through the website ---------- */
export const APPLICATION_STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'on_hold'];

const applicationSchema = new mongoose.Schema(
  {
    opening: { type: ObjectId, ref: 'JobOpening' }, // empty = general application
    position: { type: String, required: true, trim: true }, // title at the time of applying
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    country: String,
    city: String,
    currentRole: String,
    currentCompany: String,
    experienceYears: String, // "Fresher", "1-2", "3-5" …
    highestQualification: String,
    noticePeriod: String,
    expectedSalary: String,
    linkedin: String,
    portfolio: String,
    coverLetter: String,
    source: String, // how they heard about us
    cv: { name: String, file: String, size: Number, mime: String }, // file = name on disk (private folder)
    consent: { type: Boolean, required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'new', index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    notes: [{ _id: false, by: { type: ObjectId, ref: 'User' }, text: String, at: { type: Date, default: Date.now } }],
    ip: String,
  },
  { timestamps: true }
);
export const JobApplication = mongoose.model('JobApplication', applicationSchema);
