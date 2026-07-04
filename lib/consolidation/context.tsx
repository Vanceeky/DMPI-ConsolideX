"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  UploadedFile,
  ValidationState,
  ProcessingResult,
} from "./types";

interface ConsolidationState {
  praFiles: UploadedFile[];
  sppFiles: UploadedFile[];
  praReferenceFile: UploadedFile | null;
  sppReferenceFile: UploadedFile | null;
  validation: ValidationState | null;
  processingResult: ProcessingResult | null;
  outputBlob: Blob | null;

  setPraFiles: (files: UploadedFile[]) => void;
  setSppFiles: (files: UploadedFile[]) => void;
  setPraReferenceFile: (file: UploadedFile | null) => void;
  setSppReferenceFile: (file: UploadedFile | null) => void;
  setValidation: (v: ValidationState | null) => void;
  setProcessingResult: (r: ProcessingResult | null) => void;
  setOutputBlob: (b: Blob | null) => void;
  reset: () => void;
}

const ConsolidationContext = createContext<ConsolidationState | null>(null);

export function ConsolidationProvider({ children }: { children: ReactNode }) {
  const [praFiles, setPraFilesRaw]       = useState<UploadedFile[]>([]);
  const [sppFiles, setSppFilesRaw]       = useState<UploadedFile[]>([]);
  const [praReferenceFile, setPraReferenceFile] = useState<UploadedFile | null>(null);
  const [sppReferenceFile, setSppReferenceFile] = useState<UploadedFile | null>(null);
  const [validation, setValidation]      = useState<ValidationState | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [outputBlob, setOutputBlob]      = useState<Blob | null>(null);

  // Clear validation whenever files change so validate page always re-scans
  const setPraFiles = useCallback((files: UploadedFile[]) => {
    setPraFilesRaw(files);
    setValidation(null);
  }, []);

  const setSppFiles = useCallback((files: UploadedFile[]) => {
    setSppFilesRaw(files);
    setValidation(null);
  }, []);

  const reset = useCallback(() => {
    setPraFilesRaw([]);
    setSppFilesRaw([]);
    setPraReferenceFile(null);
    setSppReferenceFile(null);
    setValidation(null);
    setProcessingResult(null);
    setOutputBlob(null);
  }, []);

  return (
    <ConsolidationContext.Provider
      value={{
        praFiles, sppFiles,
        praReferenceFile, sppReferenceFile,
        validation, processingResult, outputBlob,
        setPraFiles, setSppFiles,
        setPraReferenceFile, setSppReferenceFile,
        setValidation, setProcessingResult, setOutputBlob,
        reset,
      }}
    >
      {children}
    </ConsolidationContext.Provider>
  );
}

export function useConsolidation(): ConsolidationState {
  const ctx = useContext(ConsolidationContext);
  if (!ctx) throw new Error("useConsolidation must be used inside ConsolidationProvider");
  return ctx;
}
