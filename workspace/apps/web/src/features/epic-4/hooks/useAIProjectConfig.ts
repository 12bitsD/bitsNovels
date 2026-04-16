import { useCallback, useEffect, useMemo, useState } from 'react';

import { client, extractApiErrorMessage } from '../../../api/client';
import type {
  AIProjectConfig,
  AIProjectConfigFields,
  AIProjectConfigKey,
  AIProjectConfigResponse,
  ParseDepth,
} from '../types';

type ConfigValueMap = {
  model: string;
  temperature: number;
  maxLength: number;
  parseDepth: ParseDepth;
};

type PendingOverrides = Partial<{
  [K in AIProjectConfigKey]: ConfigValueMap[K] | null;
}>;

type ToastState = {
  title: string;
  description?: string;
} | null;

const EMPTY_RESPONSE: AIProjectConfigResponse = {
  projectConfig: {
    projectId: '',
    useGlobalAsDefault: true,
    updatedAt: '',
  },
  resolvedConfig: {
    model: {
      value: '',
      source: 'system',
    },
    temperature: {
      value: 0.7,
      source: 'system',
    },
    maxLength: {
      value: 1000,
      source: 'system',
    },
    parseDepth: {
      value: 'standard',
      source: 'system',
    },
  },
};

export function useAIProjectConfig(projectId: string) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [persisted, setPersisted] = useState<AIProjectConfigResponse>(EMPTY_RESPONSE);
  const [fields, setFields] = useState<AIProjectConfigFields>(EMPTY_RESPONSE.resolvedConfig);
  const [pendingOverrides, setPendingOverrides] = useState<PendingOverrides>({});

  const loadConfig = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/ai-config`);

    if (apiError || !data) {
      setError(extractApiErrorMessage(apiError, '加载 AI 配置失败'));
      setLoading(false);
      return;
    }

    const response = data as AIProjectConfigResponse;
    setPersisted(response);
    setFields(response.resolvedConfig);
    setPendingOverrides({});
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConfig();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadConfig]);

  const updateField = useCallback(<K extends AIProjectConfigKey>(key: K, value: ConfigValueMap[K]) => {
    setFields((current) => {
      const currentField = current[key];
      const nextFallbackValue =
        currentField.source === 'project'
          ? currentField.fallbackValue ?? currentField.value
          : currentField.value;
      const nextFallbackSource =
        currentField.source === 'project'
          ? currentField.fallbackSource ?? currentField.source
          : currentField.source;

      return {
        ...current,
        [key]: {
          ...currentField,
          value,
          source: 'project',
          fallbackValue: nextFallbackValue,
          fallbackSource: nextFallbackSource,
        },
      };
    });

    setPendingOverrides((current) => ({
      ...current,
      [key]: value,
    }));
    setError('');
    setToast(null);
  }, []);

  const resetField = useCallback((key: AIProjectConfigKey) => {
    setFields((current) => {
      const currentField = current[key];
      const nextValue = currentField.fallbackValue ?? currentField.value;
      const nextSource = currentField.fallbackSource ?? currentField.source;

      return {
        ...current,
        [key]: {
          ...currentField,
          value: nextValue,
          source: nextSource,
        },
      };
    });

    setPendingOverrides((current) => ({
      ...current,
      [key]: null,
    }));
    setError('');
    setToast(null);
  }, []);

  const save = useCallback(async () => {
    if (!projectId || Object.keys(pendingOverrides).length === 0) {
      return;
    }

    setSaving(true);
    setError('');
    setToast(null);

    const body: PendingOverrides & Pick<AIProjectConfig, 'useGlobalAsDefault'> = {
      ...pendingOverrides,
      useGlobalAsDefault: true,
    };

    const { data, error: apiError } = await client.PATCH(`/api/projects/${projectId}/ai-config`, {
      body,
    });

    if (apiError || !data) {
      setError(extractApiErrorMessage(apiError, 'AI 配置保存失败'));
      setSaving(false);
      return;
    }

    const response = data as AIProjectConfigResponse;
    setPersisted(response);
    setFields(response.resolvedConfig);
    setPendingOverrides({});
    setToast({
      title: 'AI 配置已更新',
      description: '仅影响后续 AI 任务。',
    });
    setSaving(false);
  }, [pendingOverrides, projectId]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const isDirty = useMemo(() => Object.keys(pendingOverrides).length > 0, [pendingOverrides]);

  return {
    loading,
    saving,
    error,
    toast,
    fields,
    projectConfig: persisted.projectConfig,
    isDirty,
    updateField,
    resetField,
    save,
    dismissToast,
    clearError,
    reload: loadConfig,
  };
}
