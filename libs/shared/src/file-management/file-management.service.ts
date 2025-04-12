import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileManagementService {
  readJsonFile<T>(filePath: string): T {
    try {
      const resolvedPath = path.resolve(filePath);
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(fileContent) as T;
    } catch (error) {
      throw new Error(`Failed to read file at ${filePath}: ${error.message}`);
    }
  }

  writeJsonFile<T>(filePath: string, data: T): void {
    try {
      const resolvedPath = path.resolve(filePath);
      const dirPath = path.dirname(resolvedPath);
      
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file at ${filePath}: ${error.message}`);
    }
  }
  
  resolveDataPath(filename: string): string {
    const sharedPath = path.resolve(process.cwd(), 'libs/shared/src/file-management/data', filename);
    if (fs.existsSync(sharedPath)) {
      return sharedPath;
    }
    
    const distPath = path.resolve(process.cwd(), 'dist/libs/shared/file-management/data', filename);
    if (fs.existsSync(distPath)) {
      return distPath;
    }
    
    return path.resolve(__dirname, '../data', filename);
  }
  
  ensureDataFilesExist(files: { filename: string; emptyContent: string }[]): void {
    try {
      const distDir = path.resolve(process.cwd(), 'dist/libs/shared/file-management/data');
      
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      for (const file of files) {
        const srcPath = path.resolve(process.cwd(), 'libs/shared/src/file-management/data', file.filename);
        const distPath = path.resolve(distDir, file.filename);
        
        if (fs.existsSync(srcPath) && !fs.existsSync(distPath)) {
          const data = fs.readFileSync(srcPath);
          fs.writeFileSync(distPath, data);
        }
        else if (!fs.existsSync(distPath)) {
          fs.writeFileSync(distPath, file.emptyContent);
        }
      }
    } catch (error) {
      console.error(`Error ensuring data files exist: ${error.message}`);
    }
  }
} 