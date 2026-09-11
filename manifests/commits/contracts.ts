export interface CommitSubject {
  type: string;
  scope: string | null;
  breaking: boolean;
  description: string;
}

export interface CommitRecord {
  key: string;
  value?: string;
  target?: string;
  detail?: string;
  line: number;
}

export interface ParsedCommit {
  subject: CommitSubject;
  records: readonly CommitRecord[];
}

export interface CommitError {
  code: string;
  message: string;
  line?: number;
}

export interface CommitValidationResult {
  valid: boolean;
  commit: ParsedCommit | null;
  errors: readonly CommitError[];
}
