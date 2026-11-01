export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

export interface FirestoreErrorInfo {
  error: string;
  operation: OperationType;
  path: string;
  timestamp: string;
}

export function handleFirestoreError(
  error: unknown,
  operation: OperationType,
  path: string
): FirestoreErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const info: FirestoreErrorInfo = {
    error: errorMessage,
    operation,
    path,
    timestamp: new Date().toISOString()
  };
  console.error(`[Firestore Error] ${operation.toUpperCase()} on ${path}:`, errorMessage);
  return info;
}
