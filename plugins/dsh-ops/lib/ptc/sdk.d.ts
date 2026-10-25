// Derived from the capability catalogue; rebuild with npm run build.
/** Shared 0.4 result contracts. Existing adapters adopt these in their own migration slices. */
export type EffectState = 'none' | 'applied' | 'partial' | 'unknown'
export type RetryPolicy = 'never' | 'after-input-change' | 'after-state-change' | 'bounded-transient'
export type FailureStatus = 'rejected' | 'conflict' | 'error' | 'unknown'

export interface OpsErrorPayload {
  code: string
  effectState: EffectState
  retry: RetryPolicy
  message: string
  nextAction?: string
}
export interface CoverageMeta {
  scannedFiles: number
  matchedCount: number
  isComplete: boolean
  truncatedBy?: 'scan-budget' | 'output-budget' | 'time-limit' | 'row-limit'
}
export type Outcome<T> =
  | { status: 'completed', data: T, coverage?: CoverageMeta & { isComplete: true } }
  | { status: 'partial', data: T, coverage: CoverageMeta & { isComplete: false }, continuation: string }
  | { status: FailureStatus, error: OpsErrorPayload, data?: T }

interface SearchReportBase {
  pageComplete: boolean
  scannedFiles: number
  skippedFiles: number
  skipReasons: Record<string, number>
  matchedObserved: number
  truncatedBy: 'scan-budget' | 'output-budget' | 'time' | 'row-limit' | 'none'
  continuation?: string
}
/** An early-stopped scan may report observed matches, never a claimed full-scan total. */
export type SearchExecutionReport = SearchReportBase & (
  | { scanComplete: true, matchedTotal: number }
  | { scanComplete: false, matchedTotal?: never }
)
export interface StorageReference {
  refId: `ref://${string}/${string}/${string}`
  createdAt: number
  ttlMs: number
  schemaVersion: string
  producerTool: string
  totalItems: number
  totalBytes: number
  preview: string
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Available bindings still depend on component, scope, presentation and SDK activation. */
export interface OpsSdk {
  "ops_batch": (args: {
  root?: string;
  action: "plan" | "run" | "resume";
  /** 1-512 operations; enforced by the native worker. */
  operations?: ({
    op: "copy" | "move" | "remove";
    path: string;
    to?: string;
  })[];
  operationsRef?: string;
  /** At most 128 protected relative paths. */
  protect?: string[];
  id?: string;
}) => Promise<{
  status: "completed";
  data: {
    id?: string;
    root?: string;
    status?: string;
    phase?: string;
    done?: number;
    total?: number;
    failed?: number;
    unknown?: number;
    logicalBytes?: number;
    byteSemantics?: string;
    detailsRef?: string;
    complete?: boolean;
    omitted?: number;
    nextAction?: string;
    sourceTotal?: number;
    contentHash?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    /** Original execution facts, itemEncoding, capturedItems and captureComplete; independent of page completeness. */
    source?: Record<string, JsonValue>;
    expires?: number | null;
    items?: Record<string, JsonValue>[];
    nextOffset?: number;
    sandbox?: {
      mode: string;
      enforcement?: string;
    };
    error?: {
      code: string;
      phase: string;
      retryable: boolean;
      effectState: string;
      nextAction: string;
      message: string;
      permission?: {
        current?: string;
        required?: string;
        operation?: string;
        workspaceRoot?: string;
      };
    };
    referenceRoot?: string;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    id?: string;
    root?: string;
    status?: string;
    phase?: string;
    done?: number;
    total?: number;
    failed?: number;
    unknown?: number;
    logicalBytes?: number;
    byteSemantics?: string;
    detailsRef?: string;
    complete?: boolean;
    omitted?: number;
    nextAction?: string;
    sourceTotal?: number;
    contentHash?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    /** Original execution facts, itemEncoding, capturedItems and captureComplete; independent of page completeness. */
    source?: Record<string, JsonValue>;
    expires?: number | null;
    items?: Record<string, JsonValue>[];
    nextOffset?: number;
    sandbox?: {
      mode: string;
      enforcement?: string;
    };
    error?: {
      code: string;
      phase: string;
      retryable: boolean;
      effectState: string;
      nextAction: string;
      message: string;
      permission?: {
        current?: string;
        required?: string;
        operation?: string;
        workspaceRoot?: string;
      };
    };
    referenceRoot?: string;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    id?: string;
    root?: string;
    status?: string;
    phase?: string;
    done?: number;
    total?: number;
    failed?: number;
    unknown?: number;
    logicalBytes?: number;
    byteSemantics?: string;
    detailsRef?: string;
    complete?: boolean;
    omitted?: number;
    nextAction?: string;
    sourceTotal?: number;
    contentHash?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    /** Original execution facts, itemEncoding, capturedItems and captureComplete; independent of page completeness. */
    source?: Record<string, JsonValue>;
    expires?: number | null;
    items?: Record<string, JsonValue>[];
    nextOffset?: number;
    sandbox?: {
      mode: string;
      enforcement?: string;
    };
    error?: Record<string, JsonValue>;
    referenceRoot?: string;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_copy": (args: {
  path: string;
  to: string;
  /** 64 lowercase hex SHA-256 revision returned by inspect/stat; absent is not accepted. */
  expectedRevision: string;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_diff": (args: {
  path: string;
  content: string;
  /** Nonnegative integer (0-based). */
  offset?: number;
  /** 1-1000 inclusive. Default 100. */
  limit?: number;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      kind?: string;
      line?: number;
      text?: string;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    before?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
    } & Record<string, JsonValue>;
    after?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
    } & Record<string, JsonValue>;
    hunk?: {
      startLine?: number;
      removed?: number;
      added?: number;
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      kind?: string;
      line?: number;
      text?: string;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    before?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
    } & Record<string, JsonValue>;
    after?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
    } & Record<string, JsonValue>;
    hunk?: {
      startLine?: number;
      removed?: number;
      added?: number;
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      kind?: string;
      line?: number;
      text?: string;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    before?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
    } & Record<string, JsonValue>;
    after?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
    } & Record<string, JsonValue>;
    hunk?: {
      startLine?: number;
      removed?: number;
      added?: number;
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_edit_file": (args: {
  path: string;
  /** 64 lowercase hex SHA-256 revision returned by inspect/stat; absent is not accepted. */
  expectedRevision: string;
  /** 1-100 nonoverlapping edits against the same original bytes. */
  edits: {
    /** Nonempty text that occurs exactly once in the original. */
    oldText: string;
    newText: string;
  }[];
  dryRun?: boolean;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_glob": (args: {
  path?: string;
  /** At least one positive glob is required. */
  pattern: string[];
  outputMode?: "paths" | "details";
  sort?: "path" | "modified";
  /** Nonnegative integer (0-based). */
  offset?: number;
  /** 1-10000 inclusive. Default 100. */
  limit?: number;
  /** Opaque cursor from a complete scan. Keep query options unchanged; omit offset or use nextOffset. SEARCH_STALE requires a fresh query. */
  continuation?: string;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: (string | {
      path?: string;
      bytes?: number;
      modified?: number | null;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    scanComplete?: boolean;
    pageComplete?: boolean;
    scannedFiles?: number;
    skipReasons?: Record<string, JsonValue>;
    matchedObserved?: number;
    /** Present only after a complete scan. */
    matchedTotal?: number;
    truncatedBy?: "scan-budget" | "output-budget" | "time" | "row-limit" | "none";
    continuation?: string;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: (string | {
      path?: string;
      bytes?: number;
      modified?: number | null;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    scanComplete?: boolean;
    pageComplete?: boolean;
    scannedFiles?: number;
    skipReasons?: Record<string, JsonValue>;
    matchedObserved?: number;
    /** Present only after a complete scan. */
    matchedTotal?: number;
    truncatedBy?: "scan-budget" | "output-budget" | "time" | "row-limit" | "none";
    continuation?: string;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: (string | {
      path?: string;
      bytes?: number;
      modified?: number | null;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    scanComplete?: boolean;
    pageComplete?: boolean;
    scannedFiles?: number;
    skipReasons?: Record<string, JsonValue>;
    matchedObserved?: number;
    /** Present only after a complete scan. */
    matchedTotal?: number;
    truncatedBy?: "scan-budget" | "output-budget" | "time" | "row-limit" | "none";
    continuation?: string;
  } & Record<string, JsonValue>;
}>;
  "ops_grep": (args: {
  path?: string;
  pattern: string;
  glob?: string[];
  outputMode?: "files_with_matches" | "content" | "count" | "summary";
  caseInsensitive?: boolean;
  lineNumbers?: boolean;
  /** 0-32 inclusive. */
  beforeContext?: number;
  /** 0-32 inclusive. */
  afterContext?: number;
  multiline?: boolean;
  /** Nonnegative integer (0-based). */
  offset?: number;
  /** 1-10000 inclusive. Default 100. */
  limit?: number;
  /** Opaque cursor from a complete scan. Keep query options unchanged; omit offset or use nextOffset. SEARCH_STALE requires a fresh query. */
  continuation?: string;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      line?: number;
      text?: string;
      count?: number;
      matches?: number;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    scanComplete?: boolean;
    pageComplete?: boolean;
    scannedFiles?: number;
    skipReasons?: Record<string, JsonValue>;
    matchedObserved?: number;
    /** Present only after a complete scan. */
    matchedTotal?: number;
    truncatedBy?: "scan-budget" | "output-budget" | "time" | "row-limit" | "none";
    continuation?: string;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      line?: number;
      text?: string;
      count?: number;
      matches?: number;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    scanComplete?: boolean;
    pageComplete?: boolean;
    scannedFiles?: number;
    skipReasons?: Record<string, JsonValue>;
    matchedObserved?: number;
    /** Present only after a complete scan. */
    matchedTotal?: number;
    truncatedBy?: "scan-budget" | "output-budget" | "time" | "row-limit" | "none";
    continuation?: string;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      line?: number;
      text?: string;
      count?: number;
      matches?: number;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    scanComplete?: boolean;
    pageComplete?: boolean;
    scannedFiles?: number;
    skipReasons?: Record<string, JsonValue>;
    matchedObserved?: number;
    /** Present only after a complete scan. */
    matchedTotal?: number;
    truncatedBy?: "scan-budget" | "output-budget" | "time" | "row-limit" | "none";
    continuation?: string;
  } & Record<string, JsonValue>;
}>;
  "ops_inspect_local_file": (args: {
  path?: string;
  /** 1-based line or 16-byte hex row; default 1. Legacy 0 also reads the first unit. */
  offset?: number;
  /** 1-10000 inclusive. Default 200. */
  limit?: number;
  encoding?: "utf-8";
  view?: "text" | "hex";
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      line?: number;
      text?: string;
      view?: string;
      offset?: number;
      truncatedInLine?: boolean;
      bytesTotal?: number;
      bytesOmitted?: number;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    path?: string;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      line?: number;
      text?: string;
      view?: string;
      offset?: number;
      truncatedInLine?: boolean;
      bytesTotal?: number;
      bytesOmitted?: number;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    path?: string;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      line?: number;
      text?: string;
      view?: string;
      offset?: number;
      truncatedInLine?: boolean;
      bytesTotal?: number;
      bytesOmitted?: number;
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    path?: string;
  } & Record<string, JsonValue>;
}>;
  "ops_load_sdk": (args: {
  /** 1-5 exact raw OPS API names, without the public prefix. Select only from the allowed catalogue in this tool description. */
  tools: string[];
}) => Promise<{
  status: "completed";
  data: {
    status: "completed";
    tools: string[];
    nextTurn: true;
  };
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    status: "completed";
    tools: string[];
    nextTurn: true;
  };
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    status?: "completed";
    tools?: string[];
    nextTurn?: true;
    error?: Record<string, JsonValue>;
  };
}>;
  "ops_move": (args: {
  path: string;
  to: string;
  /** 64 lowercase hex SHA-256 revision returned by inspect/stat; absent is not accepted. */
  expectedRevision: string;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_read_docx": (args: {
  /** Regular DOCX file path relative to the current session cwd. Binary DOC is unsupported. */
  path: string;
  /** 1-100000 main-body paragraphs, 1-based. */
  offset?: number;
  /** 1-1000 paragraphs. */
  limit?: number;
}) => Promise<{
  status: "completed";
  data: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      block: number;
      type: "paragraph";
      text: string;
      table?: number;
      row?: number;
      cell?: number;
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      block: number;
      type: "paragraph";
      text: string;
      table?: number;
      row?: number;
      cell?: number;
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      block: number;
      type: "paragraph";
      text: string;
      table?: number;
      row?: number;
      cell?: number;
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_read_files": (args: {
  /** 1-32 file ranges. */
  files: {
    path: string;
    /** Line >=1; default 1. */
    offset?: number;
    /** 1-10000 inclusive. Default 200. */
    limit?: number;
  }[];
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    status?: string;
    complete?: boolean;
    nextIndex?: number;
    pending?: number;
    total?: number;
    failed?: number;
    truncated?: boolean;
    effectState?: string;
    items?: ({
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
      path?: string;
      status?: string;
      complete?: boolean;
      truncated?: boolean;
      nextOffset?: number;
      total?: number;
      omitted?: number;
      nextAction?: string;
      error?: Record<string, JsonValue>;
      items?: ({
        path?: string;
        line?: number;
        text?: string;
        view?: string;
        offset?: number;
        truncatedInLine?: boolean;
        bytesTotal?: number;
        bytesOmitted?: number;
      } & Record<string, JsonValue>)[];
    } & Record<string, JsonValue>)[];
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    status?: string;
    complete?: boolean;
    nextIndex?: number;
    pending?: number;
    total?: number;
    failed?: number;
    truncated?: boolean;
    effectState?: string;
    items?: ({
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
      path?: string;
      status?: string;
      complete?: boolean;
      truncated?: boolean;
      nextOffset?: number;
      total?: number;
      omitted?: number;
      nextAction?: string;
      error?: Record<string, JsonValue>;
      items?: ({
        path?: string;
        line?: number;
        text?: string;
        view?: string;
        offset?: number;
        truncatedInLine?: boolean;
        bytesTotal?: number;
        bytesOmitted?: number;
      } & Record<string, JsonValue>)[];
    } & Record<string, JsonValue>)[];
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    status?: string;
    complete?: boolean;
    nextIndex?: number;
    pending?: number;
    total?: number;
    failed?: number;
    truncated?: boolean;
    effectState?: string;
    items?: ({
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
      path?: string;
      status?: string;
      complete?: boolean;
      truncated?: boolean;
      nextOffset?: number;
      total?: number;
      omitted?: number;
      nextAction?: string;
      error?: Record<string, JsonValue>;
      items?: ({
        path?: string;
        line?: number;
        text?: string;
        view?: string;
        offset?: number;
        truncatedInLine?: boolean;
        bytesTotal?: number;
        bytesOmitted?: number;
      } & Record<string, JsonValue>)[];
    } & Record<string, JsonValue>)[];
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_read_pdf": (args: {
  /** Regular PDF file path relative to the current session cwd. */
  path: string;
  /** 1-32 pages, 1-based. */
  offset?: number;
  /** 1-32 pages. */
  limit?: number;
}) => Promise<{
  status: "completed";
  data: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      page: number;
      text: string;
      runs: string[];
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      page: number;
      text: string;
      runs: string[];
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      page: number;
      text: string;
      runs: string[];
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_read_table": (args: {
  /** Regular file path relative to the current session cwd. */
  path: string;
  /** Default tsv for .tsv paths, otherwise csv. */
  format?: "csv" | "tsv";
  /** Strict decoding; conflicting BOMs fail. No replacement characters. */
  encoding?: "utf-8" | "utf-16le" | "utf-16be";
  /** First record is columns when true; empty/duplicate column names stay positional. */
  header?: boolean;
  /** 1-100000 data rows, 1-based; header is excluded. */
  offset?: number;
  /** 1-1000 data rows. */
  limit?: number;
}) => Promise<{
  status: "completed";
  data: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      row: number;
      cells: string[];
      lineStart: number;
      lineEnd: number;
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      row: number;
      cells: string[];
      lineStart: number;
      lineEnd: number;
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    scope?: string;
    excludedContent?: string[];
    blocksObserved?: number;
    pagesObserved?: number;
    decodedBytes?: number;
    processedBytes?: number;
    format?: string;
    encoding?: string;
    header?: boolean;
    columns?: string[];
    columnCount?: number;
    bytes?: number;
    bytesRead?: number;
    rowsObserved?: number;
    skipped?: number;
    scanComplete?: boolean;
    pageComplete?: boolean;
    complete?: boolean;
    truncated?: boolean;
    truncatedBy?: string;
    nextOffset?: number;
    total?: number;
    rowCount?: number;
    omitted?: number;
    revision?: string;
    status?: string;
    phase?: string;
    changed?: number;
    effectState?: string;
    path?: string;
    items?: {
      row: number;
      cells: string[];
      lineStart: number;
      lineEnd: number;
    }[];
    error?: Record<string, JsonValue>;
    nextAction?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    source?: {
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytes?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      scanComplete?: boolean;
      pageComplete?: boolean;
      complete?: boolean;
      truncated?: boolean;
      truncatedBy?: string;
      nextOffset?: number;
      total?: number;
      rowCount?: number;
      omitted?: number;
      revision?: string;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_remove": (args: {
  path: string;
  /** 64 lowercase hex SHA-256 revision returned by inspect/stat; absent is not accepted. */
  expectedRevision: string;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_replace": (args: {
  path?: string;
  pattern: string;
  replacement: string;
  glob?: string[];
  /** 1-100000 inclusive. Default 100. */
  maxReplacements?: number;
  dryRun?: boolean;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_result": (args: {
  action: "put" | "page" | "release";
  /** Absolute root bound to the original reference. Native defaults to current session cwd; PTC defaults to workspace root. */
  root?: string;
  /** Use the returned reference.refId unchanged. */
  id?: string;
  /** Nonnegative filtered-row offset; default 0. */
  offset?: number;
  /** 1-512 rows; default 64. */
  limit?: number;
  /** 512-65536 serialized bytes; default 16384. Reduce this if Native display is incomplete. */
  maxBytes?: number;
  /** At most 32 top-level field names, each at most 128 bytes. */
  fields?: string[];
  /** At most 16 top-level exact-value filters, applied before projection and paging. */
  equals?: Record<string, JsonValue>;
  /** At most 10000 object rows; 2 MiB whole request, 10 MiB physical reference cap. */
  items?: Record<string, JsonValue>[];
  /** put only: 0 (default, session lifetime), or 1-604800000 milliseconds. */
  ttlMs?: number;
}) => Promise<{
  status: "completed";
  data: {
    id?: string;
    root?: string;
    status?: string;
    phase?: string;
    done?: number;
    total?: number;
    failed?: number;
    unknown?: number;
    logicalBytes?: number;
    byteSemantics?: string;
    detailsRef?: string;
    complete?: boolean;
    omitted?: number;
    nextAction?: string;
    sourceTotal?: number;
    contentHash?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    source?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
      path?: string;
      status?: string;
      complete?: boolean;
      truncated?: boolean;
      nextOffset?: number;
      total?: number;
      omitted?: number;
      nextAction?: string;
      error?: Record<string, JsonValue>;
      scanComplete?: boolean;
      pageComplete?: boolean;
      scannedFiles?: number;
      skippedFiles?: number;
      /** Nonnegative counts keyed by skip reason. */
      skipReasons?: Record<string, JsonValue>;
      matchedObserved?: number;
      matchedTotal?: number;
      truncatedBy?: string;
      continuation?: string;
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      rowCount?: number;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    expires?: number | null;
    items?: Record<string, JsonValue>[];
    nextOffset?: number;
    sandbox?: {
      mode: string;
      enforcement?: string;
    };
    error?: {
      code: string;
      phase: string;
      retryable: boolean;
      effectState: string;
      nextAction: string;
      message: string;
      permission?: {
        current?: string;
        required?: string;
        operation?: string;
        workspaceRoot?: string;
      };
    };
    referenceRoot?: string;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    id?: string;
    root?: string;
    status?: string;
    phase?: string;
    done?: number;
    total?: number;
    failed?: number;
    unknown?: number;
    logicalBytes?: number;
    byteSemantics?: string;
    detailsRef?: string;
    complete?: boolean;
    omitted?: number;
    nextAction?: string;
    sourceTotal?: number;
    contentHash?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    source?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
      path?: string;
      status?: string;
      complete?: boolean;
      truncated?: boolean;
      nextOffset?: number;
      total?: number;
      omitted?: number;
      nextAction?: string;
      error?: Record<string, JsonValue>;
      scanComplete?: boolean;
      pageComplete?: boolean;
      scannedFiles?: number;
      skippedFiles?: number;
      /** Nonnegative counts keyed by skip reason. */
      skipReasons?: Record<string, JsonValue>;
      matchedObserved?: number;
      matchedTotal?: number;
      truncatedBy?: string;
      continuation?: string;
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      rowCount?: number;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    expires?: number | null;
    items?: Record<string, JsonValue>[];
    nextOffset?: number;
    sandbox?: {
      mode: string;
      enforcement?: string;
    };
    error?: {
      code: string;
      phase: string;
      retryable: boolean;
      effectState: string;
      nextAction: string;
      message: string;
      permission?: {
        current?: string;
        required?: string;
        operation?: string;
        workspaceRoot?: string;
      };
    };
    referenceRoot?: string;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    id?: string;
    root?: string;
    status?: string;
    phase?: string;
    done?: number;
    total?: number;
    failed?: number;
    unknown?: number;
    logicalBytes?: number;
    byteSemantics?: string;
    detailsRef?: string;
    complete?: boolean;
    omitted?: number;
    nextAction?: string;
    sourceTotal?: number;
    contentHash?: string;
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    source?: {
      revision?: string;
      bytes?: number;
      lineCount?: number | null;
      path?: string;
      status?: string;
      complete?: boolean;
      truncated?: boolean;
      nextOffset?: number;
      total?: number;
      omitted?: number;
      nextAction?: string;
      error?: Record<string, JsonValue>;
      scanComplete?: boolean;
      pageComplete?: boolean;
      scannedFiles?: number;
      skippedFiles?: number;
      /** Nonnegative counts keyed by skip reason. */
      skipReasons?: Record<string, JsonValue>;
      matchedObserved?: number;
      matchedTotal?: number;
      truncatedBy?: string;
      continuation?: string;
      scope?: string;
      excludedContent?: string[];
      blocksObserved?: number;
      pagesObserved?: number;
      decodedBytes?: number;
      processedBytes?: number;
      format?: string;
      encoding?: string;
      header?: boolean;
      columns?: string[];
      columnCount?: number;
      bytesRead?: number;
      rowsObserved?: number;
      skipped?: number;
      rowCount?: number;
      root?: string;
      itemEncoding?: string;
      capturedItems?: number;
      captureComplete?: boolean;
    } & Record<string, JsonValue>;
    expires?: number | null;
    items?: Record<string, JsonValue>[];
    nextOffset?: number;
    sandbox?: {
      mode: string;
      enforcement?: string;
    };
    error?: Record<string, JsonValue>;
    referenceRoot?: string;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
  "ops_stat": (args: {
  path: string;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: JsonValue[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    exists?: boolean;
    path?: string;
    readonly?: boolean;
    mode?: string;
    modifiedMs?: number | null;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: JsonValue[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    exists?: boolean;
    path?: string;
    readonly?: boolean;
    mode?: string;
    modifiedMs?: number | null;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: JsonValue[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
    exists?: boolean;
    path?: string;
    readonly?: boolean;
    mode?: string;
    modifiedMs?: number | null;
  } & Record<string, JsonValue>;
}>;
  "ops_write_file": (args: {
  path: string;
  content: string;
  /** 64 lowercase hex SHA-256 revision returned by inspect/stat; absent is create-only, never an overwrite wildcard. */
  expectedRevision: string;
  dryRun?: boolean;
}) => Promise<{
  status: "completed";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage?: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: true;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
} | {
  status: "partial";
  data: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
  coverage: {
    scannedFiles: number;
    matchedCount: number;
    isComplete: false;
    truncatedBy?: "scan-budget" | "output-budget" | "time-limit" | "row-limit";
  };
  continuation: string;
} | {
  status: "rejected" | "conflict" | "error" | "unknown";
  error: {
    code: string;
    message: string;
    nextAction?: string;
    effectState: "none" | "applied" | "partial" | "unknown";
    retry: "never" | "after-input-change" | "after-state-change" | "bounded-transient";
  };
  data?: {
    reference?: {
      /** Opaque ref://session/tool/uuid; a locator, never authority. */
      refId: string;
      /** Unix milliseconds. */
      createdAt: number;
      /** 0 means session lifetime; otherwise at most 604800000 milliseconds. */
      ttlMs: number;
      schemaVersion: string;
      producerTool: string;
      totalItems: number;
      totalBytes: number;
      preview: string;
    } & Record<string, JsonValue>;
    referenceRoot?: string;
    root?: string;
    source?: Record<string, JsonValue>;
    storageError?: {
      code?: string;
      message?: string;
      effectState?: "none" | "applied" | "partial" | "unknown";
    } & Record<string, JsonValue>;
    nextAction?: string;
    revision?: string;
    bytes?: number;
    lineCount?: number | null;
    status?: string;
    phase?: string;
    changed?: number;
    matched?: number;
    skipped?: number;
    failed?: number;
    complete?: boolean;
    omitted?: number;
    total?: number;
    nextOffset?: number;
    truncated?: boolean;
    items?: ({
      path?: string;
      to?: string;
      revision?: string;
      revisionBefore?: string;
      bytes?: number;
      bytesBefore?: number;
      bytesAfter?: number;
      lineCount?: number;
      removed?: boolean;
      metadataWarnings?: string[];
    } & Record<string, JsonValue>)[];
    dryRun?: boolean;
    files?: number;
    matches?: number;
    skippedFiles?: number;
    error?: Record<string, JsonValue>;
  } & Record<string, JsonValue>;
}>;
}
