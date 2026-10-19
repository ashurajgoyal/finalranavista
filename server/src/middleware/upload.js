import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/*
 * Local disk storage — fine for development & small deployments.
 * For production swap this for S3 / Cloudinary / Cloudflare R2 (multer-s3 etc.)
 * and keep returning a public URL in the same `{ name, url }` shape.
 */
export const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(path.join(UPLOAD_DIR, 'files'), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'invoices'), { recursive: true });
// CVs are PRIVATE — this folder is never served statically; admins download through an authenticated route.
export const CV_DIR = path.join(UPLOAD_DIR, 'cvs');
fs.mkdirSync(CV_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'files')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
});

const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) =>
    allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('File type not allowed')),
});

export const fileToRef = (f) => ({ name: f.originalname, url: `/uploads/files/${f.filename}` });

/* ---------- Careers: CV upload (PDF / DOC / DOCX, max 5 MB, private folder) ---------- */
const CV_TYPES = ['.pdf', '.doc', '.docx'];
export const uploadCv = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CV_DIR),
    filename: (req, file, cb) => cb(null, `cv-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    CV_TYPES.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(Object.assign(new Error('Please upload your CV as a PDF, DOC or DOCX file.'), { status: 400 })),
});

/* ---------- Private generated documents (supplier NDAs, registration invoices) — served only through auth routes ---------- */
export const PRIVATE_DIR = path.join(UPLOAD_DIR, 'private');
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

/* ---------- Public image upload (sourcing requests: product photos, max 6 × 8 MB) ---------- */
const IMAGE_TYPES = ['.png', '.jpg', '.jpeg', '.webp'];
export const uploadImages = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) =>
    IMAGE_TYPES.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(Object.assign(new Error('Please upload product photos as JPG, PNG or WEBP images.'), { status: 400 })),
});
