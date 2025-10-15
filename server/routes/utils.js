import fs from 'fs';
import path from 'path';

/**
 * Utility routes
 */
export function utilsRoutes(server) {
  // API endpoint to read file contents
  server.middlewares.use('/api/read-file', async (req, res, next) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const filePath = url.searchParams.get('path');

      if (!filePath) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing path parameter' }));
        return;
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }

      // Check if it's a file (not a directory)
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Path is not a file' }));
        return;
      }

      // Read file contents
      const content = fs.readFileSync(filePath, 'utf-8');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.statusCode = 200;
      res.end(content);
    } catch (error) {
      console.error('Error reading file:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  // API endpoint to check if a path exists with detailed validation (health check)
  server.middlewares.use('/api/health-check', async (req, res, next) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathToCheck = url.searchParams.get('path');
      const checkType = url.searchParams.get('type'); // 'monstersPath', 'baldurFile', 'movementsFile', 'worldPath', 'itemsPath'

      if (!pathToCheck) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing path parameter' }));
        return;
      }

      const result = { exists: false, path: pathToCheck };

      // Check if path exists
      const exists = fs.existsSync(pathToCheck);
      result.exists = exists;

      if (!exists) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(result));
        return;
      }

      // Perform detailed validation based on type
      const stats = fs.statSync(pathToCheck);

      if (checkType === 'monstersPath') {
        // Must be a directory with .xml files inside
        result.isDirectory = stats.isDirectory();
        if (result.isDirectory) {
          const files = fs.readdirSync(pathToCheck);
          const xmlFiles = files.filter(file => file.toLowerCase().endsWith('.xml'));
          result.xmlCount = xmlFiles.length;
          result.valid = xmlFiles.length > 0;
        } else {
          result.valid = false;
          result.error = 'Path must be a directory';
        }
      } else if (checkType === 'baldurFile') {
        // Must be a file named baldur.lua
        result.isFile = stats.isFile();
        const fileName = path.basename(pathToCheck);
        result.fileName = fileName;
        result.valid = result.isFile && fileName.toLowerCase() === 'baldur.lua';
        if (!result.valid && result.isFile) {
          result.error = 'File must be named baldur.lua';
        } else if (!result.valid) {
          result.error = 'Path must be a file';
        }
      } else if (checkType === 'movementsFile') {
        // Must be a file named movements.xml
        result.isFile = stats.isFile();
        const fileName = path.basename(pathToCheck);
        result.fileName = fileName;
        result.valid = result.isFile && fileName.toLowerCase() === 'movements.xml';
        if (!result.valid && result.isFile) {
          result.error = 'File must be named movements.xml';
        } else if (!result.valid) {
          result.error = 'Path must be a file';
        }
      } else if (checkType === 'worldPath') {
        // Must be a directory with required world files
        result.isDirectory = stats.isDirectory();
        if (result.isDirectory) {
          const requiredFiles = [
            'forgotten.otbm',
            'forgotten-areas.xml',
            'regions.xml',
            'regions-bounds.png',
            'world-spawn.xml'
          ];

          const files = fs.readdirSync(pathToCheck);
          const foundFiles = {};
          const missingFiles = [];

          requiredFiles.forEach(reqFile => {
            const found = files.some(file => file.toLowerCase() === reqFile.toLowerCase());
            foundFiles[reqFile] = found;
            if (!found) {
              missingFiles.push(reqFile);
            }
          });

          result.requiredFiles = foundFiles;
          result.missingFiles = missingFiles;
          result.valid = missingFiles.length === 0;

          if (!result.valid) {
            result.error = `Missing files: ${missingFiles.join(', ')}`;
          }
        } else {
          result.valid = false;
          result.error = 'Path must be a directory';
        }
      } else if (checkType === 'itemsPath') {
        // Must be a directory with items.xml and items.otb
        result.isDirectory = stats.isDirectory();
        if (result.isDirectory) {
          const requiredFiles = [
            'items.xml',
            'items.otb'
          ];

          const files = fs.readdirSync(pathToCheck);
          const foundFiles = {};
          const missingFiles = [];

          requiredFiles.forEach(reqFile => {
            const found = files.some(file => file.toLowerCase() === reqFile.toLowerCase());
            foundFiles[reqFile] = found;
            if (!found) {
              missingFiles.push(reqFile);
            }
          });

          result.requiredFiles = foundFiles;
          result.missingFiles = missingFiles;
          result.valid = missingFiles.length === 0;

          if (!result.valid) {
            result.error = `Missing files: ${missingFiles.join(', ')}`;
          }
        } else {
          result.valid = false;
          result.error = 'Path must be a directory';
        }
      } else {
        // Generic check - just verify existence
        result.valid = exists;
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('Error checking path:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        exists: false,
        valid: false
      }));
    }
  });
}
