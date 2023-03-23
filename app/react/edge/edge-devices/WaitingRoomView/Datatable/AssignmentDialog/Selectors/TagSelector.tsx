import { useTags } from '@/portainer/tags/queries';
import { TagId } from '@/portainer/tags/types';

import { CreatableSelector } from './CreatableSelector';

export function TagSelector() {
  const tagsQuery = useTags({
    select: (tags) => tags.map((opt) => ({ label: opt.Name, value: opt.ID })),
  });

  if (!tagsQuery.data) {
    return null;
  }

  const tags = tagsQuery.data;

  return (
    <CreatableSelector
      name="tags"
      options={tags}
      isT={(t): t is TagId => typeof t === 'number'}
    />
  );
}
