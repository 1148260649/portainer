import { isNumber, isString } from 'lodash';
import { useMutation, useQueryClient } from 'react-query';

import { queryKeys as edgeGroupQueryKeys } from '@/react/edge/edge-groups/queries/query-keys';
import { queryKeys as groupQueryKeys } from '@/react/portainer/environments/environment-groups/queries/query-keys';
import { tagKeys } from '@/portainer/tags/queries';
import { getFulfilledResults } from '@/portainer/helpers/promise-utils';
import { createTag } from '@/portainer/tags/tags.service';
import {
  mutationOptions,
  withError,
  withInvalidate,
} from '@/react-tools/react-query';
import { createEdgeGroup } from '@/react/edge/edge-groups/queries/useCreateEdgeGroupMutation';
import { createGroup } from '@/react/portainer/environments/environment-groups/queries/useCreateGroupMutation';
import {
  EnvironmentRelationsPayload,
  updateEnvironmentRelations,
} from '@/react/portainer/environments/queries/useUpdateEnvironmentRelationsMutation';
import { TagId } from '@/portainer/tags/types';
import { EdgeGroup } from '@/react/edge/edge-groups/types';
import { EnvironmentGroupId } from '@/react/portainer/environments/environment-groups/types';

import { WaitingRoomEnvironment } from '../../types';

import { confirmCreation } from './confirmCreate';
import { FormValues } from './types';
import { isAssignedToGroup } from './utils';

export function useCreateAndAssign(
  environments: WaitingRoomEnvironment[],
  onSuccess: () => void
) {
  const createMetaMutation = useCreateMetaMutation();
  const assignRelationsMutation = useAssignRelationsMutation();

  return {
    onSubmit,
    isLoading:
      createMetaMutation.isLoading || assignRelationsMutation.isLoading,
  };

  async function onSubmit(values: FormValues) {
    const created = await createIfNeeded({
      edgeGroups: values.edgeGroups.filter(isString),
      tags: values.tags.filter(isString),
      group: isString(values.group) ? values.group : undefined,
    });

    const assign = {
      edgeGroups: [
        ...values.edgeGroups.filter(isNumber),
        ...(created.edgeGroups ?? []),
      ],
      tags: [...values.tags.filter(isNumber), ...(created.tags ?? [])],
      group: isNumber(values.group) ? values.group : created.group,
    };

    assignRelationsMutation.mutate(
      { environments, assign, values },
      {
        onSuccess,
      }
    );
  }

  async function createIfNeeded(payload: {
    edgeGroups: Array<string>;
    tags: Array<string>;
    group?: string;
  }) {
    const hasSomethingToCreate = !!(
      payload.edgeGroups.length > 0 ||
      payload.tags.length > 0 ||
      payload.group
    );

    if (!hasSomethingToCreate) {
      return {};
    }

    const confirmed = await confirmCreation(payload);

    if (!confirmed) {
      return {};
    }

    const response = await createMetaMutation.mutateAsync(payload);

    return {
      edgeGroups: response.edgeGroups.map(({ Id }) => Id),
      tags: response.tags.map(({ ID }) => ID),
      group: response.group?.Id,
    };
  }
}

function useCreateMetaMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    createMeta,
    mutationOptions(
      withInvalidate(queryClient, [
        edgeGroupQueryKeys.base(),
        groupQueryKeys.base(),
        tagKeys.all,
      ]),
      withError('Failed to create groups and tags')
    )
  );
}

async function createMeta({
  edgeGroups,
  tags,
  group,
}: {
  edgeGroups: Array<string>;
  tags: Array<string>;
  group?: string;
}) {
  return {
    edgeGroups: getFulfilledResults(
      await Promise.allSettled(
        edgeGroups.map((name) =>
          createEdgeGroup({
            name,
            dynamic: false,
          })
        )
      )
    ),
    tags: getFulfilledResults(
      await Promise.allSettled(tags.map((name) => createTag(name)))
    ),
    group: group
      ? await createGroup({
          name: group,
        })
      : undefined,
  };
}

function useAssignRelationsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    assignRelations,
    mutationOptions(
      withInvalidate(queryClient, [
        edgeGroupQueryKeys.base(),
        groupQueryKeys.base(),
        tagKeys.all,
      ]),
      withError('Failed to create groups and tags')
    )
  );
}

function assignRelations({
  assign,
  environments,
  values,
}: {
  environments: WaitingRoomEnvironment[];
  values: FormValues;
  assign: {
    tags: TagId[];
    edgeGroups: Array<EdgeGroup['Id']>;
    group?: EnvironmentGroupId;
  };
}) {
  return Promise.all(
    environments.map(createPayload).map(({ payload, id }) =>
      updateEnvironmentRelations({
        id,
        relations: payload,
      })
    )
  );

  function createPayload(environment: WaitingRoomEnvironment) {
    const payload: Partial<EnvironmentRelationsPayload> = {};
    if (environment.TagIds.length === 0 || values.overrideTags) {
      payload.tags = assign.tags;
    }

    if (environment.EdgeGroups.length === 0 || values.overrideEdgeGroups) {
      payload.edgeGroups = assign.edgeGroups;
    }

    if (
      (!isAssignedToGroup(environment) || values.overrideGroup) &&
      assign.group
    ) {
      payload.group = assign.group;
    }

    return { id: environment.Id, payload };
  }
}
