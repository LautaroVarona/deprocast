"use client";

import { FastingStrip } from "@/components/salud/fasting-strip";
import { useVoiceRecorder } from "@/components/salud/hooks/use-voice-recorder";
import {
  buildSaludIngestFormData,
  postSaludIngest,
} from "@/components/salud/lib/ingest-client";
import { buildMealHistory } from "@/components/salud/lib/fasting";
import { resolveOccurredAt } from "@/components/salud/lib/timestamp";
import { MealHistoryCompact } from "@/components/salud/shared/meal-history-compact";
import { TimestampSelector } from "@/components/salud/shared/timestamp-selector";
import { UnifiedMealInput } from "@/components/salud/shared/unified-meal-input";
import type { InputModality, TimestampMode } from "@/components/salud/types";
import { Button } from "@/components/ui/button";
import type { HealthRecordDto } from "@/lib/events/types";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AlimentacionPanelProps = {
  records: HealthRecordDto[];
  isLoading: boolean;
  highlightId?: string | null;
  onSaved: (record?: HealthRecordDto) => void;
};

export function AlimentacionPanel({
  records,
  isLoading,
  highlightId,
  onSaved,
}: AlimentacionPanelProps) {
  const [descripcion, setDescripcion] = useState("");
  const [modality, setModality] = useState<InputModality>("texto");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [timestampMode, setTimestampMode] = useState<TimestampMode>("now");
  const [specificTime, setSpecificTime] = useState("12:00");
  const [isSaving, setIsSaving] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string>();

  const voice = useVoiceRecorder();
  const historyItems = useMemo(() => buildMealHistory(records), [records]);

  useEffect(() => {
    if (voice.audioBlob) setModality("audio");
  }, [voice.audioBlob]);

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  const handleImagePick = (file: File) => {
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setModality("imagen");
    voice.clearRecording();
  };

  const resetForm = () => {
    setDescripcion("");
    setModality("texto");
    setImageFile(null);
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    voice.clearRecording();
    setTimestampMode("now");
    setSpecificTime("12:00");
    setProcessingLabel(undefined);
  };

  const canSubmit =
    !isSaving &&
    !voice.isRecording &&
    (descripcion.trim().length > 0 || imageFile !== null || voice.audioBlob !== null);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSaving(true);
    const activeModality: InputModality = imageFile
      ? "imagen"
      : voice.audioBlob
        ? "audio"
        : "texto";

    try {
      if (activeModality === "imagen") {
        setProcessingLabel("Centinela → visión Nutrimetron...");
      } else if (activeModality === "audio") {
        setProcessingLabel("Centinela → STT → Nutrimetron...");
      } else {
        setProcessingLabel("Nutrimetron estructurando...");
      }

      const occurredAt = resolveOccurredAt(timestampMode, specificTime);
      const formData = buildSaludIngestFormData({
        modality: activeModality,
        text: descripcion,
        occurredAt,
        file:
          activeModality === "imagen"
            ? imageFile ?? undefined
            : voice.audioBlob ?? undefined,
        fileName:
          activeModality === "audio" ? "nota-voz-salud.webm" : undefined,
      });

      const result = await postSaludIngest(formData);
      resetForm();
      onSaved(result.record);
      toast.success("Ingesta analizada y registrada", {
        description: result.analysis.summary,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo registrar la ingesta";
      toast.error(message);
    } finally {
      setIsSaving(false);
      setProcessingLabel(undefined);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FastingStrip records={records} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <UnifiedMealInput
            value={descripcion}
            onChange={setDescripcion}
            modality={modality}
            imagePreviewUrl={imagePreviewUrl}
            audioReady={Boolean(voice.audioBlob)}
            audioDurationSec={voice.durationSec}
            isRecording={voice.isRecording}
            isProcessing={isSaving}
            processingLabel={processingLabel}
            onImagePick={handleImagePick}
            onToggleRecord={() => void voice.toggleRecording()}
            disabled={isSaving}
          />

          <TimestampSelector
            mode={timestampMode}
            specificTime={specificTime}
            onModeChange={setTimestampMode}
            onSpecificTimeChange={setSpecificTime}
          />

          <Button
            size="sm"
            className="shrink-0 self-start"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? <Loader2Icon className="animate-spin" /> : null}
            Registrar Ingesta
          </Button>
        </div>

        <MealHistoryCompact
          items={historyItems}
          isLoading={isLoading}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
