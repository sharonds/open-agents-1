"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { buildModelOptions, type ModelOption } from "@/lib/model-options";
import type { AvailableModel } from "@/lib/models";
import type { ModelVariant } from "@/lib/model-variants";
import { fetcher, fetcherNoStore } from "@/lib/swr";

interface ModelsResponse {
  models: AvailableModel[];
}

interface ModelVariantsResponse {
  modelVariants: ModelVariant[];
}

interface UseModelOptionsConfig {
  initialModelOptions?: ModelOption[];
}

const EMPTY_MODELS: AvailableModel[] = [];
const EMPTY_MODEL_VARIANTS: ModelVariant[] = [];
const EMPTY_MODEL_OPTIONS: ModelOption[] = [];

export function useModelOptions(config: UseModelOptionsConfig = {}) {
  const {
    data: modelsData,
    error: modelsError,
    isLoading: modelsLoading,
  } = useSWR<ModelsResponse>("/api/models", fetcherNoStore);

  const {
    data: variantsData,
    error: variantsError,
    isLoading: variantsLoading,
  } = useSWR<ModelVariantsResponse>("/api/settings/model-variants", fetcher);

  const models = modelsData?.models ?? EMPTY_MODELS;
  const modelVariants = variantsData?.modelVariants ?? EMPTY_MODEL_VARIANTS;
  const initialModelOptions = config.initialModelOptions ?? EMPTY_MODEL_OPTIONS;
  const hasCompleteFetchedData =
    modelsData !== undefined && variantsData !== undefined;

  const fetchedModelOptions = useMemo<ModelOption[]>(
    () => buildModelOptions(models, modelVariants),
    [models, modelVariants],
  );

  const modelOptions = useMemo(() => {
    if (!hasCompleteFetchedData && initialModelOptions.length > 0) {
      return initialModelOptions;
    }

    if (initialModelOptions.length === 0) {
      return fetchedModelOptions;
    }

    // SSR model options come from a direct function call and always have fresh
    // models.dev context-window data.  The client-side SWR refetch goes through
    // the /api/models CDN cache, which may serve a stale response where the
    // models.dev enrichment timed out (e.g. 200k instead of 1M for Opus 4.6).
    // Merge: use the fetched model list (it may contain newly added models) but
    // preserve the larger context window from SSR data so a stale CDN response
    // never downgrades the value the user sees.
    const initialContextById = new Map<string, number>();
    for (const option of initialModelOptions) {
      if (option.contextWindow != null) {
        initialContextById.set(option.id, option.contextWindow);
      }
    }

    if (initialContextById.size === 0) {
      return fetchedModelOptions;
    }

    return fetchedModelOptions.map((option) => {
      const initialContext = initialContextById.get(option.id);
      if (
        initialContext != null &&
        (option.contextWindow == null || initialContext > option.contextWindow)
      ) {
        return { ...option, contextWindow: initialContext };
      }
      return option;
    });
  }, [initialModelOptions, fetchedModelOptions, hasCompleteFetchedData]);

  return {
    modelOptions,
    models,
    modelVariants,
    loading:
      initialModelOptions.length === 0 &&
      !hasCompleteFetchedData &&
      (modelsLoading || variantsLoading),
    error: modelsError?.message ?? variantsError?.message ?? null,
  };
}
