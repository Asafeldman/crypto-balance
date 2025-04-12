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
} 