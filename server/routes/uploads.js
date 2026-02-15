import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/uploads/driver-documents
 * Upload a file to the driver-documents bucket
 * Body: multipart form with 'file' field + 'path' field (the storage path)
 */
router.post('/driver-documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filePath = req.body.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Storage path is required' });
    }

    const { data, error } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file: ' + error.message });
    }

    // Return the file path (not a public URL since bucket is private)
    res.json({ success: true, filePath: data.path });
  } catch (error) {
    console.error('Error in POST /uploads/driver-documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/uploads/vehicle-documents
 * Upload a file to the vehicle-documents bucket
 */
router.post('/vehicle-documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filePath = req.body.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Storage path is required' });
    }

    const { data, error } = await supabase.storage
      .from('vehicle-documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file: ' + error.message });
    }

    res.json({ success: true, filePath: data.path });
  } catch (error) {
    console.error('Error in POST /uploads/vehicle-documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/uploads/signed-url
 * Generate a signed URL for viewing/downloading a private file
 * Query params: bucket, path
 */
router.get('/signed-url', async (req, res) => {
  try {
    const { bucket, path } = req.query;
    if (!bucket || !path) {
      return res.status(400).json({ error: 'Bucket and path are required' });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300); // 5 min expiry

    if (error) {
      console.error('Signed URL error:', error);
      return res.status(500).json({ error: 'Failed to generate signed URL' });
    }

    res.json({ success: true, signedUrl: data.signedUrl });
  } catch (error) {
    console.error('Error in GET /uploads/signed-url:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
