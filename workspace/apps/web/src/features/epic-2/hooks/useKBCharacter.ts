import { useCallback, useEffect, useState } from 'react';
import { client } from '../../../api/client';
import type { CharacterSortBy, KBCharacter, KBCharacterListResponse, UpdateKBCharacterInput } from '../components/KBCharacter/types';

export interface UseKBCharacterOptions {
  projectId: string;
  initialQuery?: string;
  initialSortBy?: CharacterSortBy;
}

export interface UseKBCharacterReturn {
  characters: KBCharacter[];
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  query: string;
  sortBy: CharacterSortBy;
  selectedIds: string[];
  selectedCharacter: KBCharacter | null;
  setQuery: (value: string) => void;
  setSortBy: (value: CharacterSortBy) => void;
  setSelectedIds: (ids: string[]) => void;
  selectCharacter: (id: string | null) => Promise<void>;
  updateCharacter: (id: string, input: UpdateKBCharacterInput) => Promise<void>;
  confirmCharacter: (id: string) => Promise<void>;
  batchConfirmCharacters: (ids: string[]) => Promise<void>;
  markCharacterNotCharacter: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export function useKBCharacter({
  projectId,
  initialQuery = '',
  initialSortBy = 'firstAppearance',
}: UseKBCharacterOptions): UseKBCharacterReturn {
  const [characters, setCharacters] = useState<KBCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<CharacterSortBy>(initialSortBy);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<KBCharacter | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.append('query', query.trim());
      }
      params.append('sortBy', sortBy);

      const url = `/api/projects/${projectId}/kb/character?${params.toString()}`;
      const { data, error: apiError } = await client.GET(url);

      if (apiError) {
        throw new Error('Failed to fetch characters');
      }

      const response = data as KBCharacterListResponse;
      setCharacters(response.items);
    } catch (fetchError) {
      setError(toErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [projectId, query, sortBy]);

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const selectCharacter = useCallback(
    async (id: string | null) => {
      if (!id) {
        setSelectedCharacter(null);
        return;
      }

      try {
        setDetailLoading(true);
        const { data, error: apiError } = await client.GET(`/api/projects/${projectId}/kb/character/${id}`);

        if (apiError) {
          throw new Error('Failed to fetch character detail');
        }

        setSelectedCharacter((data as { character: KBCharacter }).character);
      } catch (detailError) {
        setError(toErrorMessage(detailError));
      } finally {
        setDetailLoading(false);
      }
    },
    [projectId],
  );

  const updateCharacter = useCallback(
    async (id: string, input: UpdateKBCharacterInput) => {
      try {
        setError(null);
        const { data, error: apiError } = await client.PATCH(`/api/projects/${projectId}/kb/character/${id}`, {
          body: input,
        });

        if (apiError) {
          throw new Error('Failed to update character');
        }

        const nextCharacter = (data as { character: KBCharacter }).character;
        setCharacters((current) => current.map((character) => (character.id === id ? nextCharacter : character)));
        setSelectedCharacter((current) => (current?.id === id ? nextCharacter : current));
      } catch (updateError) {
        setError(toErrorMessage(updateError));
      }
    },
    [projectId],
  );

  const confirmCharacter = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const { data, error: apiError } = await client.POST(`/api/projects/${projectId}/kb/character/${id}/confirm`);

        if (apiError) {
          throw new Error('Failed to confirm character');
        }

        const confirmedCharacter = (data as { character: KBCharacter }).character;
        setCharacters((current) => current.map((character) => (character.id === id ? confirmedCharacter : character)));
        setSelectedCharacter((current) => (current?.id === id ? confirmedCharacter : current));
      } catch (confirmError) {
        setError(toErrorMessage(confirmError));
      }
    },
    [projectId],
  );

  const batchConfirmCharacters = useCallback(
    async (ids: string[]) => {
      try {
        setError(null);
        const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/character/bulk-confirm`, {
          body: { entityIds: ids },
        });

        if (apiError) {
          throw new Error('Failed to batch confirm characters');
        }

        setCharacters((current) =>
          current.map((character) =>
            ids.includes(character.id)
              ? { ...character, confirmed: true, source: 'manual' as const }
              : character,
          ),
        );
        setSelectedCharacter((current) =>
          current && ids.includes(current.id)
            ? { ...current, confirmed: true, source: 'manual' as const }
            : current,
        );
        setSelectedIds([]);
      } catch (batchError) {
        setError(toErrorMessage(batchError));
      }
    },
    [projectId],
  );

  const markCharacterNotCharacter = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const { error: apiError } = await client.POST(`/api/projects/${projectId}/kb/character/${id}/not-character`);

        if (apiError) {
          throw new Error('Failed to mark character as not-character');
        }

        setCharacters((current) => current.filter((character) => character.id !== id));
        setSelectedIds((current) => current.filter((value) => value !== id));
        setSelectedCharacter((current) => (current?.id === id ? null : current));
      } catch (markError) {
        setError(toErrorMessage(markError));
      }
    },
    [projectId],
  );

  const refetch = useCallback(async () => {
    await fetchCharacters();
  }, [fetchCharacters]);

  return {
    characters,
    loading,
    detailLoading,
    error,
    query,
    sortBy,
    selectedIds,
    selectedCharacter,
    setQuery,
    setSortBy,
    setSelectedIds,
    selectCharacter,
    updateCharacter,
    confirmCharacter,
    batchConfirmCharacters,
    markCharacterNotCharacter,
    refetch,
  };
}
