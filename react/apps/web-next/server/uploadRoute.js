// File attach/voice-note/video-note upload + permission-checked serving.
// Ported from app.js's POST /upload and GET /uploads/:file.
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadDir, deleteFile, checkFileAccess } = require('./fileStore');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    if (!req.user) return cb(new Error('No user detected.'));
    const uid = req.user._id;
    const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/\s+/g, '_');
    cb(null, `${uid}_${Date.now()}_${safeName}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }).array('files');

function registerUploadRoutes(app) {
  app.post('/api/upload', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ error: 'unauthenticated' });

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

      try {
        const fileData = req.files.map((f) => ({
          file: `/uploads/${f.filename}`,
          fileName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
          fileType: f.mimetype,
        }));
        res.json({ fileData });
      } catch (error) {
        await Promise.all(req.files.map((f) => deleteFile(f.filename)));
        res.status(500).json({ error: error.message });
      }
    });
  });

  app.get('/uploads/:file', async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).end();
      const fileName = path.basename(req.params.file); // path-traversal guard
      const filePath = path.join(uploadDir, fileName);
      if (!fs.existsSync(filePath)) return res.status(404).end();

      const allowed = await checkFileAccess(`/uploads/${fileName}`, req.user._id.toString());
      if (!allowed) return res.status(403).end();

      res.sendFile(filePath);
    } catch (err) {
      console.error('uploads route error', err);
      res.status(500).end();
    }
  });
}

module.exports = { registerUploadRoutes };
