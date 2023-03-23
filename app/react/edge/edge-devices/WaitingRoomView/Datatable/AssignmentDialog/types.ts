import { TagId } from '@/portainer/tags/types';
import { EdgeGroup } from '@/react/edge/edge-groups/types';
import { EnvironmentGroupId } from '@/react/portainer/environments/environment-groups/types';

export interface FormValues {
  group: EnvironmentGroupId | string;
  overrideGroup: boolean;
  edgeGroups: Array<EdgeGroup['Id'] | string>;
  overrideEdgeGroups: boolean;
  tags: Array<TagId | string>;
  overrideTags: boolean;
}
