import { useEdgeGroups } from '@/react/edge/edge-groups/queries/useEdgeGroups';
import { EdgeGroup } from '@/react/edge/edge-groups/types';

import { CreatableSelector } from './CreatableSelector';

export function EdgeGroupsSelector() {
  const edgeGroupsQuery = useEdgeGroups({
    select: (edgeGroups) =>
      edgeGroups
        .filter((g) => !g.Dynamic)
        .map((opt) => ({ label: opt.Name, value: opt.Id })),
  });

  if (!edgeGroupsQuery.data) {
    return null;
  }

  const edgeGroups = edgeGroupsQuery.data;

  return (
    <CreatableSelector
      name="edgeGroups"
      options={edgeGroups}
      isT={(t): t is EdgeGroup['Id'] => typeof t === 'number'}
    />
  );
}
