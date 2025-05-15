const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const cors = require('cors');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

const app = express();
const router = express.Router();

// Configuration multer pour le stockage temporaire
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Configuration CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin'],
  credentials: true
}));

app.use(express.json());
app.use('/.netlify/functions/server', router);

// Vos routes existantes, adaptées pour Netlify Functions
router.get('/templates', (req, res) => {
  // Implémenter la logique de récupération des templates
  res.json({ templates: {} });
});

router.post('/upload', upload.single('file'), (req, res) => {
  // Implémenter la logique de traitement des fichiers
  res.json({ message: 'File processed' });
});

// Autres routes...

module.exports.handler = serverless(app); 