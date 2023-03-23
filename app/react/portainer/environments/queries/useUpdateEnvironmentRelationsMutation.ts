import { useMutation, useQueryClient } from 'react-query';

import axios, { parseAxiosError } from '@/portainer/services/axios';
import { withError } from '@/react-tools/react-query';
import { EdgeGroup } from '@/react/edge/edge-groups/types';
import { TagId } from '@/portainer/tags/types';

import { EnvironmentId } from '../types';
import { buildUrl } from '../environment.service/utils';
import { EnvironmentGroupId } from '../environment-groups/types';

import { queryKeys } from './query-keys';

export function useUpdateEnvironmentRelationsMutation() {
  const queryClient = useQueryClient();

  return useMutation(updateEnvironmentRelations, {
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.item(variables.id));
    },
    ...withError('Unable to update environment relations'),
  });
}

export interface EnvironmentRelationsPayload {
  edgeGroups: Array<EdgeGroup['Id']>;
  group: EnvironmentGroupId;
  tags: Array<TagId>;
}

export async function updateEnvironmentRelations({
  id,
  relations,
}: {
  id: EnvironmentId;
  relations: Partial<EnvironmentRelationsPayload>;
}) {
  try {
    await axios.put(buildUrl(id, 'relations'), relations);
  } catch (e) {
    throw parseAxiosError(e as Error, 'Unable to update environment relations');
  }
}
