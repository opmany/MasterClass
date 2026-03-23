import { useState, useEffect } from "react";

const STORAGE_KEY = "selectedExam";
const CLASS_STORAGE_KEY = "selectedClass";

export function useSelectedExam() {
  const [selectedExamId, setSelectedExamId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  const [selectedClassId, setSelectedClassId] = useState(() => {
    return localStorage.getItem(CLASS_STORAGE_KEY) || null;
  });

  useEffect(() => {
    if (selectedExamId) localStorage.setItem(STORAGE_KEY, selectedExamId);
    else localStorage.removeItem(STORAGE_KEY);
  }, [selectedExamId]);

  useEffect(() => {
    if (selectedClassId) localStorage.setItem(CLASS_STORAGE_KEY, selectedClassId);
    else localStorage.removeItem(CLASS_STORAGE_KEY);
  }, [selectedClassId]);

  return {
    selectedExamId,
    setSelectedExamId,
    selectedClassId,
    setSelectedClassId,
  };
}