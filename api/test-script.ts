import { exec } from 'child_process';
import { Request, Response } from 'express';
import path from 'path';

export default async function handler(req: Request, res: Response) {
  const scriptPath = path.join(process.cwd(), 'api', 'test.py');
  
  exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    res.status(200).json({ output: stdout });
  });
}
