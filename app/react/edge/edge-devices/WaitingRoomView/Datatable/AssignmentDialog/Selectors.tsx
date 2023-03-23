import { useField } from 'formik';
import { useState } from 'react';
import _ from 'lodash';

import { useTags } from '@/portainer/tags/queries';
import { TagId } from '@/portainer/tags/types';
import { useEdgeGroups } from '@/react/edge/edge-groups/queries/useEdgeGroups';
import { EdgeGroup } from '@/react/edge/edge-groups/types';
import { useGroups } from '@/react/portainer/environments/environment-groups/queries';
import { EnvironmentGroupId } from '@/react/portainer/environments/environment-groups/types';

import { Select } from '@@/form-components/ReactSelect';
import { Option } from '@@/form-components/PortainerSelect';

export function GroupSelector() {
  const [{ onBlur, value }, , { setValue }] = useField<
    EnvironmentGroupId | string
  >('group');

  const groupsQuery = useGroups({
    select: (groups) =>
      groups.map((opt) => ({ label: opt.Name, value: opt.Id })),
  });

  const [inputValue, setInputValue] = useState('');
  if (!groupsQuery.data) {
    return null;
  }

  const options = groupsQuery.data;
  const selectedValue =
    typeof value === 'number'
      ? options.find((g) => g.value === value)
      : { value, label: value };

  return (
    <Select
      isCreatable
      options={options}
      value={selectedValue}
      onCreateOption={handleCreate}
      onChange={handleChange}
      onInputChange={(inputValue, { action }) => {
        if (action === 'input-change') {
          setInputValue(inputValue);
        }
        if (action === 'input-blur') {
          handleBlur();
        }
      }}
      onBlur={onBlur}
    />
  );

  function handleBlur() {
    const label = inputValue?.trim() || '';
    const option = options.find((opt) => opt.label === label);

    if (!label) {
      return;
    }

    setValue(option ? option.value : label);
  }

  function handleCreate(newGroup: string) {
    setValue(newGroup);
  }

  function handleChange(value: { value: EnvironmentGroupId | string } | null) {
    setValue(value ? value.value : '');
  }
}

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

function CreatableSelector<T>({
  name,
  options,
  isT,
}: {
  name: string;
  options: Array<Option<T | string>>;
  isT: (t: T | string) => t is T;
}) {
  const [{ onBlur, value }, , { setValue }] = useField<Array<T | string>>(name);

  const selectedValues = value.reduce(
    (acc: Array<{ label: string; value: T | string }>, cur) => {
      if (isT(cur)) {
        const tag = options.find((t) => t.value === cur);

        return _.compact([...acc, tag]);
      }

      return [...acc, { label: cur, value: cur }];
    },
    []
  );

  return (
    <Select
      isCreatable
      options={options}
      value={selectedValues}
      isMulti
      onCreateOption={handleCreate}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );

  function handleCreate(newTag: string) {
    setValue([...value, newTag]);
  }

  function handleChange(value: ReadonlyArray<{ value: T | string }>) {
    setValue(value.map((v) => v.value));
  }
}
