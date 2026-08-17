"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LaboratoryTestForm } from "@/components/tests/laboratory-test-form";
import { getLaboratoryTest } from "@/services/laboratory-tests";
import type { LaboratoryTest } from "@/types/laboratory-test";

export function LaboratoryTestEditor({ testId }: { testId: number }) {
  const [test, setTest] = useState<LaboratoryTest | null>(null);
  const [error, setError] = useState("");
  const invalidId = !Number.isInteger(testId) || testId < 1;
  useEffect(() => { if (invalidId) return; getLaboratoryTest(testId).then(setTest).catch((reason: Error)=>setError(reason.message)); }, [testId, invalidId]);
  if (invalidId || error) return <Alert variant="destructive"><AlertDescription>{invalidId ? "Invalid test ID." : error}</AlertDescription></Alert>;
  if (!test) return <Skeleton className="h-96 w-full" />;
  return <section><div className="page-heading"><div><h1>Edit Test</h1><p>Test Catalog / {test.test_code} / Edit</p></div></div><LaboratoryTestForm laboratoryTest={test} /></section>;
}
