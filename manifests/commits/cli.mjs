#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { stdin } from 'node:process';
import { validateCommitMessage } from './check.ts';

const inputPath = process.argv[2];
const message = inputPath
  ? await readFile(inputPath, 'utf8')
  : await new Promise((resolve, reject) => {
      let data = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => {
        data += chunk;
      });
      stdin.on('end', () => resolve(data));
      stdin.on('error', reject);
    });
const result = validateCommitMessage(message);
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.valid) process.exitCode = 1;
